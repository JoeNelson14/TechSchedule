from pydantic import BaseModel, ConfigDict, EmailStr
from datetime import datetime
from typing import Optional, Literal

#  Base schema for schedule creation and updates
class ScheduleBase(BaseModel):
    job_id: int
    description: Optional[str] = None

    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None

    vehicle_make: str
    vehicle_model: str
    vehicle_year: int

    scheduled_date: Optional[datetime] = None
    duration_minutes: Optional[int] = 60
    status: Literal["active", "in_progress", "approval", "repair", "completed"] = "active"

    assigned_technician_id: Optional[int] = None
    recommended_repairs: Optional[str] = None
    notes: Optional[str] = None

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

    scheduled_date: Optional[datetime] = None
    duration_minutes: Optional[int] = 60
    status: Optional[Literal["active", "in_progress", "approval", "repair", "completed"]] = None

    assigned_technician_id: Optional[int] = None
    notes: Optional[str] = None
    recommended_repairs: Optional[str] = None

    model_config = ConfigDict(extra="forbid")

# Update schedule details (technician only - limited fields)
class ScheduleTechUpdate(BaseModel):
    notes: Optional[str] = None
    description: Optional[str] = None
    recommended_repairs: Optional[str] = None
    status: Optional[Literal["active", "in_progress", "approval", "repair", "completed"]] = None

# Response model for returning schedule details
class ScheduleResponse(ScheduleBase):
    id: int
    ro_number: int
    title: str
    duration_minutes: int
    created_by_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    recommended_repairs: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)