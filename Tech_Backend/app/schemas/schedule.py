from pydantic import BaseModel, ConfigDict, EmailStr
from datetime import datetime
from typing import Optional

#  Base schema for schedule creation and updates
class ScheduleBase(BaseModel):
    title: str
    description: Optional[str] = None

    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None

    vehicle_make: str
    vehicle_model: str
    vehicle_year: int

    scheduled_date: Optional[datetime] = None
    duration_minutes: Optional[int] = 60
    status: str = "scheduled"

    assigned_technician_id: Optional[int] = None
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
    vehicle_year: Optional[str] = None

    scheduled_date: Optional[datetime] = None
    duration_minutes: Optional[int] = 60
    status: Optional[str] = None

    assigned_technician_id: Optional[int] = None
    notes: Optional[str] = None

    model_config = ConfigDict(extra="forbid")

# Response model for returning schedule details
class ScheduleResponse(ScheduleBase):
    id: int
    created_by_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Status update schema for technicians to update status and add notes
class ScheduleStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None