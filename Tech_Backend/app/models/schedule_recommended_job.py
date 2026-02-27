from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, func, Text, Boolean
from sqlalchemy.orm import relationship, synonym
from app.core.database import Base

# This model represents a recommended job for a schedule. It captures a snapshot of the job details at the time of recommendation to ensure historical accuracy even if the underlying job templates change later.
class ScheduleRecommendedJob(Base):
    __tablename__ = "schedule_recommended_jobs"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)

    # snapshot (important so history stays stable if job templates change)
    job_title_snapshot = Column(String, nullable=False)
    duration_minutes_snapshot = Column(Integer, nullable=False)
    job_description_snapshot = Column(Text, nullable=True)

    # Track if the recommended job has been completed, and when
    is_compeleted = Column(Boolean, default=False, nullable=False)
    is_completed = synonym("is_compeleted")
    completed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    schedule = relationship("Schedule", back_populates="recommended_jobs")