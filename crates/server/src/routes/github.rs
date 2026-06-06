use axum::{
    Json, Router,
    extract::State,
    response::Json as ResponseJson,
    routing::{get, post},
};
use secrecy::{ExposeSecret, SecretString};
use serde::Deserialize;
use services::services::github::{
    auth::{
        DeviceFlowGitHubAuthProvider, GitHubAuthProvider, GitHubDeviceFlowPollResponse,
        GitHubDeviceFlowStartResponse,
    },
    rest_client::{GitHubApiErrorData, GitHubRepositorySummary, GitHubRestClient, GitHubRestError},
};
use ts_rs::TS;
use utils::response::ApiResponse;

use crate::{DeploymentImpl, error::ApiError};

#[derive(Debug, Deserialize, TS)]
pub struct GitHubDevicePollRequest {
    pub device_code: String,
}

pub fn router() -> Router<DeploymentImpl> {
    Router::new()
        .route("/github/auth/device/start", post(start_device_flow))
        .route("/github/auth/device/poll", post(poll_device_flow))
        .route("/github/auth/account", get(current_account))
        .route("/github/auth/disconnect", post(disconnect))
        .route("/github/repos", get(list_github_repos))
}

fn provider() -> Result<DeviceFlowGitHubAuthProvider, ApiError> {
    DeviceFlowGitHubAuthProvider::from_env()
        .map_err(|err| ApiError::BadRequest(format!("GitHub auth setup failed: {err}")))
}

async fn start_device_flow(
    State(_deployment): State<DeploymentImpl>,
) -> Result<ResponseJson<ApiResponse<GitHubDeviceFlowStartResponse>>, ApiError> {
    let response = provider()?
        .start_device_flow()
        .await
        .map_err(|err| ApiError::BadRequest(format!("GitHub device flow start failed: {err}")))?;
    Ok(ResponseJson(ApiResponse::success(response)))
}

async fn poll_device_flow(
    State(_deployment): State<DeploymentImpl>,
    Json(payload): Json<GitHubDevicePollRequest>,
) -> Result<ResponseJson<ApiResponse<GitHubDeviceFlowPollResponse>>, ApiError> {
    let response = provider()?
        .poll_device_flow(&payload.device_code)
        .await
        .map_err(|err| ApiError::BadRequest(format!("GitHub device flow poll failed: {err}")))?;
    Ok(ResponseJson(ApiResponse::success(response)))
}

async fn current_account(
    State(_deployment): State<DeploymentImpl>,
) -> Result<
    ResponseJson<ApiResponse<Option<services::services::github::auth::GitHubAccount>>>,
    ApiError,
> {
    let account = provider()?
        .current_account()
        .await
        .map_err(|err| ApiError::BadRequest(format!("GitHub account lookup failed: {err}")))?;
    Ok(ResponseJson(ApiResponse::success(account)))
}

async fn disconnect(
    State(_deployment): State<DeploymentImpl>,
) -> Result<ResponseJson<ApiResponse<()>>, ApiError> {
    provider()?
        .disconnect()
        .map_err(|err| ApiError::BadRequest(format!("GitHub disconnect failed: {err}")))?;
    Ok(ResponseJson(ApiResponse::success(())))
}

async fn list_github_repos(
    State(_deployment): State<DeploymentImpl>,
) -> Result<ResponseJson<ApiResponse<Vec<GitHubRepositorySummary>, GitHubApiErrorData>>, ApiError> {
    let provider = provider()?;
    let token = match provider.access_token().await {
        Ok(token) => token,
        Err(err) => {
            return Ok(ResponseJson(ApiResponse::error_with_data(
                github_error_data("github_auth_required", err.to_string()),
            )));
        }
    };
    let client = GitHubRestClient::new(SecretString::from(token.token.expose_secret().to_string()));
    match client.list_authenticated_repositories().await {
        Ok(repos) => Ok(ResponseJson(ApiResponse::success(repos))),
        Err(GitHubRestError::Api(data)) => Ok(ResponseJson(ApiResponse::error_with_data(data))),
        Err(err) => Ok(ResponseJson(ApiResponse::error_with_data(
            github_error_data("github_write_failed", err.to_string()),
        ))),
    }
}

fn github_error_data(code: &str, message: impl Into<String>) -> GitHubApiErrorData {
    GitHubApiErrorData {
        code: code.to_string(),
        message: message.into(),
        retry_after: None,
        last_synced_at: None,
        stale: false,
    }
}

#[cfg(test)]
mod tests {
    use super::github_error_data;

    #[test]
    fn github_repo_list_auth_errors_are_structured() {
        let data = github_error_data("github_auth_required", "GitHub auth required");

        assert_eq!(data.code, "github_auth_required");
        assert_eq!(data.message, "GitHub auth required");
        assert!(!data.stale);
    }
}
