from pydantic import BaseModel, ConfigDict

# Schemas for recommended jobs related to schedules
class RecommendedJobCreate(BaseModel):
    job_id: int

# Snapshot of job details at the time of recommendation
class RecommendedJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    job_title_snapshot: str
    duration_minutes_snapshot: int