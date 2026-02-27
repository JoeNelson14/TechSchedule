from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class ScheduleEvent(Base):
    __tablename__ = "schedule_events"

    id = Column(Integer, primary_key=True, index=True)

    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=False, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    # Examples: accepted, status_changed, sent_to_approval, approved, primary_completed, rec_completed, rec_added, rec_deleted
    event_type = Column(String, nullable=False, index=True)

    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=True)

    # Optional human-readable note or JSON-ish string (keep simple for SQLite)
    note = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    schedule = relationship("Schedule", back_populates="events")
    actor = relationship("User")