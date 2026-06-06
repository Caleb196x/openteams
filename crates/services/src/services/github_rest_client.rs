use chrono::{DateTime, Utc};
use reqwest::{Method, StatusCode};
use secrecy::{ExposeSecret, SecretString};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use thiserror::Error;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct GitHubApiErrorData {
    pub code: String,
    pub message: String,
    #[ts(type = "Date | null")]
    pub retry_after: Option<DateTime<Utc>>,
    #[ts(type = "Date | null")]
    pub last_synced_at: Option<DateTime<Utc>>,
    pub stale: bool,
}

impl std::fmt::Display for GitHubApiErrorData {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}

#[derive(Debug, Error)]
pub enum GitHubRestError {
    #[error("{0}")]
    Api(GitHubApiErrorData),
    #[error(transparent)]
    Http(#[from] reqwest::Error),
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct GitHubIssueSummary {
    pub number: i64,
    pub node_id: String,
    pub title: String,
    pub state: String,
    pub url: String,
    pub author: Option<String>,
    pub labels: Vec<String>,
    pub assignees: Vec<String>,
    #[ts(type = "Date")]
    pub updated_at: DateTime<Utc>,
    #[ts(type = "Date | null")]
    pub last_synced_at: Option<DateTime<Utc>>,
    pub stale: bool,
    pub work_item_id: Option<uuid::Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct GitHubIssueComment {
    pub id: i64,
    pub body: String,
    pub author: Option<String>,
    #[ts(type = "Date")]
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct GitHubIssueDetail {
    pub summary: GitHubIssueSummary,
    pub body: Option<String>,
    pub comments: Vec<GitHubIssueComment>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct GitHubPullRequestSummary {
    pub number: i64,
    pub title: String,
    pub state: String,
    pub url: String,
    pub head_branch: String,
    pub base_branch: String,
}

#[derive(Clone)]
pub struct GitHubRestClient {
    client: reqwest::Client,
    base_url: String,
    token: SecretString,
}

impl GitHubRestClient {
    pub fn new(token: SecretString) -> Self {
        Self::new_with_base_url(token, "https://api.github.com")
    }

    pub fn new_with_base_url(token: SecretString, base_url: impl Into<String>) -> Self {
        Self {
            client: reqwest::Client::new(),
            base_url: base_url.into(),
            token,
        }
    }

    pub fn build_request(&self, method: Method, path: &str) -> reqwest::RequestBuilder {
        self.client
            .request(
                method,
                format!("{}{}", self.base_url.trim_end_matches('/'), path),
            )
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", "2022-11-28")
            .header("User-Agent", "OpenTeams")
            .bearer_auth(self.token.expose_secret())
    }

    pub async fn repo_metadata(
        &self,
        owner: &str,
        repo: &str,
    ) -> Result<GitHubRepoMetadata, GitHubRestError> {
        self.request(
            Method::GET,
            &format!("/repos/{owner}/{repo}"),
            Option::<&()>::None,
        )
        .await
    }

    pub async fn list_issues(
        &self,
        owner: &str,
        repo: &str,
        query: Option<&str>,
    ) -> Result<Vec<GitHubIssueSummary>, GitHubRestError> {
        let path = issue_list_path(owner, repo, query);
        if query.map(str::trim).is_some_and(|query| !query.is_empty()) {
            let raw: GitHubIssueSearchResponse = self
                .request(Method::GET, &path, Option::<&()>::None)
                .await?;
            return Ok(raw
                .items
                .into_iter()
                .filter(github_issue_raw_is_issue)
                .map(Into::into)
                .collect());
        }
        let raw: Vec<GitHubIssueRaw> = self
            .request(Method::GET, &path, Option::<&()>::None)
            .await?;
        Ok(raw
            .into_iter()
            .filter(github_issue_raw_is_issue)
            .map(Into::into)
            .collect())
    }

    pub async fn issue(
        &self,
        owner: &str,
        repo: &str,
        number: i64,
    ) -> Result<GitHubIssueDetail, GitHubRestError> {
        let raw: GitHubIssueRaw = self
            .request(
                Method::GET,
                &format!("/repos/{owner}/{repo}/issues/{number}"),
                Option::<&()>::None,
            )
            .await?;
        let comments: Vec<GitHubIssueCommentRaw> = self
            .request(
                Method::GET,
                &format!("/repos/{owner}/{repo}/issues/{number}/comments"),
                Option::<&()>::None,
            )
            .await?;
        Ok(GitHubIssueDetail {
            body: raw.body.clone(),
            summary: raw.into(),
            comments: comments.into_iter().map(Into::into).collect(),
        })
    }

    pub async fn create_issue_comment(
        &self,
        owner: &str,
        repo: &str,
        number: i64,
        body: &str,
    ) -> Result<GitHubIssueComment, GitHubRestError> {
        self.request(
            Method::POST,
            &format!("/repos/{owner}/{repo}/issues/{number}/comments"),
            Some(&serde_json::json!({ "body": body })),
        )
        .await
    }

    pub async fn update_issue_state(
        &self,
        owner: &str,
        repo: &str,
        number: i64,
        state: &str,
    ) -> Result<GitHubIssueSummary, GitHubRestError> {
        let raw: GitHubIssueRaw = self
            .request(
                Method::PATCH,
                &format!("/repos/{owner}/{repo}/issues/{number}"),
                Some(&serde_json::json!({ "state": state })),
            )
            .await?;
        Ok(raw.into())
    }

    pub async fn replace_labels(
        &self,
        owner: &str,
        repo: &str,
        number: i64,
        labels: Vec<String>,
    ) -> Result<Vec<String>, GitHubRestError> {
        let raw: Vec<GitHubLabelRaw> = self
            .request(
                Method::PUT,
                &format!("/repos/{owner}/{repo}/issues/{number}/labels"),
                Some(&serde_json::json!({ "labels": labels })),
            )
            .await?;
        Ok(raw.into_iter().map(|label| label.name).collect())
    }

    pub async fn replace_assignees(
        &self,
        owner: &str,
        repo: &str,
        number: i64,
        assignees: Vec<String>,
    ) -> Result<GitHubIssueSummary, GitHubRestError> {
        let raw: GitHubIssueRaw = self
            .request(
                Method::PATCH,
                &format!("/repos/{owner}/{repo}/issues/{number}"),
                Some(&serde_json::json!({ "assignees": assignees })),
            )
            .await?;
        Ok(raw.into())
    }

    pub async fn create_pull_request(
        &self,
        owner: &str,
        repo: &str,
        input: CreateGitHubPullRequest,
    ) -> Result<GitHubPullRequestSummary, GitHubRestError> {
        let raw: GitHubPullRequestRaw = self
            .request(
                Method::POST,
                &format!("/repos/{owner}/{repo}/pulls"),
                Some(&input),
            )
            .await?;
        Ok(raw.into())
    }

    pub async fn pull_request(
        &self,
        owner: &str,
        repo: &str,
        number: i64,
    ) -> Result<GitHubPullRequestSummary, GitHubRestError> {
        let raw: GitHubPullRequestRaw = self
            .request(
                Method::GET,
                &format!("/repos/{owner}/{repo}/pulls/{number}"),
                None::<&()>,
            )
            .await?;
        Ok(raw.into())
    }

    pub async fn pull_request_issue_comments(
        &self,
        owner: &str,
        repo: &str,
        number: i64,
    ) -> Result<Vec<GitHubPrIssueComment>, GitHubRestError> {
        let rows: Vec<GitHubPrIssueCommentRaw> = self
            .request(
                Method::GET,
                &format!("/repos/{owner}/{repo}/issues/{number}/comments"),
                None::<&()>,
            )
            .await?;
        Ok(rows.into_iter().map(Into::into).collect())
    }

    pub async fn pull_request_review_comments(
        &self,
        owner: &str,
        repo: &str,
        number: i64,
    ) -> Result<Vec<GitHubPrReviewComment>, GitHubRestError> {
        let rows: Vec<GitHubPrReviewCommentRaw> = self
            .request(
                Method::GET,
                &format!("/repos/{owner}/{repo}/pulls/{number}/comments"),
                None::<&()>,
            )
            .await?;
        Ok(rows.into_iter().map(Into::into).collect())
    }

    pub async fn list_pull_requests(
        &self,
        owner: &str,
        repo: &str,
        state: &str,
        head: Option<&str>,
    ) -> Result<Vec<GitHubPullRequestSummary>, GitHubRestError> {
        let mut path = format!("/repos/{owner}/{repo}/pulls?state={state}");
        if let Some(head) = head {
            path.push_str("&head=");
            path.push_str(head);
        }
        let rows: Vec<GitHubPullRequestRaw> = self.request(Method::GET, &path, None::<&()>).await?;
        Ok(rows.into_iter().map(Into::into).collect())
    }

    async fn request<T, B>(
        &self,
        method: Method,
        path: &str,
        body: Option<&B>,
    ) -> Result<T, GitHubRestError>
    where
        T: DeserializeOwned,
        B: Serialize + ?Sized,
    {
        let mut request = self.build_request(method, path);
        if let Some(body) = body {
            request = request.json(body);
        }
        let response = request.send().await?;
        let status = response.status();
        if status.is_success() {
            return Ok(response.json::<T>().await?);
        }
        Err(GitHubRestError::Api(map_error(status, response).await))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct CreateGitHubPullRequest {
    pub title: String,
    pub body: Option<String>,
    pub head: String,
    pub base: String,
    #[serde(default)]
    pub draft: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct GitHubRepoMetadata {
    pub id: i64,
    pub node_id: String,
    pub full_name: String,
    pub default_branch: String,
    pub html_url: String,
}

#[derive(Debug, Clone)]
pub struct GitHubPrIssueComment {
    pub id: i64,
    pub author: Option<String>,
    pub author_association: Option<String>,
    pub body: String,
    pub created_at: DateTime<Utc>,
    pub url: Option<String>,
}

#[derive(Debug, Clone)]
pub struct GitHubPrReviewComment {
    pub id: i64,
    pub author: Option<String>,
    pub author_association: Option<String>,
    pub body: String,
    pub created_at: DateTime<Utc>,
    pub url: Option<String>,
    pub path: String,
    pub line: Option<i64>,
    pub side: Option<String>,
    pub diff_hunk: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GitHubIssueRaw {
    number: i64,
    node_id: String,
    title: String,
    state: String,
    html_url: String,
    user: Option<GitHubUserRaw>,
    labels: Vec<GitHubLabelRaw>,
    assignees: Vec<GitHubUserRaw>,
    updated_at: DateTime<Utc>,
    body: Option<String>,
    pull_request: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct GitHubIssueSearchResponse {
    items: Vec<GitHubIssueRaw>,
}

#[derive(Debug, Deserialize)]
struct GitHubIssueCommentRaw {
    id: i64,
    body: String,
    user: Option<GitHubUserRaw>,
    created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
struct GitHubPrIssueCommentRaw {
    id: i64,
    body: String,
    user: Option<GitHubUserRaw>,
    author_association: Option<String>,
    created_at: DateTime<Utc>,
    html_url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GitHubPrReviewCommentRaw {
    id: i64,
    body: String,
    user: Option<GitHubUserRaw>,
    author_association: Option<String>,
    created_at: DateTime<Utc>,
    html_url: Option<String>,
    path: String,
    line: Option<i64>,
    side: Option<String>,
    diff_hunk: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GitHubPullRequestRaw {
    number: i64,
    title: String,
    state: String,
    html_url: String,
    head: GitHubPullRequestRefRaw,
    base: GitHubPullRequestRefRaw,
}

#[derive(Debug, Deserialize)]
struct GitHubPullRequestRefRaw {
    #[serde(rename = "ref")]
    ref_name: String,
}

#[derive(Debug, Deserialize)]
struct GitHubUserRaw {
    login: String,
}

#[derive(Debug, Deserialize)]
struct GitHubLabelRaw {
    name: String,
}

impl From<GitHubIssueRaw> for GitHubIssueSummary {
    fn from(value: GitHubIssueRaw) -> Self {
        Self {
            number: value.number,
            node_id: value.node_id,
            title: value.title,
            state: value.state,
            url: value.html_url,
            author: value.user.map(|user| user.login),
            labels: value.labels.into_iter().map(|label| label.name).collect(),
            assignees: value.assignees.into_iter().map(|user| user.login).collect(),
            updated_at: value.updated_at,
            last_synced_at: Some(Utc::now()),
            stale: false,
            work_item_id: None,
        }
    }
}

fn github_issue_raw_is_issue(value: &GitHubIssueRaw) -> bool {
    value.pull_request.is_none()
}

impl From<GitHubIssueCommentRaw> for GitHubIssueComment {
    fn from(value: GitHubIssueCommentRaw) -> Self {
        Self {
            id: value.id,
            body: value.body,
            author: value.user.map(|user| user.login),
            created_at: value.created_at,
        }
    }
}

impl From<GitHubPrIssueCommentRaw> for GitHubPrIssueComment {
    fn from(value: GitHubPrIssueCommentRaw) -> Self {
        Self {
            id: value.id,
            body: value.body,
            author: value.user.map(|user| user.login),
            author_association: value.author_association,
            created_at: value.created_at,
            url: value.html_url,
        }
    }
}

impl From<GitHubPrReviewCommentRaw> for GitHubPrReviewComment {
    fn from(value: GitHubPrReviewCommentRaw) -> Self {
        Self {
            id: value.id,
            body: value.body,
            author: value.user.map(|user| user.login),
            author_association: value.author_association,
            created_at: value.created_at,
            url: value.html_url,
            path: value.path,
            line: value.line,
            side: value.side,
            diff_hunk: value.diff_hunk,
        }
    }
}

impl From<GitHubPullRequestRaw> for GitHubPullRequestSummary {
    fn from(value: GitHubPullRequestRaw) -> Self {
        Self {
            number: value.number,
            title: value.title,
            state: value.state,
            url: value.html_url,
            head_branch: value.head.ref_name,
            base_branch: value.base.ref_name,
        }
    }
}

async fn map_error(status: StatusCode, response: reqwest::Response) -> GitHubApiErrorData {
    let retry_after = response
        .headers()
        .get("x-ratelimit-reset")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<i64>().ok())
        .and_then(|ts| DateTime::<Utc>::from_timestamp(ts, 0));
    let message = response.text().await.unwrap_or_else(|_| status.to_string());
    let code = match status {
        StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN if retry_after.is_none() => {
            "github_auth_required"
        }
        StatusCode::FORBIDDEN | StatusCode::TOO_MANY_REQUESTS => "github_rate_limited",
        StatusCode::NOT_FOUND => "github_repo_disconnected",
        _ => "github_write_failed",
    };
    GitHubApiErrorData {
        code: code.to_string(),
        message,
        retry_after,
        last_synced_at: None,
        stale: false,
    }
}

pub(crate) fn issue_list_path(owner: &str, repo: &str, query: Option<&str>) -> String {
    let Some(query) = query.map(str::trim).filter(|query| !query.is_empty()) else {
        return format!("/repos/{owner}/{repo}/issues?state=all");
    };
    let search_query = format!("repo:{owner}/{repo} is:issue {query}");
    let encoded = url::form_urlencoded::byte_serialize(search_query.as_bytes()).collect::<String>();
    format!("/search/issues?q={encoded}")
}

#[cfg(test)]
mod tests {
    use chrono::Utc;
    use reqwest::Method;
    use serde_json::json;

    use super::{
        GitHubIssueRaw, GitHubLabelRaw, GitHubRestClient, GitHubUserRaw, github_issue_raw_is_issue,
        issue_list_path,
    };

    #[test]
    fn build_request_sets_required_github_headers() {
        let client = GitHubRestClient::new_with_base_url(
            "secret".to_string().into(),
            "https://example.test",
        );
        let request = client
            .build_request(Method::GET, "/repos/o/r")
            .build()
            .expect("build request");

        assert_eq!(request.headers()["accept"], "application/vnd.github+json");
        assert_eq!(request.headers()["x-github-api-version"], "2022-11-28");
        assert_eq!(request.headers()["user-agent"], "OpenTeams");
        assert_eq!(request.headers()["authorization"], "Bearer secret");
    }

    #[test]
    fn issue_search_uses_github_search_api_query_syntax() {
        let path = issue_list_path("openai", "codex", Some("label:bug panic"));

        assert_eq!(
            path,
            "/search/issues?q=repo%3Aopenai%2Fcodex+is%3Aissue+label%3Abug+panic"
        );
    }

    #[test]
    fn issue_list_without_search_uses_repo_issue_api() {
        assert_eq!(
            issue_list_path("openai", "codex", Some("   ")),
            "/repos/openai/codex/issues?state=all"
        );
    }

    #[test]
    fn issue_list_filters_pull_requests_returned_by_github_issues_api() {
        let issue = GitHubIssueRaw {
            number: 1,
            node_id: "I_kw".to_string(),
            title: "real issue".to_string(),
            state: "open".to_string(),
            html_url: "https://github.com/o/r/issues/1".to_string(),
            user: Some(GitHubUserRaw {
                login: "octo".to_string(),
            }),
            labels: vec![GitHubLabelRaw {
                name: "bug".to_string(),
            }],
            assignees: vec![],
            updated_at: Utc::now(),
            body: None,
            pull_request: None,
        };
        let pull_request = GitHubIssueRaw {
            number: 2,
            node_id: "PR_kw".to_string(),
            title: "pr masquerading as issue".to_string(),
            state: "open".to_string(),
            html_url: "https://github.com/o/r/pull/2".to_string(),
            user: None,
            labels: vec![],
            assignees: vec![],
            updated_at: Utc::now(),
            body: None,
            pull_request: Some(json!({ "url": "https://api.github.com/repos/o/r/pulls/2" })),
        };

        assert!(github_issue_raw_is_issue(&issue));
        assert!(!github_issue_raw_is_issue(&pull_request));
    }
}
