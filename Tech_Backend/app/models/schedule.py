from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum
class ScheduleStatus(enum.Enum):
    active = "active"
    in_progress = "in_progress"
    approval = "approval"
    repair = "repair"
    completed = "completed"

class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    ro_number = Column(Integer, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    job_description_snapshot = Column(Text, nullable=True)
    description = Column(Text, nullable=True)

    # Customer info
    customer_name = Column(String, nullable=False)
    customer_phone = Column(String, nullable=True)
    customer_email = Column(String, nullable=True)

    # Vehicle info
    vehicle_make = Column(String, nullable=False)
    vehicle_model = Column(String, nullable=False)
    vehicle_year = Column(Integer, nullable=False)
    vehicle_vin = Column(String(17), nullable=False)

    scheduled_date = Column(DateTime(timezone=True), nullable=True)
    duration_minutes = Column(Integer,default=60, nullable=True)
    status = Column(Enum(ScheduleStatus), default=ScheduleStatus.active, nullable=False)  # active, in_progress, approval, repair, completed
    assigned_technician_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Audit fields
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    notes = Column(Text, nullable=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    recommended_repairs = Column(Text, nullable=True)

    # Approval workflow fields
    is_approved = Column(Boolean, default=False, nullable=False)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)

    # Track if the primary job has been completed, and when
    primary_job_completed = Column(Boolean, default=False, nullable=False)
    primary_job_completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    assigned_technician = relationship("User", foreign_keys=[assigned_technician_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    job = relationship("Job")
    recommended_jobs = relationship("ScheduleRecommendedJob", back_populates="schedule", cascade="all, delete-orphan")
    events = relationship("ScheduleEvent", back_populates="schedule", cascade="all, delete-orphan", order_by="ScheduleEvent.created_at.asc()")