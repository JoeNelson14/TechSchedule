from typing import Optional
from sqlalchemy.orm import Session

from app.models.schedule import Schedule
from app.models.user import User
from app.models.schedule_event import ScheduleEvent


def log_ro_event(
    db: Session,
    schedule: Schedule,
    actor: Optional[User],
    event_type: str,
    *,
    from_status: Optional[str] = None,
    to_status: Optional[str] = None,
    note: Optional[str] = None,
):
    evt = ScheduleEvent(
        schedule_id=schedule.id,
        actor_id=actor.id if actor else None,
        event_type=event_type,
        from_status=from_status,
        to_status=to_status,
        note=note,
    )
    db.add(evt)
