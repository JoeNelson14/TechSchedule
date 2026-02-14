from pydantic import BaseModel, ConfigDict
from typing import Optional

# Base schema for Job
class JobBase(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: Optional[int] = None

# Schema for creating a new Job
class JobCreate(JobBase):
    pass

#  Schema for updating an existing Job
class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[int] = None

# Schema for responding with Job data
class JobResponse(JobBase):
    id: int
    title: str
    description: Optional[str] = None
    status: str
    assigned_to: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


    # *********************** NEED TO GET CRUD TO WORK, NOT SHOWING UP IN /DOCS WHY? ***********************