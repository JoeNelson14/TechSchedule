from pydantic import BaseModel, ConfigDict, EmailStr, Field
from datetime import datetime
from typing import List, Optional, Literal
from app.schemas.recommended_job import RecommendedJobResponse

#  Base schema for schedule creation and updates
class ScheduleBase(BaseModel):
    job_id: int
    description: Optional[str] = None

    # Customer info
    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None

    # Vehicle info
    vehicle_make: str
    vehicle_model: str
    vehicle_year: int
    vehicle_vin: str = Field(min_length=17, max_length=17)

    scheduled_date: Optional[datetime] = None
    duration_hours: float | None = None
    status: Literal["active", "in_progress", "approval", "repair", "completed"] = "active"

    assigned_technician_id: Optional[int] = None
    recommended_repairs: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(extra="forbid")

class ScheduleCreate(ScheduleBase):
    pass

# Update schedule details (admin only)
class ScheduleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None

    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[int] = None
    vehicle_vin: str | None = Field(default=None, min_length=17, max_length=17)

    scheduled_date: Optional[datetime] = None
    duration_hours: float | None = None
    status: Optional[Literal["active", "in_progress", "approval", "repair", "completed"]] = None

    assigned_technician_id: Optional[int] = None
    notes: Optional[str] = None
    recommended_repairs: Optional[str] = None
    job_description_snapshot: str | None = None

# Update schedule details (technician only - limited fields)
class ScheduleTechUpdate(BaseModel):
    notes: Optional[str] = None
    description: Optional[str] = None
    recommended_repairs: Optional[str] = None
    status: Optional[Literal["active", "in_progress", "approval", "repair", "completed"]] = None
    
    model_config = ConfigDict(extra="forbid")

# Response model for returning schedule details
class ScheduleResponse(ScheduleBase):
    id: int
    ro_number: int
    title: str
    duration_hours: float | None = None
    created_by_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    recommended_repairs: Optional[str] = None
    recommended_jobs: List[RecommendedJobResponse] = []
    vehicle_vin: str | None = None
    job_description_snapshot: str | None = None

    is_approved: bool = False
    approved_by_id: int | None = None
    approved_at: datetime | None = None

    primary_job_completed: bool = False
    primary_job_completed_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

# Response model for dashboard view with categorized schedules
class DashboardSchedulesResponse(BaseModel):
    active_all: List[ScheduleResponse]
    in_progress_mine: List[ScheduleResponse]
    approval_mine: List[ScheduleResponse]
    repair_mine: List[ScheduleResponse]
    completed_mine: List[ScheduleResponse]

    model_config = ConfigDict(from_attributes=True)