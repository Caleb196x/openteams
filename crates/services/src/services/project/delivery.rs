use anyhow::Result;
use chrono::NaiveDate;
use db::models::project_delivery_record::{
    CreateProjectDeliveryRecord, ProjectDeliveryRecord, ProjectDeliveryStatsSummary,
};
use sqlx::SqlitePool;
use uuid::Uuid;

#[derive(Clone, Default)]
pub struct ProjectDeliveryService;

impl ProjectDeliveryService {
    pub fn new() -> Self {
        Self
    }

    pub async fn create_record(
        &self,
        pool: &SqlitePool,
        input: CreateProjectDeliveryRecord,
    ) -> Result<ProjectDeliveryRecord> {
        Ok(ProjectDeliveryRecord::create(pool, input).await?)
    }

    pub async fn list_records(
        &self,
        pool: &SqlitePool,
        project_id: Uuid,
        work_item_id: Option<Uuid>,
        repo_id: Option<Uuid>,
    ) -> Result<Vec<ProjectDeliveryRecord>> {
        Ok(ProjectDeliveryRecord::find_by_project(pool, project_id, work_item_id, repo_id).await?)
    }

    pub async fn stats_summary(
        &self,
        pool: &SqlitePool,
        project_id: Uuid,
        period_start: NaiveDate,
        period_end: NaiveDate,
    ) -> Result<ProjectDeliveryStatsSummary> {
        Ok(
            ProjectDeliveryRecord::stats_summary(pool, project_id, period_start, period_end)
                .await?,
        )
    }
}
