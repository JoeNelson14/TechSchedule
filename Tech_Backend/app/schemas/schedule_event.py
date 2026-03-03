from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Literal


class ScheduleEventResponse(BaseModel):
    id: int
    schedule_id: int
    actor_id: Optional[int] = None
    actor_name: Optional[str] = None
    job_title: Optional[str] = None
    recommended_job_id: Optional[int] = None
    recommendation_decision: Optional[Literal["approved", "rejected"]] = None
    event_type: str
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True