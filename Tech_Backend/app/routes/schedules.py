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
from app.schemas.schedule import ScheduleCreate, ScheduleTechUpdate, ScheduleUpdate, ScheduleResponse, DashboardSchedulesResponse
from app.schemas.recommended_job import RecommendedJobCreate
from app.models.schedule_recommended_job import ScheduleRecommendedJob
from app.core.errors import ErrorCode, http_error

router = APIRouter(prefix="/schedules", tags=["schedules"])
ACTIVE_STATUSES = ["active", "in_progress", "approval", "repair"]

# Helper functions to convert between hours and minutes for duration fields
def hours_to_minutes(hours: float) -> int:
    return int(round(hours * 60))

def minutes_to_hours(minutes: int | None) -> float | None:
    if minutes is None:
        return None
    return round(minutes / 60, 2)

# Convert Schedule model to ScheduleResponse schema, including converting duration from minutes to hours and including recommended jobs in the response
def schedule_to_response(schedule: Schedule) -> ScheduleResponse:
    return ScheduleResponse(
        id=schedule.id,
        ro_number=schedule.ro_number,
        job_id=schedule.job_id,
        
        title=schedule.title,
        description=schedule.description,

        customer_name=schedule.customer_name,
        customer_phone=schedule.customer_phone,
        customer_email=schedule.customer_email,

        vehicle_make=schedule.vehicle_make,
        vehicle_model=schedule.vehicle_model,
        vehicle_year=schedule.vehicle_year,

        scheduled_date=schedule.scheduled_date,
        duration_hours=minutes_to_hours(schedule.duration_minutes),

        status=schedule.status,
        assigned_technician_id=schedule.assigned_technician_id,
        recommended_repairs=schedule.recommended_repairs,
        notes=schedule.notes,

        created_by_id=schedule.created_by_id,
        created_at=schedule.created_at,
        updated_at=schedule.updated_at,

        recommended_jobs=getattr(schedule, "recommended_jobs", [])
    )

# Gets dashboard schedules categorized by status for the current technician (active_all, in_progress_mine, approval_mine, repair_mine, completed_mine)
@router.get("/dashboard", response_model=DashboardSchedulesResponse)
def get_dashboard_schedules(db: Session = Depends(get_db), current_user: User = Depends(get_current_user), limit: int = Query(12, ge=1, le=50)):
    # For the dashboard, we want to return categorized schedules for the current technician:

    # Base query for schedules assigned to the current technician (or all if admin)
    base_mine = db.query(Schedule)
    if current_user.role != "admin":
        base_mine = base_mine.filter(Schedule.assigned_technician_id == current_user.id)

    # - Active (all users see all active schedules)
    active_all = db.query(Schedule).filter(Schedule.status == "active").order_by(Schedule.scheduled_date.desc().nullslast(), Schedule.id.desc()).limit(limit).all()
    
    # - In Progress (only schedules assigned to the current technician)
    in_progress_mine = base_mine.filter(Schedule.status == "in_progress").order_by(Schedule.scheduled_date.desc().nullslast(), Schedule.id.desc()).limit(limit).all()

    # - Approval (only schedules assigned to the current technician)
    approval_mine = base_mine.filter(Schedule.status == "approval").order_by(Schedule.scheduled_date.desc().nullslast(), Schedule.id.desc()).limit(limit).all()

    # - Repair (only schedules assigned to the current technician)
    repair_mine = base_mine.filter(Schedule.status == "repair").order_by(Schedule.scheduled_date.desc().nullslast(), Schedule.id.desc()).limit(limit).all()

    # - Completed (only schedules assigned to the current technician)
    completed_mine = base_mine.filter(Schedule.status == "completed").order_by(Schedule.scheduled_date.desc().nullslast(), Schedule.id.desc()).limit(limit).all()

    return {
    "active_all": [schedule_to_response(s) for s in active_all],
    "in_progress_mine": [schedule_to_response(s) for s in in_progress_mine],
    "approval_mine": [schedule_to_response(s) for s in approval_mine],
    "repair_mine": [schedule_to_response(s) for s in repair_mine],
    "completed_mine": [schedule_to_response(s) for s in completed_mine],
}

# Get all schedules (both admin and technician can view)
@router.get("/", response_model=List[ScheduleResponse])
def get_schedules(skip: int = 0, limit: int = 100, status: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), active: bool = Query(False), mine_in_progress: bool = Query(False)):
    query = db.query(Schedule)

    # If active is true, filter to only schedules that are in active statuses (active, in_progress, approval, repair)
    if active:
        query = query.filter(Schedule.status.in_(ACTIVE_STATUSES))

    # If mine_in_progress is true, filter to only schedules that are in progress and assigned to the current technician
    if mine_in_progress:
        query = query.filter(Schedule.assigned_technician_id == current_user.id)

    # Filter by status if provided
    if status:
        query = query.filter(Schedule.status == status)
    
    # Technicians can only see active schedules and schedules assigned to them, admins can see all schedules
    if current_user.role == "technician":
        query = query.filter(
            (Schedule.status == "active") |
            (Schedule.assigned_technician_id == current_user.id) |
            (Schedule.assigned_technician_id == None)
        )
    
    schedules = query.offset(skip).limit(limit).all()
    return [schedule_to_response(s) for s in schedules]

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
    return [schedule_to_response(s) for s in schedules]

# Get a single schedule by RO number (business id)
@router.get("/repair-order/{ro_number}", response_model=ScheduleResponse)
def get_schedule_by_ro_number(ro_number: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Validate that the schedule exists
    schedule = db.query(Schedule).filter(Schedule.ro_number == ro_number).first()

    if not schedule:
        http_error(404, "Repair order not found.", ErrorCode.RO_NOT_ACTIVE)

    # RBAC:
    # - Admin can view anything
    # - Tech can view:
    #   - any ACTIVE queue RO (status == "active") so they can decide to accept
    #   - OR any RO assigned to them (any status)
    if current_user.role == "technician":
        if schedule.status != "active" and schedule.assigned_technician_id != current_user.id:
            http_error(403, "Access denied", ErrorCode.FORBIDDEN)

    return schedule_to_response(schedule)

# Get a single schedule by ID
@router.get("/{schedule_id}", response_model=ScheduleResponse)
def get_schedule(schedule_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    
    if not schedule:
        http_error(404, "Schedule not found", ErrorCode.NOT_FOUND)
    
    # Technicians can only view their own schedules
    if current_user.role == "technician" and schedule.assigned_technician_id != current_user.id:
        http_error(403, "Access denied", ErrorCode.FORBIDDEN)
    
    return schedule_to_response(schedule)

# Create a new schedule (admin only)
@router.post("/", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule(schedule: ScheduleCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    # Validate job exists
    job = db.query(Job).filter(Job.id == schedule.job_id).first()
    if not job:
        http_error(404, "Job not found", ErrorCode.NOT_FOUND)
    
    # Validate assigned technician if provided
    if schedule.assigned_technician_id:
        technician = db.query(User).filter(User.id == schedule.assigned_technician_id).first()
        if not technician:
            http_error(404, "Assigned technician not found", ErrorCode.NOT_FOUND)
        

    # Generate next RO number (1000 style)
    next_ro = (db.query(func.max(Schedule.ro_number)).scalar() or 1000) + 1

    duration_minutes = hours_to_minutes(schedule.duration_hours) if schedule.duration_hours is not None else job.default_duration_minutes

    # Validate job exists
    db_schedule = Schedule(
        **schedule.model_dump(exclude={"duration_hours", "status"}),
        ro_number=next_ro,
        title=job.title,
        duration_minutes=duration_minutes,
        created_by_id=current_user.id,
        status="active",
    )

    # If schedule description is empty, use job description as default
    if not db_schedule.description and job.description:
        db_schedule.description = job.description

    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)

    return schedule_to_response(db_schedule)

# Update a schedule (admin only)
@router.put("/{schedule_id}", response_model=ScheduleResponse)
def update_schedule(schedule_id: int, schedule_update: ScheduleUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    db_schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    
    if not db_schedule:
        http_error(404, "Schedule not found", ErrorCode.NOT_FOUND)
    
    # Update only provided fields
    update_data = schedule_update.model_dump(exclude_unset=True)
    
    # Validate assigned technician if being updated
    if "assigned_technician_id" in update_data and update_data["assigned_technician_id"]:
        technician = db.query(User).filter(User.id == update_data["assigned_technician_id"]).first()
        if not technician:
            http_error(404, "Assigned technician not found", ErrorCode.NOT_FOUND)
        
    # Convert duration from hours to minutes if being updated
    if "duration_hours" in update_data and update_data["duration_hours"] is not None:
        db_schedule.duration_minutes = hours_to_minutes(update_data.pop("duration_hours"))

    for field, value in update_data.items():
        setattr(db_schedule, field, value)
    
    db.commit()
    db.refresh(db_schedule)
    
    return schedule_to_response(db_schedule)

# Delete a schedule (admin only)
@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(schedule_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    db_schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    
    if not db_schedule:
        http_error(404, "Schedule not found", ErrorCode.NOT_FOUND)
    
    db.delete(db_schedule)
    db.commit()
    
    return None

# Technician can update their assigned schedules (status, notes, scheduled_date, duration_minutes)
@router.patch("/{schedule_id}/tech", response_model=ScheduleResponse)
def tech_update_schedule(schedule_id: int, payload: ScheduleTechUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),):
    db_schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()

    # Validate schedule exists
    if not db_schedule:
        http_error(404, "Repair order not found", ErrorCode.RO_NOT_ACTIVE)
    # Validate technician role
    if current_user.role != "technician":
        http_error(403, "Only technicians can perform this action", ErrorCode.FORBIDDEN)
    # Validate assigned technician
    if db_schedule.assigned_technician_id != current_user.id:
        http_error(403, "Not allowed to edit this repair order", ErrorCode.RO_NOT_ASSIGNED_TO_YOU)
    # Prevent editing if schedule is completed
    if db_schedule.status == "completed":
        http_error(409, "Cannot edit a completed repair order", ErrorCode.RO_LOCKED_COMPLETED)
    
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
            http_error(409, f"Invalid status transition from {current} to {incoming_status}.", ErrorCode.CONFLICT)
        
        # If transitioning from in_progress to approval, check if recommended_repairs is empty. If empty, allow transition but set status to completed instead of approval
        if current == "in_progress" and incoming_status == "approval":
            # Check if there are any recommended repairs (either in the text field or in the recommended jobs)
            recommended_repairs = (db_schedule.recommended_repairs or "").strip()

            # Check if there are any recommended jobs associated with this schedule
            has_recommended_repairs = db.query(ScheduleRecommendedJob).filter(ScheduleRecommendedJob.schedule_id == db_schedule.id).first() is not None

            # If there are no recommended repairs and no recommended jobs, set status to completed instead of approval
            if recommended_repairs == "" and not has_recommended_repairs:
                db_schedule.status = "completed"
            else:
                db_schedule.status = "approval"
        else:
            db_schedule.status = incoming_status

    db.commit()
    db.refresh(db_schedule)
    return schedule_to_response(db_schedule)

# Endpoint for technicians to accept a schedule (change status to in_progress)
@router.post("/{schedule_id}/accept", response_model=ScheduleResponse)
def accept_schedule(schedule_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Only technicians can accept schedules
    if current_user.role != "technician":
        http_error(403, "Only technicians can perform this action", ErrorCode.FORBIDDEN)
    # Validate schedule exists
    db_schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not db_schedule:
        http_error(404, "Repair order not found", ErrorCode.NOT_FOUND)
    # Cannot accept a schedule that is already completed
    if db_schedule.status != "active":
        http_error(400, "Repair order is currently not active", ErrorCode.RO_NOT_ACTIVE)
    # If the schedule is already assigned to another technician, prevent accepting
    if db_schedule.assigned_technician_id is not None and db_schedule.assigned_technician_id != current_user.id:
        http_error(409, "Repair order is already assigned to another technician", ErrorCode.RO_ALREADY_ACCEPTED)
    
    db_schedule.assigned_technician_id = current_user.id
    db_schedule.status = "in_progress"

    db.commit()
    db.refresh(db_schedule)
    return schedule_to_response(db_schedule)

# Endpoint to add a recommended job to a schedule
@router.post("/{schedule_id}/recommended-jobs/", response_model=ScheduleResponse)
def add_recommended_job(schedule_id: int, payload: RecommendedJobCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()

    if not schedule:
        http_error(404, "Repair order not found", ErrorCode.NOT_FOUND)
    
    if current_user.role != "admin":
        if schedule.assigned_technician_id != current_user.id:
            http_error(403, "Not allowed to edit this repair order", ErrorCode.RO_NOT_ASSIGNED_TO_YOU)
        if schedule.status == "completed":
            http_error(400, "Cannot edit a completed repair order", ErrorCode.RO_LOCKED_COMPLETED)
        
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        http_error(404, "Job not found", ErrorCode.NOT_FOUND)
    
    rec = ScheduleRecommendedJob(schedule_id=schedule_id, job_id=payload.job_id, job_title_snapshot=job.title, duration_minutes_snapshot=job.default_duration_minutes)

    db.add(rec)
    db.commit()
    db.refresh(schedule)
    return schedule_to_response(schedule)

# Endpoint to delete a recommended job from a schedule
@router.delete("/{schedule_id}/recommended-jobs/{rec_id}", response_model=ScheduleResponse)
def delete_recommended_job(schedule_id: int, rec_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()

    if not schedule:
        http_error(404, "Repair order not found", ErrorCode.NOT_FOUND)
    
    if current_user.role != "admin":
        if schedule.assigned_technician_id != current_user.id:
            http_error(403, "Not allowed to edit this repair order", ErrorCode.RO_NOT_ASSIGNED_TO_YOU)
        if schedule.status == "completed":
            http_error(400, "Cannot edit a completed repair order", ErrorCode.RO_LOCKED_COMPLETED)

    rec = db.query(ScheduleRecommendedJob).filter(ScheduleRecommendedJob.id == rec_id, ScheduleRecommendedJob.schedule_id == schedule_id).first()
    if not rec:
        http_error(404, "Recommended job not found", ErrorCode.NOT_FOUND)
    
    db.delete(rec)
    db.commit()
    db.refresh(schedule)
    return schedule_to_response(schedule)