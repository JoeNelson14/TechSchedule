from pydantic import BaseModel, ConfigDict
from typing import Optional

# Base schema for Job
class JobBase(BaseModel):
    title: str
    description: Optional[str] = None
    default_duration_minutes: int = 60

# Schema for creating a new Job
class JobCreate(JobBase):
    pass

#  Schema for updating an existing Job
class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    default_duration_minutes: int

# Schema for responding with Job data
class JobResponse(JobBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
