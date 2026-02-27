from pydantic import BaseModel, ConfigDict
from datetime import datetime

# Schemas for recommended jobs related to schedules
class RecommendedJobCreate(BaseModel):
    job_id: int

# Snapshot of job details at the time of recommendation
class RecommendedJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    job_title_snapshot: str
    job_description_snapshot: str | None = None
    duration_minutes_snapshot: int

    is_completed: bool = False
    completed_at: datetime | None = None