from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class ScheduleBase(BaseModel):
    title: str
    description: Optional[str] = None
    customer_name: str
    customer_phone: str
    customer_email: EmailStr
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

class ScheduleUpdate(BaseModel):
    title: str
    description: Optional[str] = None
    customer_name: str
    customer_phone: str
    customer_email: EmailStr
    vehicle_make: str
    vehicle_model: str
    vehicle_year: int
    scheduled_date: Optional[datetime] = None
    duration_minutes: Optional[int] = 60
    status: str = "scheduled"
    assigned_technician_id: Optional[int] = None
    notes: Optional[str] = None

class ScheduleResponse(ScheduleBase):
    id: int
    created_by_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True