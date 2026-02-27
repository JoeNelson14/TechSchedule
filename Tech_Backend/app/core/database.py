from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./techschedule.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db

        # Import invariants lazily (safe), and validate only for schedules by table name.
        from app.core.invariants import validate_schedule_invariants  # local import avoids cycle

        for obj in db.new.union(db.dirty):
            # Works without importing Schedule
            if getattr(obj, "__tablename__", None) == "schedules":
                validate_schedule_invariants(db, obj)

        db.commit()

    except:
        db.rollback()
        raise
    finally:
        db.close()