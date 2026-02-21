from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.models.job import Job
from app.schemas.job import JobCreate, JobUpdate, JobResponse

router = APIRouter(prefix="/jobs", tags=["jobs"])


def job_to_response(job: Job) -> JobResponse:
    return JobResponse(
        id=job.id,
        title=job.title,
        description=job.description,
        default_duration_hours=(
            round(job.default_duration_minutes / 60, 2)
            if job.default_duration_minutes is not None
            else None
        ),
    )


# Create a new job template (admin only)
@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(job: JobCreate, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    new_job = Job(
        title=job.title,
        description=job.description,
        default_duration_minutes=round(job.default_duration_hours * 60),
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return job_to_response(new_job)


# Get all job templates (any authenticated user)
@router.get("/", response_model=List[JobResponse])
def get_jobs(q: str | None = Query(default=None), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(Job)
    if q:
        query = query.filter(Job.title.ilike(f"%{q}%"))

    jobs = query.order_by(Job.title.asc()).all()
    return [job_to_response(j) for  j in jobs]


# Get job template by ID (any authenticated user)
@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job_to_response(job)


# Update a job template (admin only)
@router.put("/{job_id}", response_model=JobResponse)
def update_job(job_id: int, job_update: JobUpdate, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    data = job_update.model_dump(exclude_unset=True)

    # Convert hours -> minutes if provided
    if "default_duration_hours" in data and data["default_duration_hours"] is not None:
        job.default_duration_minutes = round(data.pop("default_duration_hours") * 60)

    for key, value in data.items():
        setattr(job, key, value)

    db.commit()
    db.refresh(job)
    return job_to_response(job)


# Delete a job template (admin only)
@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(job_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    db.delete(job)
    db.commit()
    return None