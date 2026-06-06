use axum::{
    Json, Router,
    extract::State,
    response::Json as ResponseJson,
    routing::{get, post},
};
use serde::Deserialize;
use services::services::github_auth::{
    DeviceFlowGitHubAuthProvider, GitHubAuthProvider, GitHubDeviceFlowPollResponse,
    GitHubDeviceFlowStartResponse,
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
    ResponseJson<ApiResponse<Option<services::services::github_auth::GitHubAccount>>>,
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
