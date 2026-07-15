use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

use chrono::{DateTime, Duration as ChronoDuration, Utc};
use once_cell::sync::Lazy;
use reqwest::{StatusCode, header::RETRY_AFTER};
use secrecy::{ExposeSecret, SecretString};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use url::Url;
use uuid::Uuid;

const DEFAULT_BROKER_BASE_URL: &str = "https://openteams-lab.com/api/github/oauth/";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(10);
const TRANSIENT_RETRY_DELAY: Duration = Duration::from_secs(5);
const TRANSIENT_FAILURE_THRESHOLD: u32 = 3;
const TRANSIENT_FAILURE_WINDOW: Duration = Duration::from_secs(10);
const RATE_LIMIT_FALLBACK_AFTER: Duration = Duration::from_secs(30);
const MIN_POLL_DELAY_MS: u64 = 1_000;
const MAX_POLL_DELAY_MS: u64 = 15_000;

type FlowMap = Arc<Mutex<HashMap<String, BrokerFlowState>>>;

static BROKER_FLOWS: Lazy<FlowMap> = Lazy::new(|| Arc::new(Mutex::new(HashMap::new())));

#[derive(Debug, Clone)]
struct BrokerFlowState {
    claim_secret: SecretString,
    delivery_id: String,
    expires_at: DateTime<Utc>,
    next_poll_at: Instant,
    retry_after_ms: u64,
    polling: bool,
    transient_failures: u32,
    transient_failure_started_at: Option<Instant>,
    rate_limit_wait: Duration,
}

#[derive(Debug, Clone)]
pub struct GitHubOAuthBroker {
    client: reqwest::Client,
    base_url: Url,
    flows: FlowMap,
}

#[derive(Debug, Clone)]
pub struct BrokerStartResult {
    pub flow_id: String,
    pub authorization_url: String,
    pub expires_at: DateTime<Utc>,
    pub poll_after_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BrokerAccount {
    pub login: String,
    pub id: i64,
}

#[derive(Debug, Clone)]
pub struct BrokerDelivery {
    pub flow_id: String,
    pub access_token: SecretString,
    pub scopes: Vec<String>,
    pub account: BrokerAccount,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BrokerTerminalStatus {
    Denied,
    Expired,
    Error,
}

#[derive(Debug, Clone)]
pub enum BrokerPollResult {
    Pending {
        retry_after_ms: u64,
        error: Option<String>,
    },
    Delivered(BrokerDelivery),
    Terminal {
        status: BrokerTerminalStatus,
        error: String,
        fallback_to_device: bool,
    },
}

#[derive(Debug, Error)]
pub enum GitHubOAuthBrokerError {
    #[error("invalid GitHub OAuth broker URL")]
    InvalidBaseUrl,
    #[error("GitHub OAuth broker request failed")]
    Request(#[from] reqwest::Error),
    #[error("GitHub OAuth broker rejected request: {0}")]
    Rejected(StatusCode),
    #[error("GitHub OAuth broker returned an incompatible response")]
    Protocol,
}

#[derive(Deserialize)]
struct CreateFlowResponse {
    flow_id: String,
    claim_secret: String,
    authorization_url: String,
    expires_at: DateTime<Utc>,
    poll_after_ms: u64,
}

#[derive(Debug, Serialize)]
struct CreateFlowRequest<'a> {
    client_version: &'a str,
    platform: &'a str,
}

#[derive(Deserialize)]
#[serde(tag = "status", rename_all = "snake_case")]
enum ResultResponse {
    Pending {
        retry_after_ms: u64,
    },
    Delivering {
        delivery_id: String,
        access_token: String,
        token_type: String,
        scopes: Vec<String>,
        account: BrokerAccountResponse,
    },
    Denied {
        error_code: String,
    },
    Error {
        error_code: String,
    },
}

#[derive(Debug, Deserialize)]
struct BrokerAccountResponse {
    login: String,
    id: i64,
}

#[derive(Debug, Deserialize)]
struct ErrorResponse {
    error: Option<String>,
}

#[derive(Debug, Serialize)]
struct AckRequest<'a> {
    delivery_id: &'a str,
}

impl GitHubOAuthBroker {
    pub fn new_default() -> Result<Self, GitHubOAuthBrokerError> {
        Self::new_with_state(DEFAULT_BROKER_BASE_URL, BROKER_FLOWS.clone())
    }

    fn new_with_state(base_url: &str, flows: FlowMap) -> Result<Self, GitHubOAuthBrokerError> {
        let mut base_url =
            Url::parse(base_url).map_err(|_| GitHubOAuthBrokerError::InvalidBaseUrl)?;
        if !base_url.path().ends_with('/') {
            let path = format!("{}/", base_url.path());
            base_url.set_path(&path);
        }
        Ok(Self {
            client: reqwest::Client::builder()
                .timeout(REQUEST_TIMEOUT)
                .build()
                .map_err(GitHubOAuthBrokerError::Request)?,
            base_url,
            flows,
        })
    }

    #[cfg(test)]
    fn new_for_test(base_url: &str) -> Result<Self, GitHubOAuthBrokerError> {
        Self::new_with_state(base_url, Arc::new(Mutex::new(HashMap::new())))
    }

    pub async fn start_flow(&self) -> Result<BrokerStartResult, GitHubOAuthBrokerError> {
        let mut attempt = 0;
        let response = loop {
            let response = self
                .client
                .post(self.endpoint("flows"))
                .header("Accept", "application/json")
                .header("Cache-Control", "no-store")
                .header("User-Agent", "OpenTeams")
                .json(&CreateFlowRequest {
                    client_version: env!("CARGO_PKG_VERSION"),
                    platform: std::env::consts::OS,
                })
                .send()
                .await;
            match response {
                Ok(response) => break response,
                Err(_) if attempt == 0 => attempt += 1,
                Err(error) => return Err(GitHubOAuthBrokerError::Request(error)),
            }
        };
        if !response.status().is_success() {
            return Err(GitHubOAuthBrokerError::Rejected(response.status()));
        }
        let response = response.json::<CreateFlowResponse>().await?;
        validate_create_response(&response)?;
        let poll_after_ms = normalized_poll_delay(response.poll_after_ms);
        self.flows.lock().expect("OAuth broker flow lock").insert(
            response.flow_id.clone(),
            BrokerFlowState {
                claim_secret: response.claim_secret.into(),
                delivery_id: Uuid::new_v4().to_string(),
                expires_at: response.expires_at + ChronoDuration::minutes(10),
                next_poll_at: Instant::now() + Duration::from_millis(poll_after_ms),
                retry_after_ms: poll_after_ms,
                polling: false,
                transient_failures: 0,
                transient_failure_started_at: None,
                rate_limit_wait: Duration::ZERO,
            },
        );
        Ok(BrokerStartResult {
            flow_id: response.flow_id,
            authorization_url: response.authorization_url,
            expires_at: response.expires_at,
            poll_after_ms,
        })
    }

    pub async fn poll_flow(&self, flow_id: &str) -> BrokerPollResult {
        let snapshot = {
            let mut flows = self.flows.lock().expect("OAuth broker flow lock");
            let Some(flow) = flows.get_mut(flow_id) else {
                return terminal(BrokerTerminalStatus::Expired, "flow_expired", false);
            };
            if flow.expires_at <= Utc::now() {
                flows.remove(flow_id);
                return terminal(BrokerTerminalStatus::Expired, "flow_expired", false);
            }
            let now = Instant::now();
            if flow.polling {
                return pending(flow.retry_after_ms.max(MIN_POLL_DELAY_MS), None);
            }
            if flow.next_poll_at > now {
                let remaining = flow.next_poll_at.duration_since(now).as_millis() as u64;
                return pending(remaining.max(MIN_POLL_DELAY_MS), None);
            }
            flow.polling = true;
            (flow.claim_secret.clone(), flow.delivery_id.clone())
        };

        let response = self
            .client
            .post(self.endpoint(&format!("flows/{flow_id}/result")))
            .header("Accept", "application/json")
            .header("Cache-Control", "no-store")
            .header("User-Agent", "OpenTeams")
            .bearer_auth(snapshot.0.expose_secret())
            .header("Idempotency-Key", &snapshot.1)
            .send()
            .await;

        let response = match response {
            Ok(response) => response,
            Err(_) => return self.record_transient_failure(flow_id).await,
        };

        if response.status().is_server_error() {
            return self.record_transient_failure(flow_id).await;
        }
        if response.status() == StatusCode::TOO_MANY_REQUESTS {
            let wait = retry_after(&response).unwrap_or(TRANSIENT_RETRY_DELAY);
            return self.record_rate_limit(flow_id, wait).await;
        }
        if response.status().is_success() || response.status() == StatusCode::ACCEPTED {
            let body = match response.json::<ResultResponse>().await {
                Ok(body) => body,
                Err(_) => {
                    self.remove_flow(flow_id);
                    return terminal(
                        BrokerTerminalStatus::Error,
                        "broker_protocol_incompatible",
                        true,
                    );
                }
            };
            return self.handle_result(flow_id, snapshot.1, body);
        }

        let status = response.status();
        let error = response
            .json::<ErrorResponse>()
            .await
            .ok()
            .and_then(|body| body.error)
            .unwrap_or_else(|| format!("broker_http_{status}"));
        match status {
            StatusCode::UNAUTHORIZED | StatusCode::CONFLICT => {
                self.remove_flow(flow_id);
                terminal(BrokerTerminalStatus::Error, error, false)
            }
            StatusCode::GONE => {
                self.remove_flow(flow_id);
                let status = if error == "flow_expired" {
                    BrokerTerminalStatus::Expired
                } else {
                    BrokerTerminalStatus::Error
                };
                terminal(status, error, false)
            }
            StatusCode::TOO_EARLY => {
                self.schedule_next_poll(flow_id, 2_000);
                pending(2_000, Some(error))
            }
            _ => {
                self.remove_flow(flow_id);
                terminal(
                    BrokerTerminalStatus::Error,
                    "broker_protocol_incompatible",
                    true,
                )
            }
        }
    }

    pub fn retry_after_store_failure(&self, flow_id: &str) -> BrokerPollResult {
        let mut flows = self.flows.lock().expect("OAuth broker flow lock");
        let Some(flow) = flows.get_mut(flow_id) else {
            return terminal(
                BrokerTerminalStatus::Error,
                "local_token_store_failed",
                false,
            );
        };
        flow.polling = false;
        flow.retry_after_ms = 2_000;
        flow.next_poll_at = Instant::now() + Duration::from_millis(flow.retry_after_ms);
        pending(
            flow.retry_after_ms,
            Some("local_token_store_failed".to_string()),
        )
    }

    pub async fn acknowledge(&self, flow_id: &str) -> Result<(), GitHubOAuthBrokerError> {
        let Some((claim_secret, delivery_id)) = self.flow_credentials(flow_id) else {
            return Ok(());
        };
        for attempt in 0..2 {
            let response = self
                .client
                .post(self.endpoint(&format!("flows/{flow_id}/ack")))
                .header("Accept", "application/json")
                .header("Cache-Control", "no-store")
                .header("User-Agent", "OpenTeams")
                .bearer_auth(claim_secret.expose_secret())
                .json(&AckRequest {
                    delivery_id: &delivery_id,
                })
                .send()
                .await;
            match response {
                Ok(response) if response.status().is_success() => {
                    self.remove_flow(flow_id);
                    return Ok(());
                }
                Ok(response) if attempt == 0 && response.status().is_server_error() => continue,
                Ok(response) => return Err(GitHubOAuthBrokerError::Rejected(response.status())),
                Err(_) if attempt == 0 => continue,
                Err(error) => return Err(GitHubOAuthBrokerError::Request(error)),
            }
        }
        unreachable!("ACK retry loop always returns")
    }

    pub async fn cancel(&self, flow_id: &str) {
        let Some((claim_secret, _)) = self.flow_credentials(flow_id) else {
            return;
        };
        self.remove_flow(flow_id);
        let _ = self
            .client
            .delete(self.endpoint(&format!("flows/{flow_id}")))
            .header("Accept", "application/json")
            .header("Cache-Control", "no-store")
            .header("User-Agent", "OpenTeams")
            .bearer_auth(claim_secret.expose_secret())
            .send()
            .await;
    }

    pub fn forget(&self, flow_id: &str) {
        self.remove_flow(flow_id);
    }

    fn endpoint(&self, path: &str) -> Url {
        self.base_url.join(path).expect("valid OAuth broker path")
    }

    fn handle_result(
        &self,
        flow_id: &str,
        expected_delivery_id: String,
        result: ResultResponse,
    ) -> BrokerPollResult {
        match result {
            ResultResponse::Pending { retry_after_ms } => {
                let retry_after_ms = normalized_poll_delay(retry_after_ms);
                self.schedule_next_poll(flow_id, retry_after_ms);
                pending(retry_after_ms, None)
            }
            ResultResponse::Delivering {
                delivery_id,
                access_token,
                token_type,
                scopes,
                account,
            } => {
                if delivery_id != expected_delivery_id {
                    self.remove_flow(flow_id);
                    return terminal(BrokerTerminalStatus::Error, "delivery_id_mismatch", false);
                }
                if !token_type.eq_ignore_ascii_case("bearer")
                    || access_token.trim().is_empty()
                    || account.login.trim().is_empty()
                {
                    self.remove_flow(flow_id);
                    return terminal(
                        BrokerTerminalStatus::Error,
                        "broker_protocol_incompatible",
                        true,
                    );
                }
                BrokerPollResult::Delivered(BrokerDelivery {
                    flow_id: flow_id.to_string(),
                    access_token: access_token.into(),
                    scopes,
                    account: BrokerAccount {
                        login: account.login,
                        id: account.id,
                    },
                })
            }
            ResultResponse::Denied { error_code } => {
                self.remove_flow(flow_id);
                terminal(BrokerTerminalStatus::Denied, error_code, false)
            }
            ResultResponse::Error { error_code } => {
                self.remove_flow(flow_id);
                let fallback_to_device = matches!(
                    error_code.as_str(),
                    "oauth_callback_error"
                        | "exchange_failed"
                        | "account_lookup_failed"
                        | "server_error"
                );
                terminal(BrokerTerminalStatus::Error, error_code, fallback_to_device)
            }
        }
    }

    fn schedule_next_poll(&self, flow_id: &str, retry_after_ms: u64) {
        if let Some(flow) = self
            .flows
            .lock()
            .expect("OAuth broker flow lock")
            .get_mut(flow_id)
        {
            flow.polling = false;
            flow.retry_after_ms = retry_after_ms;
            flow.next_poll_at = Instant::now() + Duration::from_millis(retry_after_ms);
            flow.transient_failures = 0;
            flow.transient_failure_started_at = None;
            flow.rate_limit_wait = Duration::ZERO;
        }
    }

    async fn record_transient_failure(&self, flow_id: &str) -> BrokerPollResult {
        let should_fallback = {
            let mut flows = self.flows.lock().expect("OAuth broker flow lock");
            let Some(flow) = flows.get_mut(flow_id) else {
                return terminal(BrokerTerminalStatus::Expired, "flow_expired", false);
            };
            let now = Instant::now();
            let started_at = *flow.transient_failure_started_at.get_or_insert(now);
            flow.transient_failures += 1;
            flow.polling = false;
            flow.retry_after_ms = TRANSIENT_RETRY_DELAY.as_millis() as u64;
            flow.next_poll_at = now + TRANSIENT_RETRY_DELAY;
            transient_failures_require_fallback(
                flow.transient_failures,
                now.duration_since(started_at),
            )
        };
        if should_fallback {
            self.cancel(flow_id).await;
            terminal(BrokerTerminalStatus::Error, "broker_unavailable", true)
        } else {
            pending(
                TRANSIENT_RETRY_DELAY.as_millis() as u64,
                Some("broker_temporarily_unavailable".to_string()),
            )
        }
    }

    async fn record_rate_limit(&self, flow_id: &str, wait: Duration) -> BrokerPollResult {
        let should_fallback = {
            let mut flows = self.flows.lock().expect("OAuth broker flow lock");
            let Some(flow) = flows.get_mut(flow_id) else {
                return terminal(BrokerTerminalStatus::Expired, "flow_expired", false);
            };
            let waited = flow.rate_limit_wait;
            flow.rate_limit_wait = flow.rate_limit_wait.saturating_add(wait);
            flow.polling = false;
            flow.retry_after_ms = wait.as_millis().max(MIN_POLL_DELAY_MS as u128) as u64;
            flow.next_poll_at = Instant::now() + wait;
            rate_limit_wait_requires_fallback(waited)
        };
        if should_fallback {
            self.cancel(flow_id).await;
            terminal(BrokerTerminalStatus::Error, "broker_rate_limited", true)
        } else {
            pending(
                wait.as_millis().max(MIN_POLL_DELAY_MS as u128) as u64,
                Some("broker_rate_limited".to_string()),
            )
        }
    }

    fn flow_credentials(&self, flow_id: &str) -> Option<(SecretString, String)> {
        self.flows
            .lock()
            .expect("OAuth broker flow lock")
            .get(flow_id)
            .map(|flow| (flow.claim_secret.clone(), flow.delivery_id.clone()))
    }

    fn remove_flow(&self, flow_id: &str) {
        self.flows
            .lock()
            .expect("OAuth broker flow lock")
            .remove(flow_id);
    }
}

fn normalized_poll_delay(value: u64) -> u64 {
    value.clamp(MIN_POLL_DELAY_MS, MAX_POLL_DELAY_MS)
}

fn validate_create_response(response: &CreateFlowResponse) -> Result<(), GitHubOAuthBrokerError> {
    let flow_id =
        Uuid::parse_str(&response.flow_id).map_err(|_| GitHubOAuthBrokerError::Protocol)?;
    let authorization_url =
        Url::parse(&response.authorization_url).map_err(|_| GitHubOAuthBrokerError::Protocol)?;
    let valid_claim_secret = response.claim_secret.len() == 43
        && response
            .claim_secret
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'-');
    if flow_id.get_version_num() != 4
        || authorization_url.scheme() != "https"
        || authorization_url.host_str() != Some("github.com")
        || authorization_url.path() != "/login/oauth/authorize"
        || !valid_claim_secret
        || response.expires_at <= Utc::now()
    {
        return Err(GitHubOAuthBrokerError::Protocol);
    }
    Ok(())
}

fn transient_failures_require_fallback(failures: u32, elapsed: Duration) -> bool {
    failures >= TRANSIENT_FAILURE_THRESHOLD && elapsed >= TRANSIENT_FAILURE_WINDOW
}

fn rate_limit_wait_requires_fallback(wait: Duration) -> bool {
    wait >= RATE_LIMIT_FALLBACK_AFTER
}

fn retry_after(response: &reqwest::Response) -> Option<Duration> {
    response
        .headers()
        .get(RETRY_AFTER)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<u64>().ok())
        .map(Duration::from_secs)
}

fn pending(retry_after_ms: u64, error: Option<String>) -> BrokerPollResult {
    BrokerPollResult::Pending {
        retry_after_ms,
        error,
    }
}

fn terminal(
    status: BrokerTerminalStatus,
    error: impl Into<String>,
    fallback_to_device: bool,
) -> BrokerPollResult {
    BrokerPollResult::Terminal {
        status,
        error: error.into(),
        fallback_to_device,
    }
}

#[cfg(test)]
mod tests {
    use std::time::Instant;

    use axum::{Json, Router, http::HeaderMap, routing::post};
    use chrono::{Duration as ChronoDuration, Utc};
    use secrecy::ExposeSecret;
    use serde_json::{Value, json};

    use super::{
        BrokerPollResult, GitHubOAuthBroker, TRANSIENT_FAILURE_THRESHOLD, normalized_poll_delay,
        rate_limit_wait_requires_fallback, transient_failures_require_fallback,
    };

    #[test]
    fn poll_delay_is_bounded_to_the_supported_adaptive_range() {
        assert_eq!(normalized_poll_delay(100), 1_000);
        assert_eq!(normalized_poll_delay(5_000), 5_000);
        assert_eq!(normalized_poll_delay(60_000), 15_000);
        assert_eq!(TRANSIENT_FAILURE_THRESHOLD, 3);
        assert!(!transient_failures_require_fallback(
            3,
            std::time::Duration::from_secs(9)
        ));
        assert!(transient_failures_require_fallback(
            3,
            std::time::Duration::from_secs(10)
        ));
        assert!(!rate_limit_wait_requires_fallback(
            std::time::Duration::from_secs(29)
        ));
        assert!(rate_limit_wait_requires_fallback(
            std::time::Duration::from_secs(30)
        ));
    }

    #[test]
    fn test_broker_accepts_a_base_url_without_trailing_slash() {
        let broker = GitHubOAuthBroker::new_for_test("http://127.0.0.1:3000/api/github/oauth")
            .expect("broker");
        assert_eq!(
            broker.endpoint("flows").as_str(),
            "http://127.0.0.1:3000/api/github/oauth/flows"
        );
    }

    #[tokio::test]
    async fn broker_uses_one_delivery_id_until_local_storage_and_ack_complete() {
        async fn create_flow() -> Json<Value> {
            Json(json!({
                "flow_id": "11111111-1111-4111-8111-111111111111",
                "claim_secret": "ccccccccccccccccccccccccccccccccccccccccccc",
                "authorization_url": "https://github.com/login/oauth/authorize",
                "expires_at": (Utc::now() + ChronoDuration::minutes(10)).to_rfc3339(),
                "poll_after_ms": 2_000
            }))
        }

        async fn deliver(headers: HeaderMap) -> Json<Value> {
            assert_eq!(
                headers
                    .get("authorization")
                    .and_then(|value| value.to_str().ok()),
                Some("Bearer ccccccccccccccccccccccccccccccccccccccccccc")
            );
            let delivery_id = headers
                .get("idempotency-key")
                .and_then(|value| value.to_str().ok())
                .expect("delivery id");
            Json(json!({
                "status": "delivering",
                "delivery_id": delivery_id,
                "access_token": "gho_test_token",
                "token_type": "bearer",
                "scopes": ["repo", "read:user"],
                "account": { "login": "octocat", "id": 1 }
            }))
        }

        async fn acknowledge(headers: HeaderMap, Json(body): Json<Value>) -> Json<Value> {
            assert_eq!(
                headers
                    .get("authorization")
                    .and_then(|value| value.to_str().ok()),
                Some("Bearer ccccccccccccccccccccccccccccccccccccccccccc")
            );
            assert!(
                body["delivery_id"]
                    .as_str()
                    .is_some_and(|value| !value.is_empty())
            );
            Json(json!({ "ok": true }))
        }

        let router = Router::new()
            .route("/api/github/oauth/flows", post(create_flow))
            .route("/api/github/oauth/flows/{flow_id}/result", post(deliver))
            .route("/api/github/oauth/flows/{flow_id}/ack", post(acknowledge));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("listener");
        let address = listener.local_addr().expect("address");
        tokio::spawn(async move {
            axum::serve(listener, router).await.expect("mock broker");
        });

        let broker =
            GitHubOAuthBroker::new_for_test(&format!("http://{address}/api/github/oauth/"))
                .expect("broker");
        let flow = broker.start_flow().await.expect("flow");
        broker
            .flows
            .lock()
            .expect("flows")
            .get_mut(&flow.flow_id)
            .expect("flow state")
            .next_poll_at = Instant::now();

        let delivery = match broker.poll_flow(&flow.flow_id).await {
            BrokerPollResult::Delivered(delivery) => delivery,
            other => panic!("expected delivery, got {other:?}"),
        };
        assert_eq!(delivery.access_token.expose_secret(), "gho_test_token");
        assert_eq!(delivery.account.login, "octocat");
        broker.acknowledge(&flow.flow_id).await.expect("ack");
        assert!(broker.flow_credentials(&flow.flow_id).is_none());
    }
}
