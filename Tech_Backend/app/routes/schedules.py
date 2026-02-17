from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.models.user import User
from app.models.schedule import Schedule
from app.schemas.schedule import ScheduleCreate, ScheduleUpdate, ScheduleResponse, ScheduleStatusUpdate

router = APIRouter(prefix="/schedules", tags=["schedules"])

# Get all schedules (both admin and technician can view)
@router.get("/", response_model=List[ScheduleResponse])
def get_schedules(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Schedule)
    
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
def get_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Technicians can only view their own schedules
    if current_user.role == "technician" and schedule.assigned_technician_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return schedule

# Create a new schedule (admin only)
@router.post("/", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule(
    schedule: ScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # Validate assigned technician if provided
    if schedule.assigned_technician_id:
        technician = db.query(User).filter(User.id == schedule.assigned_technician_id).first()
        if not technician:
            raise HTTPException(status_code=404, detail="Assigned technician not found")
    
    db_schedule = Schedule(
        **schedule.model_dump(),
        created_by_id=current_user.id
    )
    
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    
    return db_schedule

# Update a schedule (admin only)
@router.put("/{schedule_id}", response_model=ScheduleResponse)
def update_schedule(
    schedule_id: int,
    schedule_update: ScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
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

# Delete a schedule (admin only)
@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    db_schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    db.delete(db_schedule)
    db.commit()
    
    return None

# Get schedules by date range
@router.get("/date-range/", response_model=List[ScheduleResponse])
def get_schedules_by_date_range(
    start_date: datetime,
    end_date: datetime,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
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

# Update schedule status (technician can update their own schedules, admin can update any)
@router.patch("/{schedule_id}/status", response_model=ScheduleResponse)
def update_schedule_status(schedule_id: int, payload: ScheduleStatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    
    if not db_schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Only assigned technician or admin can update status
    if current_user.role == "technician":
        if db_schedule.assigned_technician_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    db_schedule.status = payload.status
    if payload.notes is not None:
        db_schedule.notes = payload.notes
    db.commit()
    db.refresh(db_schedule)
    
    return db_schedule