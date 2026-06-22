use axum::{
    Extension, Json, Router,
    extract::{Path, State},
    response::Json as ResponseJson,
    routing::{get, post},
};
use db::models::chat_session::ChatSession;
use db::models::chat_session_worktree::{SessionWorktree, SessionWorktreeMergeOperation};
use deployment::Deployment;
use serde::Deserialize;
use services::services::session_worktree::{
    ConflictFileContent, ConflictFileInfo, EnsureWorktreeInput, EnsureOutcome, MergeResult,
    SessionWorktreeError, SessionWorktreeService,
};
use utils::response::ApiResponse;

use crate::{DeploymentImpl, error::ApiError};

pub fn router() -> Router<DeploymentImpl> {
    Router::new()
        .route("/", get(get_worktree_status).post(prepare_worktree))
        .route("/merge", post(merge_worktree))
        .route("/discard", post(discard_worktree))
        .route("/cleanup", post(cleanup_merged_worktree))
        .route("/retry-cleanup", post(retry_cleanup_worktree))
        .route("/merge-conflicts", get(list_merge_conflicts))
        .route(
            "/merge-conflicts/{file_path}",
            get(get_merge_conflict_detail),
        )
        .route(
            "/merge-conflicts/{file_path}/resolve",
            post(resolve_merge_conflict),
        )
        .route("/merge/continue", post(continue_merge))
        .route("/merge/abort", post(abort_merge))
}

// -----------------------------------------------------------------
// Request / response payloads
// -----------------------------------------------------------------

#[derive(Debug, Default, Deserialize, ts_rs::TS)]
pub struct PrepareWorktreeRequest {
    #[serde(default)]
    #[ts(optional, type = "string | null")]
    pub base_workspace_path: Option<String>,
    #[serde(default)]
    #[ts(optional, type = "string | null")]
    pub base_branch: Option<String>,
}

#[derive(Debug, Default, Deserialize, ts_rs::TS)]
pub struct MergeWorktreeRequest {
    #[serde(default)]
    #[ts(optional, type = "string | null")]
    pub commit_message: Option<String>,
    #[serde(default)]
    #[ts(optional, type = "string | null")]
    pub target_branch: Option<String>,
}

#[derive(Debug, Default, Deserialize, ts_rs::TS)]
pub struct ResolveConflictRequest {
    pub content: String,
}

#[derive(Debug, Default, Deserialize, ts_rs::TS)]
pub struct ContinueMergeRequest {
    #[serde(default)]
    #[ts(optional, type = "string | null")]
    pub commit_message: Option<String>,
}

// -----------------------------------------------------------------
// Route handlers
// -----------------------------------------------------------------

/// GET /chat/sessions/{session_id}/worktree
/// Returns the active session worktree row, or null if no worktree exists.
pub async fn get_worktree_status(
    Extension(session): Extension<ChatSession>,
    State(deployment): State<DeploymentImpl>,
) -> Result<ResponseJson<ApiResponse<Option<SessionWorktree>>>, ApiError> {
    let service = SessionWorktreeService::new(deployment.db().pool.clone());
    let worktree = service
        .get_for_session(session.id)
        .await
        .map_err(session_worktree_api_error)?;
    Ok(ResponseJson(ApiResponse::success(worktree)))
}

/// POST /chat/sessions/{session_id}/worktree
/// Lazily create (or return the existing) isolated worktree for the session.
pub async fn prepare_worktree(
    Extension(session): Extension<ChatSession>,
    State(deployment): State<DeploymentImpl>,
    Json(payload): Json<PrepareWorktreeRequest>,
) -> Result<ResponseJson<ApiResponse<SessionWorktree>>, ApiError> {
    let service = SessionWorktreeService::new(deployment.db().pool.clone());

    let base_workspace_path = payload
        .base_workspace_path
        .or(session.default_workspace_path)
        .ok_or_else(|| {
            ApiError::BadRequest(
                "Session has no default workspace path; provide base_workspace_path.".to_string(),
            )
        })?;

    let input = EnsureWorktreeInput::new(session.id, base_workspace_path.into())
        .with_project(session.project_id)
        .with_base_branch(payload.base_branch);

    let outcome = service
        .ensure_for_session(input)
        .await
        .map_err(session_worktree_api_error)?;

    let worktree = match outcome {
        EnsureOutcome::Created(w) => w,
        EnsureOutcome::Existing(w) => w,
    };
    Ok(ResponseJson(ApiResponse::success(worktree)))
}

/// POST /chat/sessions/{session_id}/worktree/merge
/// Squash-merge session worktree changes into the base workspace.
pub async fn merge_worktree(
    Extension(session): Extension<ChatSession>,
    State(deployment): State<DeploymentImpl>,
    Json(payload): Json<MergeWorktreeRequest>,
) -> Result<ResponseJson<ApiResponse<MergeResult>>, ApiError> {
    let service = SessionWorktreeService::new(deployment.db().pool.clone());
    let result = service
        .perform_merge(
            session.id,
            SessionWorktreeMergeOperation::SquashMerge,
            payload.target_branch,
            payload.commit_message,
        )
        .await
        .map_err(session_worktree_api_error)?;
    Ok(ResponseJson(ApiResponse::success(result)))
}

/// POST /chat/sessions/{session_id}/worktree/discard
/// User-initiated discard of the session worktree (force-remove).
pub async fn discard_worktree(
    Extension(session): Extension<ChatSession>,
    State(deployment): State<DeploymentImpl>,
) -> Result<ResponseJson<ApiResponse<SessionWorktree>>, ApiError> {
    let service = SessionWorktreeService::new(deployment.db().pool.clone());
    let worktree = service
        .discard_worktree(session.id)
        .await
        .map_err(session_worktree_api_error)?;
    Ok(ResponseJson(ApiResponse::success(worktree)))
}

/// POST /chat/sessions/{session_id}/worktree/cleanup
/// Background cleanup of a merged worktree.
pub async fn cleanup_merged_worktree(
    Extension(session): Extension<ChatSession>,
    State(deployment): State<DeploymentImpl>,
) -> Result<ResponseJson<ApiResponse<SessionWorktree>>, ApiError> {
    let service = SessionWorktreeService::new(deployment.db().pool.clone());
    let worktree = service
        .cleanup_merged_worktree(session.id)
        .await
        .map_err(session_worktree_api_error)?;
    Ok(ResponseJson(ApiResponse::success(worktree)))
}

/// POST /chat/sessions/{session_id}/worktree/retry-cleanup
/// Retry a previously failed cleanup.
pub async fn retry_cleanup_worktree(
    Extension(session): Extension<ChatSession>,
    State(deployment): State<DeploymentImpl>,
) -> Result<ResponseJson<ApiResponse<SessionWorktree>>, ApiError> {
    let service = SessionWorktreeService::new(deployment.db().pool.clone());
    let worktree = service
        .retry_cleanup(session.id)
        .await
        .map_err(session_worktree_api_error)?;
    Ok(ResponseJson(ApiResponse::success(worktree)))
}

/// GET /chat/sessions/{session_id}/worktree/merge-conflicts
/// List conflicted (unmerged) files from the base workspace's Git index.
pub async fn list_merge_conflicts(
    Extension(session): Extension<ChatSession>,
    State(deployment): State<DeploymentImpl>,
) -> Result<ResponseJson<ApiResponse<Vec<ConflictFileInfo>>>, ApiError> {
    let service = SessionWorktreeService::new(deployment.db().pool.clone());
    let files = service
        .list_conflict_files(session.id)
        .await
        .map_err(session_worktree_api_error)?;
    Ok(ResponseJson(ApiResponse::success(files)))
}

/// GET /chat/sessions/{session_id}/worktree/merge-conflicts/{file_path}
/// Read three-way conflict content from Git index stages for a single file.
pub async fn get_merge_conflict_detail(
    Extension(session): Extension<ChatSession>,
    State(_deployment): State<DeploymentImpl>,
    Path(file_path): Path<String>,
) -> Result<ResponseJson<ApiResponse<ConflictFileContent>>, ApiError> {
    let service = SessionWorktreeService::new(_deployment.db().pool.clone());
    let content = service
        .read_conflict_file(session.id, &file_path)
        .await
        .map_err(session_worktree_api_error)?;
    Ok(ResponseJson(ApiResponse::success(content)))
}

/// POST /chat/sessions/{session_id}/worktree/merge-conflicts/{file_path}/resolve
/// Write resolved content and `git add` the file.
pub async fn resolve_merge_conflict(
    Extension(session): Extension<ChatSession>,
    State(deployment): State<DeploymentImpl>,
    Path(file_path): Path<String>,
    Json(payload): Json<ResolveConflictRequest>,
) -> Result<ResponseJson<ApiResponse<()>>, ApiError> {
    let service = SessionWorktreeService::new(deployment.db().pool.clone());
    service
        .resolve_conflict_file(session.id, &file_path, &payload.content)
        .await
        .map_err(session_worktree_api_error)?;
    Ok(ResponseJson(ApiResponse::success(())))
}

/// POST /chat/sessions/{session_id}/worktree/merge/continue
/// Complete the merge after all conflicts have been resolved.
pub async fn continue_merge(
    Extension(session): Extension<ChatSession>,
    State(deployment): State<DeploymentImpl>,
    Json(payload): Json<ContinueMergeRequest>,
) -> Result<ResponseJson<ApiResponse<SessionWorktree>>, ApiError> {
    let service = SessionWorktreeService::new(deployment.db().pool.clone());
    let worktree = service
        .continue_merge(session.id, payload.commit_message)
        .await
        .map_err(session_worktree_api_error)?;
    Ok(ResponseJson(ApiResponse::success(worktree)))
}

/// POST /chat/sessions/{session_id}/worktree/merge/abort
/// Abort the in-progress merge, preserving the session worktree.
pub async fn abort_merge(
    Extension(session): Extension<ChatSession>,
    State(deployment): State<DeploymentImpl>,
) -> Result<ResponseJson<ApiResponse<SessionWorktree>>, ApiError> {
    let service = SessionWorktreeService::new(deployment.db().pool.clone());
    let worktree = service
        .perform_abort_merge(session.id)
        .await
        .map_err(session_worktree_api_error)?;
    Ok(ResponseJson(ApiResponse::success(worktree)))
}

// -----------------------------------------------------------------
// Error mapping
// -----------------------------------------------------------------

/// Map `SessionWorktreeError` to `ApiError` with appropriate HTTP status
/// codes, mirroring the `source_control_api_error` precedent.
pub fn session_worktree_api_error(err: SessionWorktreeError) -> ApiError {
    match err {
        SessionWorktreeError::Database(e) => ApiError::Database(e),
        SessionWorktreeError::Io(e) => ApiError::Io(e),
        SessionWorktreeError::WorktreeManager(e) => ApiError::Worktree(e),
        SessionWorktreeError::ModelCas(e) => {
            ApiError::Conflict(format!("Worktree state transition rejected: {e}"))
        }
        SessionWorktreeError::NoActiveWorktree(sid) => {
            ApiError::BadRequest(format!("Session {sid} has no active worktree."))
        }
        SessionWorktreeError::NoMergedWorktree(sid) => {
            ApiError::BadRequest(format!("Session {sid} has no merged worktree to clean up."))
        }
        SessionWorktreeError::NoCleanupFailedWorktree(sid) => ApiError::BadRequest(format!(
            "Session {sid} has no failed cleanup to retry."
        )),
        SessionWorktreeError::SessionHasActiveWorktree(sid) => ApiError::Conflict(format!(
            "Session {sid} still has an active worktree; resolve it before cleanup."
        )),
        SessionWorktreeError::IllegalTransition {
            session_id, from, to, ..
        } => ApiError::Conflict(format!(
            "Cannot transition session {session_id} worktree from {from} to {to}."
        )),
        SessionWorktreeError::NotAGitRepo(path) => {
            ApiError::BadRequest(format!("Not a git repository: {}", path.display()))
        }
        SessionWorktreeError::BaseWorkspaceWrongBranch { expected, actual } => {
            ApiError::Conflict(format!(
                "Base workspace is on '{actual}', expected '{expected}'. Switch to the base branch before merging."
            ))
        }
        SessionWorktreeError::BaseWorkspaceDirty => ApiError::Conflict(
            "Base workspace has uncommitted changes. Commit or stash before merging.".to_string(),
        ),
        SessionWorktreeError::MergeOperationInProgress => ApiError::Conflict(
            "A git merge or rebase is already in progress in the base workspace.".to_string(),
        ),
        SessionWorktreeError::NoMergeInProgress(sid) => {
            ApiError::BadRequest(format!("Session {sid} has no merge in progress."))
        }
        SessionWorktreeError::UnresolvedConflicts(files) => ApiError::Conflict(format!(
            "Unresolved conflicts remain: {}",
            files.join(", ")
        )),
        SessionWorktreeError::GitCommand(msg) => {
            ApiError::BadRequest(format!("Git operation failed: {msg}"))
        }
        SessionWorktreeError::InvalidConflictPath(path) => {
            ApiError::BadRequest(format!("Invalid conflict file path: {path}"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::router;

    #[test]
    fn worktree_router_builds() {
        let _router = router();
    }
}
