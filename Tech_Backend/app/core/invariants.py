from sqlalchemy.orm import Session
from app.models.schedule import Schedule
from app.models.schedule_recommended_job import ScheduleRecommendedJob
from app.core.errors import http_error, ErrorCode


def validate_schedule_invariants(db: Session, s: Schedule):
    """
    Hard safety rules for repair order lifecycle.
    If any fail → the DB write is rejected.
    """

    # --- Timestamp ↔ boolean consistency ---
    if not s.primary_job_completed and s.primary_job_completed_at is not None:
        http_error(500, "Invariant violation: primary completion timestamp without completion", ErrorCode.CONFLICT)

    if s.primary_job_completed and s.primary_job_completed_at is None:
        http_error(500, "Invariant violation: primary completion missing timestamp", ErrorCode.CONFLICT)

    # --- Approval consistency ---
    if s.is_approved and s.status not in {"repair", "completed"}:
        http_error(500, "Invariant violation: approved RO not in repair/completed state", ErrorCode.CONFLICT)

    # --- Completed state gates ---
    if s.status == "completed":
        if not s.primary_job_completed:
            http_error(500, "Invariant violation: completed RO without primary completion", ErrorCode.CONFLICT)

        incomplete = db.query(ScheduleRecommendedJob.id).filter(
            ScheduleRecommendedJob.schedule_id == s.id,
            ScheduleRecommendedJob.is_completed.is_(False)
        ).first()

        if incomplete:
            http_error(500, "Invariant violation: completed RO with incomplete recommended jobs", ErrorCode.CONFLICT)

    # --- Approval state validity ---
    if s.status == "approval":
        text = (s.recommended_repairs or "").strip()
        has_jobs = db.query(ScheduleRecommendedJob.id).filter(
            ScheduleRecommendedJob.schedule_id == s.id
        ).first()

        if not text and not has_jobs:
            http_error(500, "Invariant violation: approval without recommended repairs", ErrorCode.CONFLICT)