from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.models.user import User
from app.models.schedule import Schedule
from app.models.job import Job
from app.schemas.schedule import ScheduleCreate, ScheduleTechUpdate, ScheduleUpdate, ScheduleResponse, ScheduleStatusUpdate

router = APIRouter(prefix="/schedules", tags=["schedules"])
ACTIVE_STATUSES = ["active", "in_progress", "approval", "repair"]

# Get all schedules (both admin and technician can view)
@router.get("/", response_model=List[ScheduleResponse])
def get_schedules(skip: int = 0, limit: int = 100, status: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), active: bool = Query(False), mine_in_progress: bool = Query(False)):
    query = db.query(Schedule)

    # If active is true, filter to only schedules that are in active statuses (active, in_progress, approval, repair)
    if active:
        query = query.filter(Schedule.status.in_(ACTIVE_STATUSES))

    # If mine_in_progress is true, filter to only schedules assigned to the technician that are in progress
    if mine_in_progress:
        query = query.filter(
            Schedule.assigned_technician_id == current_user.id,
            Schedule.status == "in_progress"
        )
    
    # Technicians can only see schedules assigned to them or unassigned
    if current_user.role == "technician":
        query = query.filter(
            (Schedule.assigned_technician_id == current_user.id) |
            (Schedule.assigned_technician_id == None)
        )
    
    # Filter by status if provided
    if status:
        query = query.filter(Schedule.status == status)
    
    schedules = query.offset(skip).limit(limit).all()
    return schedules

# Get a single schedule by ID
@router.get("/{schedule_id}", response_model=ScheduleResponse)
def get_schedule(schedule_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Technicians can only view their own schedules
    if current_user.role == "technician" and schedule.assigned_technician_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return schedule

# Create a new schedule (admin only)
@router.post("/", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule(schedule: ScheduleCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    # Validate job exists
    job = db.query(Job).filter(Job.id == schedule.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Validate assigned technician if provided
    if schedule.assigned_technician_id:
        technician = db.query(User).filter(User.id == schedule.assigned_technician_id).first()
        if not technician:
            raise HTTPException(status_code=404, detail="Assigned technician not found")
        

    # Generate next RO number (1000 style)
    next_ro = (db.query(func.max(Schedule.ro_number)).scalar() or 1000) + 1

    duration = schedule.duration_minutes or job.default_duration_minutes

    # Validate job exists
    db_schedule = Schedule(
        **schedule.model_dump(exclude={"duration_minutes"}),
        ro_number=next_ro,
        title=job.title,
        duration_minutes=duration,
        created_by_id=current_user.id,
        status="active",
    )

    # If schedule description is empty, use job description as default
    if not db_schedule.description and job.description:
        db_schedule.description = job.description

    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)

    return db_schedule

# Update a schedule (admin only)
@router.put("/{schedule_id}", response_model=ScheduleResponse)
def update_schedule(schedule_id: int, schedule_update: ScheduleUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    db_schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Update only provided fields
    update_data = schedule_update.model_dump(exclude_unset=True)
    
    # Validate assigned technician if being updated
    if "assigned_technician_id" in update_data and update_data["assigned_technician_id"]:
        technician = db.query(User).filter(User.id == update_data["assigned_technician_id"]).first()
        if not technician:
            raise HTTPException(status_code=404, detail="Assigned technician not found")
    
    for field, value in update_data.items():
        setattr(db_schedule, field, value)
    
    db.commit()
    db.refresh(db_schedule)
    
    return db_schedule

# Get schedules by date range
@router.get("/date-range/", response_model=List[ScheduleResponse])
def get_schedules_by_date_range(start_date: datetime, end_date: datetime, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Schedule).filter(
        Schedule.scheduled_date >= start_date,
        Schedule.scheduled_date <= end_date
    )
    
    # Technicians can only see their schedules
    if current_user.role == "technician":
        query = query.filter(
            (Schedule.assigned_technician_id == current_user.id) | 
            (Schedule.assigned_technician_id == None)
        )
    
    schedules = query.all()
    return schedules

# Delete a schedule (admin only)
@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(schedule_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    db_schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    db.delete(db_schedule)
    db.commit()
    
    return None

# Technician can update their assigned schedules (status, notes, scheduled_date, duration_minutes)
@router.patch("/{schedule_id}/tech", response_model=ScheduleResponse)
def tech_update_schedule(schedule_id: int, payload: ScheduleTechUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),):
    db_schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()

    # Validate schedule exists
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Repair order not found.")
    # Validate technician role
    if current_user.role != "technician":
        raise HTTPException(status_code=403, detail="Technician endpoint only.")
    # Validate assigned technician
    if db_schedule.assigned_technician_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to edit this repair order.")
    # Prevent editing if schedule is completed
    if db_schedule.status == "completed":
        raise HTTPException(status_code=409, detail="Cannot edit a completed repair order.")
    
    # Update only provided fields
    data = payload.model_dump(exclude_unset=True)

    # Store incoming status update separately to handle completed status logic
    incoming_status = data.pop("status", None)

    # If status is being updated, validate the new status value
    for k, v in data.items():
        setattr(db_schedule, k, v)

    # If status is being updated to completed, set the completion date
    if incoming_status:
        # Validate allowed status transitions
        current = db_schedule.status

 
        allowed = {
            "in_progress": {"approval", "completed"},
            "approval": {"repair"},
            "repair": {"completed"},
        }

        # If the current status is not in the allowed transitions or the incoming status is not allowed from the current status, raise an error
        if current not in allowed or incoming_status not in allowed[current]:
            raise HTTPException(status_code=409, detail=f"Invalid status transition from {current} to {incoming_status}.")
        
        # If transitioning from in_progress to approval, check if recommended_repairs is empty. If empty, allow transition but set status to completed instead of approval
        if current == "in_progress" and incoming_status == "approval":
            recommended_repairs = (db_schedule.recommended_repairs or "").strip()
            if recommended_repairs == "":
                db_schedule.status = "completed"
            else:
                db_schedule.status = "approval"
        else:
            db_schedule.status = incoming_status

    db.commit()
    db.refresh(db_schedule)
    return db_schedule

# Endpoint for technicians to accept a schedule (change status to in_progress)
@router.post("/{schedule_id}/accept", response_model=ScheduleResponse)
def accept_schedule(schedule_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Only technicians can accept schedules
    if current_user.role != "technician":
        raise HTTPException(status_code=403, detail="Only technicians can accept schedules")
    # Validate schedule exists
    db_schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Repair Order not found.")
    # Cannot accept a schedule that is already completed
    if db_schedule.status != "active":
        raise HTTPException(status_code=400, detail="Repair order is currently not active.")
    # If the schedule is already assigned to another technician, prevent accepting
    if db_schedule.assigned_technician_id is not None and db_schedule.assigned_technician_id != current_user.id:
        raise HTTPException(status_code=409, detail="Repair order is already assigned to another technician.")
    
    db_schedule.assigned_technician_id = current_user.id
    db_schedule.status = "in_progress"

    db.commit()
    db.refresh(db_schedule)
    
    return db_schedule