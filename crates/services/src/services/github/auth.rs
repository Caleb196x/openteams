use std::{
    collections::HashMap,
    sync::Mutex,
    time::{Duration, Instant},
};

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use once_cell::sync::Lazy;
use reqwest::StatusCode;
use secrecy::SecretString;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use ts_rs::TS;

use super::token_store::{
    GitHubStoredAccount, GitHubStoredToken, GitHubTokenStoreError, LocalEncryptedGitHubTokenStore,
};

const DEFAULT_DEVICE_FLOW_INTERVAL_SECS: u64 = 5;
const SLOW_DOWN_INCREMENT_SECS: u64 = 5;
const RATE_LIMIT_BACKOFF_SECS: u64 = 30;

static DEVICE_FLOW_POLL_STATE: Lazy<Mutex<HashMap<String, DeviceFlowPollState>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

#[derive(Debug, Clone)]
struct DeviceFlowPollState {
    interval: Duration,
    next_allowed_at: Instant,
}

#[derive(Debug, Clone)]
pub struct GitHubAccessToken {
    pub token: SecretString,
    pub scopes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, PartialEq, Eq)]
pub struct GitHubAccount {
    pub login: String,
    pub id: i64,
    pub avatar_url: Option<String>,
    pub html_url: Option<String>,
    pub scopes: Vec<String>,
    #[ts(type = "Date")]
    pub connected_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct GitHubDeviceFlowStartResponse {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub verification_uri_complete: Option<String>,
    pub expires_in: i64,
    pub interval: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
pub enum GitHubDeviceFlowPollStatus {
    Pending,
    SlowDown,
    Authorized,
    Denied,
    Expired,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct GitHubDeviceFlowPollResponse {
    pub status: GitHubDeviceFlowPollStatus,
    pub account: Option<GitHubAccount>,
    pub error: Option<String>,
}

#[derive(Debug, Error)]
pub enum GitHubAuthError {
    #[error("GitHub auth required")]
    AuthRequired,
    #[error("GitHub OAuth client id is not configured")]
    MissingClientId,
    #[error(transparent)]
    Store(#[from] GitHubTokenStoreError),
    #[error(transparent)]
    Http(#[from] reqwest::Error),
}

#[async_trait]
pub trait GitHubAuthProvider: Send + Sync {
    async fn access_token(&self) -> Result<GitHubAccessToken, GitHubAuthError>;
    async fn current_account(&self) -> Result<Option<GitHubAccount>, GitHubAuthError>;
}

#[derive(Clone)]
pub struct DeviceFlowGitHubAuthProvider {
    client: reqwest::Client,
    store: LocalEncryptedGitHubTokenStore,
    client_id: String,
    scopes: Vec<String>,
}

impl DeviceFlowGitHubAuthProvider {
    pub fn new(
        store: LocalEncryptedGitHubTokenStore,
        client_id: impl Into<String>,
        scopes: Vec<String>,
    ) -> Self {
        Self {
            client: reqwest::Client::new(),
            store,
            client_id: client_id.into(),
            scopes,
        }
    }

    pub fn from_env() -> Result<Self, GitHubAuthError> {
        let client_id = std::env::var("GITHUB_CLIENT_ID").unwrap_or_default();
        Ok(Self::new(
            LocalEncryptedGitHubTokenStore::new_default()?,
            client_id,
            vec!["repo".to_string(), "read:user".to_string()],
        ))
    }

    pub async fn start_device_flow(
        &self,
    ) -> Result<GitHubDeviceFlowStartResponse, GitHubAuthError> {
        if self.client_id.is_empty() {
            return Err(GitHubAuthError::MissingClientId);
        }
        let scope = self.scopes.join(" ");
        let response = self
            .client
            .post("https://github.com/login/device/code")
            .header("Accept", "application/json")
            .form(&[
                ("client_id", self.client_id.as_str()),
                ("scope", scope.as_str()),
            ])
            .send()
            .await?
            .error_for_status()?
            .json::<GitHubDeviceFlowStartResponse>()
            .await?;
        remember_device_flow_poll_state(&response.device_code, response.interval);
        Ok(response)
    }

    pub async fn poll_device_flow(
        &self,
        device_code: &str,
    ) -> Result<GitHubDeviceFlowPollResponse, GitHubAuthError> {
        if self.client_id.is_empty() {
            return Err(GitHubAuthError::MissingClientId);
        }
        if let Some(wait) = device_flow_poll_wait(device_code) {
            return Ok(GitHubDeviceFlowPollResponse {
                status: GitHubDeviceFlowPollStatus::Pending,
                account: None,
                error: Some(format!("poll_interval_active:{}s", wait.as_secs().max(1))),
            });
        }
        let response = self
            .client
            .post("https://github.com/login/oauth/access_token")
            .header("Accept", "application/json")
            .form(&[
                ("client_id", self.client_id.as_str()),
                ("device_code", device_code),
                ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
            ])
            .send()
            .await?;
        if device_flow_rate_limited(&response) {
            let wait = retry_after_duration(&response)
                .unwrap_or_else(|| Duration::from_secs(RATE_LIMIT_BACKOFF_SECS));
            schedule_device_flow_poll(device_code, wait);
            return Ok(GitHubDeviceFlowPollResponse {
                status: GitHubDeviceFlowPollStatus::SlowDown,
                account: None,
                error: Some("github_rate_limited".to_string()),
            });
        }
        if !response.status().is_success() {
            schedule_device_flow_poll(
                device_code,
                Duration::from_secs(DEFAULT_DEVICE_FLOW_INTERVAL_SECS),
            );
            return Ok(GitHubDeviceFlowPollResponse {
                status: GitHubDeviceFlowPollStatus::Error,
                account: None,
                error: Some(format!("github_poll_failed:{}", response.status())),
            });
        }
        let body = response.json::<OAuthPollRawResponse>().await?;
        if let Some(error) = body.error {
            let status = match error.as_str() {
                "authorization_pending" => GitHubDeviceFlowPollStatus::Pending,
                "slow_down" => GitHubDeviceFlowPollStatus::SlowDown,
                "access_denied" => GitHubDeviceFlowPollStatus::Denied,
                "expired_token" => GitHubDeviceFlowPollStatus::Expired,
                _ => GitHubDeviceFlowPollStatus::Error,
            };
            match status {
                GitHubDeviceFlowPollStatus::Pending | GitHubDeviceFlowPollStatus::SlowDown => {
                    schedule_next_device_flow_poll(device_code, Some(error.as_str()));
                }
                _ => clear_device_flow_poll_state(device_code),
            }
            return Ok(GitHubDeviceFlowPollResponse {
                status,
                account: None,
                error: Some(error),
            });
        }

        let Some(access_token) = body.access_token else {
            clear_device_flow_poll_state(device_code);
            return Ok(GitHubDeviceFlowPollResponse {
                status: GitHubDeviceFlowPollStatus::Error,
                account: None,
                error: Some("missing_access_token".to_string()),
            });
        };
        let scopes = body
            .scope
            .unwrap_or_default()
            .split(',')
            .filter(|scope| !scope.is_empty())
            .map(ToOwned::to_owned)
            .collect::<Vec<_>>();
        let account = self.fetch_account(&access_token, scopes.clone()).await?;
        self.store.store(GitHubStoredToken {
            access_token: access_token.into(),
            scopes,
            account: Some((&account).into()),
        })?;
        clear_device_flow_poll_state(device_code);
        Ok(GitHubDeviceFlowPollResponse {
            status: GitHubDeviceFlowPollStatus::Authorized,
            account: Some(account),
            error: None,
        })
    }

    pub fn disconnect(&self) -> Result<(), GitHubAuthError> {
        self.store.clear()?;
        Ok(())
    }

    async fn fetch_account(
        &self,
        token: &str,
        scopes: Vec<String>,
    ) -> Result<GitHubAccount, GitHubAuthError> {
        let response = self
            .client
            .get("https://api.github.com/user")
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .header("User-Agent", "OpenTeams")
            .bearer_auth(token)
            .send()
            .await?;
        if response.status() == StatusCode::UNAUTHORIZED {
            return Err(GitHubAuthError::AuthRequired);
        }
        let user = response
            .error_for_status()?
            .json::<GitHubUserResponse>()
            .await?;
        Ok(GitHubAccount {
            login: user.login,
            id: user.id,
            avatar_url: user.avatar_url,
            html_url: user.html_url,
            scopes,
            connected_at: Utc::now(),
        })
    }
}

fn remember_device_flow_poll_state(device_code: &str, interval_secs: i64) {
    let interval = normalized_interval(interval_secs);
    DEVICE_FLOW_POLL_STATE
        .lock()
        .expect("poll state lock")
        .insert(
            device_code.to_string(),
            DeviceFlowPollState {
                interval,
                next_allowed_at: Instant::now(),
            },
        );
}

fn device_flow_poll_wait(device_code: &str) -> Option<Duration> {
    let now = Instant::now();
    DEVICE_FLOW_POLL_STATE
        .lock()
        .expect("poll state lock")
        .get(device_code)
        .and_then(|state| poll_wait_remaining(state, now))
}

fn schedule_next_device_flow_poll(device_code: &str, error: Option<&str>) {
    let mut state = DEVICE_FLOW_POLL_STATE.lock().expect("poll state lock");
    let entry = state
        .entry(device_code.to_string())
        .or_insert_with(default_poll_state);
    entry.interval = next_poll_interval_after_error(entry.interval, error);
    entry.next_allowed_at = Instant::now() + entry.interval;
}

fn schedule_device_flow_poll(device_code: &str, wait: Duration) {
    let mut state = DEVICE_FLOW_POLL_STATE.lock().expect("poll state lock");
    let entry = state
        .entry(device_code.to_string())
        .or_insert_with(default_poll_state);
    entry.interval = wait.max(Duration::from_secs(1));
    entry.next_allowed_at = Instant::now() + entry.interval;
}

fn clear_device_flow_poll_state(device_code: &str) {
    DEVICE_FLOW_POLL_STATE
        .lock()
        .expect("poll state lock")
        .remove(device_code);
}

fn default_poll_state() -> DeviceFlowPollState {
    DeviceFlowPollState {
        interval: Duration::from_secs(DEFAULT_DEVICE_FLOW_INTERVAL_SECS),
        next_allowed_at: Instant::now(),
    }
}

fn normalized_interval(interval_secs: i64) -> Duration {
    Duration::from_secs(interval_secs.max(1) as u64)
}

fn poll_wait_remaining(state: &DeviceFlowPollState, now: Instant) -> Option<Duration> {
    state.next_allowed_at.checked_duration_since(now)
}

fn next_poll_interval_after_error(current: Duration, error: Option<&str>) -> Duration {
    if error == Some("slow_down") {
        current + Duration::from_secs(SLOW_DOWN_INCREMENT_SECS)
    } else {
        current
    }
}

fn device_flow_rate_limited(response: &reqwest::Response) -> bool {
    response.status() == StatusCode::TOO_MANY_REQUESTS
        || response
            .headers()
            .get("x-ratelimit-remaining")
            .and_then(|value| value.to_str().ok())
            == Some("0")
}

fn retry_after_duration(response: &reqwest::Response) -> Option<Duration> {
    response
        .headers()
        .get("retry-after")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<u64>().ok())
        .map(Duration::from_secs)
}

#[async_trait]
impl GitHubAuthProvider for DeviceFlowGitHubAuthProvider {
    async fn access_token(&self) -> Result<GitHubAccessToken, GitHubAuthError> {
        let stored = self.store.load()?.ok_or(GitHubAuthError::AuthRequired)?;
        Ok(GitHubAccessToken {
            token: stored.access_token,
            scopes: stored.scopes,
        })
    }

    async fn current_account(&self) -> Result<Option<GitHubAccount>, GitHubAuthError> {
        Ok(self
            .store
            .load()?
            .and_then(|stored| stored.account.map(Into::into)))
    }
}

#[derive(Debug, Deserialize)]
struct OAuthPollRawResponse {
    access_token: Option<String>,
    scope: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GitHubUserResponse {
    login: String,
    id: i64,
    avatar_url: Option<String>,
    html_url: Option<String>,
}

impl From<GitHubStoredAccount> for GitHubAccount {
    fn from(value: GitHubStoredAccount) -> Self {
        Self {
            login: value.login,
            id: value.id,
            avatar_url: value.avatar_url,
            html_url: value.html_url,
            scopes: value.scopes,
            connected_at: value.connected_at,
        }
    }
}

impl From<&GitHubAccount> for GitHubStoredAccount {
    fn from(value: &GitHubAccount) -> Self {
        Self {
            login: value.login.clone(),
            id: value.id,
            avatar_url: value.avatar_url.clone(),
            html_url: value.html_url.clone(),
            scopes: value.scopes.clone(),
            connected_at: value.connected_at,
        }
    }
}

#[cfg(test)]
mod tests {
    use std::time::{Duration, Instant};

    use tempfile::tempdir;

    use super::{
        DeviceFlowGitHubAuthProvider, DeviceFlowPollState, GitHubAuthProvider,
        next_poll_interval_after_error, poll_wait_remaining,
    };
    use crate::services::github::token_store::{GitHubStoredToken, LocalEncryptedGitHubTokenStore};

    #[tokio::test]
    async fn auth_provider_reads_token_without_exposing_it_in_account() {
        let dir = tempdir().expect("tempdir");
        let store = LocalEncryptedGitHubTokenStore::new_for_path(dir.path().join("token.json"));
        store
            .store(GitHubStoredToken {
                access_token: "secret".to_string().into(),
                scopes: vec!["repo".to_string()],
                account: None,
            })
            .expect("store token");
        let provider = DeviceFlowGitHubAuthProvider::new(store, "client", vec!["repo".to_string()]);

        let token = provider.access_token().await.expect("access token");
        assert_eq!(token.scopes, vec!["repo"]);
        assert!(provider.current_account().await.unwrap().is_none());
    }

    #[test]
    fn device_flow_slow_down_increases_server_side_poll_interval() {
        assert_eq!(
            next_poll_interval_after_error(Duration::from_secs(5), Some("slow_down")),
            Duration::from_secs(10)
        );
        assert_eq!(
            next_poll_interval_after_error(Duration::from_secs(5), Some("authorization_pending")),
            Duration::from_secs(5)
        );
    }

    #[test]
    fn device_flow_poll_wait_blocks_early_local_poll_without_github_request() {
        let now = Instant::now();
        let state = DeviceFlowPollState {
            interval: Duration::from_secs(5),
            next_allowed_at: now + Duration::from_secs(4),
        };

        assert_eq!(
            poll_wait_remaining(&state, now).map(|wait| wait.as_secs()),
            Some(4)
        );
        assert!(poll_wait_remaining(&state, now + Duration::from_secs(5)).is_none());
    }
}
