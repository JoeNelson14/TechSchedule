from pydantic import BaseModel, ConfigDict, field_serializer, field_validator
from typing import Optional

# Base schema for Job
class JobBase(BaseModel):
    title: str
    description: Optional[str] = None
    default_duration_hours: float

    @field_validator("default_duration_hours")
    @classmethod
    def validate_hours(cls, v: float):
        if v is None:
            return v
        if v <= 0:
            raise ValueError("Duration must be greater than 0")
        return v
    

# Schema for creating a new Job
class JobCreate(JobBase):
    pass

#  Schema for updating an existing Job
class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    default_duration_hours: Optional[float] = None

    @field_validator("default_duration_hours")
    @classmethod
    def validate_hours(cls, v: float):
        if v is None:
            return v
        if v <= 0:
            raise ValueError("Duration must be greater than 0")
        return v
    
    model_config = ConfigDict(extra="forbid")


# Schema for responding with Job data
class JobResponse(JobBase):
    id: int
    title: str
    description: str | None
    default_duration_hours: float

    model_config = ConfigDict(from_attributes=True)
