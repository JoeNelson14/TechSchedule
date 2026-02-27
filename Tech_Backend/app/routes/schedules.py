
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func
from typing import List, Dict, Any
from datetime import datetime
import re

from app.core.time import utcnow
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.core.errors import ErrorCode, http_error
from app.core.audit import log_ro_event
from app.models.job import Job
from app.models.user import User
from app.models.schedule import Schedule
from app.models.schedule_event import ScheduleEvent
from app.models.schedule_recommended_job import ScheduleRecommendedJob
from app.schemas.schedule_event import ScheduleEventResponse
from app.schemas.schedule import ScheduleCreate, ScheduleTechUpdate, ScheduleUpdate, ScheduleResponse, DashboardSchedulesResponse
from app.schemas.recommended_job import RecommendedJobCreate

router = APIRouter(prefix="/schedules", tags=["schedules"])
ACTIVE_STATUSES = ["active", "in_progress", "approval", "repair"]
ALLOWED_TRANSITIONS = {
    "active": {"in_progress"},  # tech can start or request repair
    "in_progress": {"approval", "repair"},   # tech can request approval (if needed)
    "approval": {"repair"},             # tech can request repair from approval
    "repair": {"completed"},   # tech can request completion from repair only
    "completed": set()    # no transitions allowed
}

# Check if a status transition is allowed
def can_transition(current: str, target: str) -> bool:
    return target in ALLOWED_TRANSITIONS.get(current, set())

# Assert completion gates for a schedule before allowing status transitions
def assert_completion_gates(db: Session, s: Schedule):
    if not bool(getattr(s, "primary_job_completed", False)):
        http_error(409, "Primary job must be completed first", ErrorCode.CONFLICT)

    incomplete = db.query(ScheduleRecommendedJob.id).filter(ScheduleRecommendedJob.schedule_id == s.id, ScheduleRecommendedJob.is_compeleted.is_(False)).first()
    if incomplete:
        http_error(409, "All recommended jobs must be completed first", ErrorCode.CONFLICT)

def parse_bool(raw, field_name="value") -> bool:
    if isinstance(raw, bool):
        return raw
    if isinstance(raw, str):
        s = raw.strip().lower()
        if s in {"true", "1", "yes", "y"}:
            return True
        if s in {"false", "0", "no", "n"}:
            return False
    http_error(400, f"Invalid '{field_name}' value", ErrorCode.VALIDATION)

def has_any_recommended_repairs(db: Session, s: Schedule) -> bool:
    text = (s.recommended_repairs or "").strip()
    if text:
        return True
    exists = db.query(ScheduleRecommendedJob.id).filter(ScheduleRecommendedJob.schedule_id == s.id).first()
    return exists is not None

def assert_can_complete_from_in_progress(db: Session, s: Schedule):
    if has_any_recommended_repairs(db, s):
        http_error(409, "Cannot complete while recommended repairs exist. Send to approval.", ErrorCode.CONFLICT)

    if not bool(getattr(s, "primary_job_completed", False)):
        http_error(409, "Primary jobs not completed", ErrorCode.CONFLICT)

def assert_can_complete_from_repair(db: Session, s: Schedule):
    if not bool(getattr(s, "primary_job_completed", False)):
        http_error(409, "Primary jobs not completed", ErrorCode.CONFLICT)

    incomplete = db.query(ScheduleRecommendedJob.id).filter(ScheduleRecommendedJob.schedule_id == s.id, ScheduleRecommendedJob.is_compeleted.is_(False)).first()
    if incomplete:
        http_error(409, "All recommended jobs must be completed first", ErrorCode.CONFLICT)

# Helper functions to convert between hours and minutes for duration fields
def hours_to_minutes(hours: float) -> int:
    return int(round(hours * 60))

def minutes_to_hours(minutes: int | None) -> float | None:
    if minutes is None:
        return None
    return round(minutes / 60, 2)

# Helper function to get the status value from a Schedule object
def status_value(s: Schedule) -> str:
    return s.status.value if hasattr(s.status, "value") else s.status

# Convert Schedule model to ScheduleResponse schema, including converting duration from minutes to hours and including recommended jobs in the response
def schedule_to_response(schedule: Schedule) -> ScheduleResponse:
    return ScheduleResponse(
        id=schedule.id,
        ro_number=schedule.ro_number,
        job_id=schedule.job_id,
        title=schedule.title,
        description=schedule.description,
        # Customer info
        customer_name=schedule.customer_name,
        customer_phone=schedule.customer_phone,
        customer_email=schedule.customer_email,
        # Vehicle info
        vehicle_make=schedule.vehicle_make,
        vehicle_model=schedule.vehicle_model,
        vehicle_year=schedule.vehicle_year,
        vehicle_vin=schedule.vehicle_vin,
        # Schedule info
        scheduled_date=schedule.scheduled_date,
        duration_hours=minutes_to_hours(schedule.duration_minutes),
        # Status and assignment
        status=schedule.status.value if hasattr(schedule.status, "value") else schedule.status,
        assigned_technician_id=schedule.assigned_technician_id,
        recommended_repairs=schedule.recommended_repairs,
        notes=schedule.notes,
        # Approval workflow fields
        is_approved=schedule.is_approved,
        approved_by_id=schedule.approved_by_id,
        approved_at=schedule.approved_at,
        # Primary job completion tracking
        primary_job_completed=schedule.primary_job_completed,
        primary_job_completed_at=schedule.primary_job_completed_at,
        # Audit fields
        created_by_id=schedule.created_by_id,
        created_at=schedule.created_at,
        updated_at=schedule.updated_at,

        recommended_jobs=getattr(schedule, "recommended_jobs", []),
        job_description_snapshot=schedule.job_description_snapshot,
    )



def extract_int_from_note(note: str | None, pattern: str) -> int | None:
    if not note:
        return None
    m = re.search(pattern, note)
    if not m:
        return None
    try:
        return int(m.group(1))
    except Exception:
        return None


def map_event_response(event: ScheduleEvent, user_lookup: Dict[int, str], rec_job_lookup: Dict[int, dict], job_lookup: Dict[int, str]) -> ScheduleEventResponse:
    note = event.note or ""
    rec_id = extract_int_from_note(note, r"Recommended job id\s+(\d+)")
    job_id = extract_int_from_note(note, r"job id\s+(\d+)")

    decision = None
    if event.event_type == "recommended_job_approved":
        decision = "approved"
    elif event.event_type == "recommended_job_rejected":
        decision = "rejected"

    job_title = None
    if rec_id is not None and rec_id in rec_job_lookup:
        job_title = rec_job_lookup[rec_id].get("job_title_snapshot")
    elif job_id is not None:
        job_title = job_lookup.get(job_id)

    return ScheduleEventResponse(
        id=event.id,
        schedule_id=event.schedule_id,
        actor_id=event.actor_id,
        actor_name=user_lookup.get(event.actor_id) if event.actor_id is not None else None,
        job_title=job_title,
        recommended_job_id=rec_id,
        recommendation_decision=decision,
        event_type=event.event_type,
        from_status=event.from_status,
        to_status=event.to_status,
        note=event.note,
        created_at=event.created_at,
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
        query = query.filter((Schedule.status == "active") | ((Schedule.assigned_technician_id == current_user.id)))
    
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
    db_schedule = db.query(Schedule).options(selectinload(Schedule.recommended_jobs)).filter(Schedule.ro_number == ro_number).first()
    if not db_schedule:
        http_error(404, "Repair order not found.", ErrorCode.RO_NOT_ACTIVE)

    # RBAC:
    # - Admin can view anything
    # - Tech can view:
    #   - any ACTIVE queue RO (status == "active") so they can decide to accept
    #   - OR any RO assigned to them (any status)
    if current_user.role == "technician":
        if status_value(db_schedule) != "active" and db_schedule.assigned_technician_id != current_user.id:
            http_error(403, "Access denied", ErrorCode.FORBIDDEN)
    # print("RO:", db_schedule.ro_number, "recs:", [(r.id, r.is_completed) for r in db_schedule.recommended_jobs])
    return schedule_to_response(db_schedule)

# Get schedule events
@router.get("/{schedule_id}/events", response_model=List[ScheduleEventResponse])
def get_schedule_events(schedule_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user),):
    s = db.query(Schedule).options(selectinload(Schedule.recommended_jobs)).filter(Schedule.id == schedule_id).first()
    if not s:
        http_error(404, "Repair order not found", ErrorCode.NOT_FOUND)

    # RBAC: admin can view; tech can view if assigned OR if active (queue view)
    if current_user.role == "technician":
        if s.status != "active" and s.assigned_technician_id != current_user.id:
            http_error(403, "Access denied", ErrorCode.FORBIDDEN)

    events = db.query(ScheduleEvent).filter(ScheduleEvent.schedule_id == schedule_id).order_by(ScheduleEvent.created_at.asc()).all()

    user_ids = {e.actor_id for e in events if e.actor_id is not None}
    users = db.query(User).filter(User.id.in_(user_ids)).all() if user_ids else []
    user_lookup = {u.id: u.email for u in users}

    rec_job_lookup = {
        rec.id: {"job_id": rec.job_id, "job_title_snapshot": rec.job_title_snapshot}
        for rec in (s.recommended_jobs or [])
    }

    job_ids = {rec["job_id"] for rec in rec_job_lookup.values() if rec.get("job_id") is not None}
    extra_job_ids = set()
    for e in events:
        parsed_job_id = extract_int_from_note(e.note, r"job id\s+(\d+)")
        if parsed_job_id is not None:
            extra_job_ids.add(parsed_job_id)
    job_ids.update(extra_job_ids)
    jobs = db.query(Job).filter(Job.id.in_(job_ids)).all() if job_ids else []
    job_lookup = {j.id: j.title for j in jobs}

    return [map_event_response(e, user_lookup, rec_job_lookup, job_lookup) for e in events]

# Get a single schedule by ID
@router.get("/{schedule_id}", response_model=ScheduleResponse)
def get_schedule(schedule_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    
    if not db_schedule:
        http_error(404, "Schedule not found", ErrorCode.NOT_FOUND)
    
    # Technicians can only view their own schedules
    if current_user.role == "technician" and db_schedule.assigned_technician_id != current_user.id:
        http_error(403, "Access denied", ErrorCode.FORBIDDEN)
    
    return schedule_to_response(db_schedule)

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
        job_description_snapshot=job.description,
        duration_minutes=duration_minutes,
        created_by_id=current_user.id,
        status="active",
    )

    # If schedule description is empty, use job description as default
    if not db_schedule.description and job.description:
        db_schedule.description = job.description

    db.add(db_schedule)
    db.flush()
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
    
    db.flush()
    db.refresh(db_schedule)
    
    return schedule_to_response(db_schedule)

# Delete a schedule (admin only)
@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(schedule_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    db_schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    
    if not db_schedule:
        http_error(404, "Schedule not found", ErrorCode.NOT_FOUND)
    
    db.delete(db_schedule)
    db.flush()
    
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
    if status_value(db_schedule) == "completed":
        http_error(409, "Cannot edit a completed repair order", ErrorCode.RO_LOCKED_COMPLETED)
    
    # Update only provided fields
    data = payload.model_dump(exclude_unset=True)

    # Store incoming status update separately to handle completed status logic
    incoming_status = data.pop("status", None)

    # If status is being updated, validate the new status value
    for k, v in data.items():
        setattr(db_schedule, k, v)

    # Handle status update separately
    if incoming_status:
        current = status_value(db_schedule)

        allowed = {
            "in_progress": {"approval", "completed"},
            "repair": {"completed"},
        }

        if current not in allowed or incoming_status not in allowed[current]:
            http_error(409, f"Invalid status transition from {current} to {incoming_status}.", ErrorCode.CONFLICT)

        if current == "in_progress" and incoming_status == "approval":
            # Only allow approval if there is something to approve
            if not has_any_recommended_repairs(db, db_schedule):
                http_error(409, "No recommended repairs/jobs exist; you can complete after finishing the primary job.", ErrorCode.CONFLICT)
            db_schedule.status = "approval"

        elif current == "in_progress" and incoming_status == "completed":
            # SPECIAL CASE RULE: allowed only if no rec repairs/jobs and primary completed
            assert_can_complete_from_in_progress(db, db_schedule)
            db_schedule.status = "completed"

        elif current == "repair" and incoming_status == "completed":
            # Normal completion gates during repair
            assert_can_complete_from_repair(db, db_schedule)
            db_schedule.status = "completed"

        else:
            prev = current
            db_schedule.status = incoming_status
            if status_value(db_schedule) != prev:
                log_ro_event(db, db_schedule, current_user, "status_changed", from_status=prev, to_status=db_schedule.status, note=f"Status changed by user id: {current_user.id}")

    db.flush()
    db.refresh(db_schedule)
    return schedule_to_response(db_schedule)

# Endpoint for technicians to accept a schedule (change status to in_progress)
@router.post("/{schedule_id}/accept", response_model=ScheduleResponse)
def accept_schedule(schedule_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Only technicians can accept schedules
    if current_user.role != "technician":
        http_error(403, "Only technicians can perform this action", ErrorCode.FORBIDDEN)
    # Validate schedule exists
    db_schedule = db.query(Schedule).filter(Schedule.id == schedule_id).with_for_update(read=True).first()
    if not db_schedule:
        http_error(404, "Repair order not found", ErrorCode.NOT_FOUND)
    # Cannot accept a schedule that is already completed
    if status_value(db_schedule) != "active":
        http_error(400, "Repair order is currently not active", ErrorCode.RO_NOT_ACTIVE)
    # If the schedule is already assigned to another technician, prevent accepting
    if db_schedule.assigned_technician_id is not None and db_schedule.assigned_technician_id != current_user.id:
        http_error(409, "Repair order is already assigned to another technician", ErrorCode.RO_ALREADY_ACCEPTED)
    
    old = status_value(db_schedule)
    db_schedule.assigned_technician_id = current_user.id
    db_schedule.status = "in_progress"

    # Log the acceptance event
    log_ro_event(db, db_schedule, current_user, "accepted", from_status=old, to_status="in_progress", note=f"Accepted by technician id: {current_user.id}")

    db.flush()
    db.refresh(db_schedule)
    return schedule_to_response(db_schedule)

# Endpoint for admins to approve a schedule (change status from approval to repair)
@router.post("/{schedule_id}/approve", response_model=ScheduleResponse)
def approve_schedule(schedule_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    db_schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    
    # Validate schedule exists
    if not db_schedule:
        http_error(404, "Repair order not found", ErrorCode.NOT_FOUND)
    # Validate that the schedule is in approval status
    if status_value(db_schedule) != "approval":
        http_error(400, "Repair order is not in approval status", ErrorCode.CONFLICT)
    
    old = status_value(db_schedule)
    db_schedule.status = "repair"
    db_schedule.is_approved = True
    db_schedule.approved_by_id = current_user.id
    db_schedule.approved_at = utcnow()

    # Log the approval event
    log_ro_event(db, db_schedule, current_user, "approved", from_status=old, to_status="repair", note=f"Approved by admin id: {current_user.id}")

    db.flush()
    db.refresh(db_schedule)
    return schedule_to_response(db_schedule)

# Endpoint for technicians to mark the primary job as completed (only if schedule is in repair status)
@router.patch("/{schedule_id}/jobs/primary", response_model=ScheduleResponse)
def set_primary_job_complete(schedule_id: int, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    # Validate schedule exists
    if not db_schedule:
        http_error(404, "Repair order not found", ErrorCode.NOT_FOUND)

    # RBAC: admin ok; tech must be assigned
    if current_user.role != "admin":
        if current_user.role != "technician":
            http_error(403, "Not Authorized", ErrorCode.FORBIDDEN)
        if db_schedule.assigned_technician_id != current_user.id:
            http_error(403, "RO is not assigned to you", ErrorCode.RO_NOT_ASSIGNED_TO_YOU)

    # Validate that the schedule is in repair status
    if status_value(db_schedule) == "completed":
        http_error(409, "Cannot edit a completed repair order", ErrorCode.RO_LOCKED_COMPLETED)
    # Validate that the schedule is in a status that allows completing the primary job
    if status_value(db_schedule) not in {"in_progress", "repair"}:
        http_error(409, "Primary job can only be completed durying in_progress or repair status", ErrorCode.CONFLICT)
    #  Validate that the request payload contains the 'is_completed' field
    if "is_completed" not in payload:
        http_error(409, "Missing 'is_completed' field in request body", ErrorCode.VALIDATION)
    # Validate that the 'is_completed' field is a boolean
    if "is_completed" not in payload:
        http_error(400, "Missing 'is_completed' field in request body", ErrorCode.VALIDATION)

    # Update the primary job completion status and timestamp
    is_completed = parse_bool(payload["is_completed"], "is_completed")
    db_schedule.primary_job_completed = is_completed
    db_schedule.primary_job_completed_at = utcnow() if is_completed else None

    # Log the primary job completion event
    log_ro_event(db, db_schedule, current_user, "primary_job_completed" if is_completed else "primary_job_incompleted", from_status=status_value(db_schedule), to_status=status_value(db_schedule), note=f"Primary job completion set to {is_completed} by user id: {current_user.id}")

    db.flush()
    db.refresh(db_schedule)
    return schedule_to_response(db_schedule)

# Endpoint to add a recommended job to a schedule
@router.post("/{schedule_id}/recommended-jobs/", response_model=ScheduleResponse)
def add_recommended_job(schedule_id: int, payload: RecommendedJobCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    # Validate schedule exists
    if not db_schedule:
        http_error(404, "Repair order not found", ErrorCode.NOT_FOUND)

    # Validate that the user has permission to edit this schedule (admin or assigned technician)
    if current_user.role != "admin":
        if db_schedule.assigned_technician_id != current_user.id:
            http_error(403, "RO is not assigned to you", ErrorCode.RO_NOT_ASSIGNED_TO_YOU)
        if status_value(db_schedule) == "completed":
            http_error(400, "Cannot edit a completed repair order", ErrorCode.RO_LOCKED_COMPLETED)
    # Validate job exists
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        http_error(404, "Job not found", ErrorCode.NOT_FOUND)

    # Create the recommended job entry with a snapshot of the job details
    rec = ScheduleRecommendedJob(schedule_id=schedule_id, job_id=payload.job_id, job_title_snapshot=job.title, duration_minutes_snapshot=job.default_duration_minutes, job_description_snapshot=job.description)

    # Log the recommended job addition event
    log_ro_event(db, db_schedule, current_user, "recommended_job_added", from_status=status_value(db_schedule), to_status=status_value(db_schedule), note=f"Recommended job id {payload.job_id} added by user id: {current_user.id}")

    db.add(rec)
    db.flush()
    db.refresh(db_schedule)
    return schedule_to_response(db_schedule)

# Endpoint to delete a recommended job from a schedule
@router.delete("/{schedule_id}/recommended-jobs/{rec_id}", response_model=ScheduleResponse)
def delete_recommended_job(schedule_id: int, rec_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()

    # Validate schedule exists
    if not db_schedule:
        http_error(404, "Repair order not found", ErrorCode.NOT_FOUND)
    
    # Validate that the user has permission to edit this schedule (admin or assigned technician)
    if current_user.role != "admin":
        if db_schedule.assigned_technician_id != current_user.id:
            http_error(403, "Not allowed to edit this repair order", ErrorCode.RO_NOT_ASSIGNED_TO_YOU)
        if status_value(db_schedule) == "completed":
            http_error(400, "Cannot edit a completed repair order", ErrorCode.RO_LOCKED_COMPLETED)

    # Validate that the recommended job exists and belongs to this schedule
    rec = db.query(ScheduleRecommendedJob).filter(ScheduleRecommendedJob.id == rec_id, ScheduleRecommendedJob.schedule_id == schedule_id).first()
    if not rec:
        http_error(404, "Recommended job not found", ErrorCode.NOT_FOUND)

    # Log the recommended job deletion event
    log_ro_event(db, db_schedule, current_user, "recommended_job_deleted", from_status=status_value(db_schedule), to_status=status_value(db_schedule), note=f"Recommended job id {rec_id} deleted by user id: {current_user.id}")

    db.delete(rec)
    db.flush()
    db.refresh(db_schedule)
    return schedule_to_response(db_schedule)

@router.patch("/{schedule_id}/recommended-jobs/{rec_id}/approval", response_model=ScheduleResponse)
def set_recommended_job_approval(schedule_id: int, rec_id: int, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    db_schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not db_schedule:
        http_error(404, "Repair order not found", ErrorCode.NOT_FOUND)

    rec = db.query(ScheduleRecommendedJob).filter(ScheduleRecommendedJob.id == rec_id, ScheduleRecommendedJob.schedule_id == schedule_id).first()
    if not rec:
        http_error(404, "Recommended job not found", ErrorCode.NOT_FOUND)

    decision = (payload or {}).get("decision")
    if decision not in {"approved", "rejected"}:
        http_error(400, "decision must be 'approved' or 'rejected'", ErrorCode.VALIDATION)

    event_type = "recommended_job_approved" if decision == "approved" else "recommended_job_rejected"
    log_ro_event(
        db,
        db_schedule,
        current_user,
        event_type,
        from_status=status_value(db_schedule),
        to_status=status_value(db_schedule),
        note=f"Recommended job id {rec_id} marked {decision} by admin id: {current_user.id}",
    )

    db.flush()
    db.expire(db_schedule, ["recommended_jobs"])
    db.refresh(db_schedule)
    return schedule_to_response(db_schedule)

@router.patch("/{schedule_id}/recommended-jobs/{rec_id}/complete", response_model=ScheduleResponse)
def set_recommended_job_complete(schedule_id: int, rec_id: int, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    # Validate schedule exists
    if not db_schedule:
        http_error(404, "Repair order not found", ErrorCode.NOT_FOUND)

    # RBAC: admin ok; tech must be assigned
    if current_user.role != "admin":
        if current_user.role != "technician":
            http_error(403, "Not authorized", ErrorCode.UNAUTHORIZED)
        if db_schedule.assigned_technician_id != current_user.id:
            http_error(403, "RO not assigned to you.", ErrorCode.RO_NOT_ASSIGNED_TO_YOU)
        if status_value(db_schedule) == "completed":
            http_error(409, "Cannot edit a completed repair order", ErrorCode.RO_LOCKED_COMPLETED)

    # Validate that the schedule is in repair status
    if status_value(db_schedule) != "repair":
        http_error(409, "Jobs can only be completed during repair.", ErrorCode.CONFLICT)

    # Validate that the recommended job exists and belongs to this schedule
    rec = db.query(ScheduleRecommendedJob).filter(ScheduleRecommendedJob.id == rec_id, ScheduleRecommendedJob.schedule_id == schedule_id).first()
    if not rec:
        http_error(404, "Recommended job not found", ErrorCode.NOT_FOUND)

    # Update the recommended job completion status and timestamp
    if "is_completed" not in payload:
        http_error(400, "Missing 'is_completed' in request body", ErrorCode.VALIDATION)

    is_completed = parse_bool(payload["is_completed"], "is_completed")
    rec.is_completed = is_completed
    rec.completed_at = utcnow() if is_completed else None

    # Log the recommended job completion event
    log_ro_event(db, db_schedule, current_user, "recommended_job_completed" if is_completed else "recommended_incompleted", from_status=status_value(db_schedule), to_status=status_value(db_schedule), note=f"Recommended job id {rec_id} completion set to {is_completed} by user id: {current_user.id}")

    db.flush()
    db.expire(db_schedule, ["recommended_jobs"])
    db.refresh(db_schedule)
    return schedule_to_response(db_schedule)