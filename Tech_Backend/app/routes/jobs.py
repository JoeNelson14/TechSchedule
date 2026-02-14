from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.job import Job
from app.schemas.job import JobCreate, JobUpdate, JobResponse

# Define the API router for job-related endpoints
router = APIRouter(prefix="/jobs", tags=["jobs"])

# Endpoint to create a new job
@router.post("/", response_model=JobResponse)
def create_job(job: JobCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    new_job = Job(**job.model_dump())
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return new_job

# Endpoint to get all jobs
@router.get("/", response_model=list[JobResponse])
def get_jobs(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    jobs = db.query(Job).all()
    return jobs

# Endpoint to get a specific job by ID
@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

# Endpoint to update an existing job
@router.put("/{job_id}", response_model=JobResponse)
def update_job(job_id: int, job_update: JobUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    for key, value in job_update.model_dump(exclude_unset=True).items():
        setattr(job, key, value)
    
    db.commit()
    db.refresh(job)
    return job

# Endpoint to delete a job
@router.delete("/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    db.delete(job)
    db.commit()
    return {"detail": "Job deleted successfully"}