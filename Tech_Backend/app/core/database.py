from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load .env so DATABASE_URL can be configured per environment.
load_dotenv()

# PostgreSQL is now the default database engine for local development.
# Example:
# postgresql+psycopg2://postgres:postgres@localhost:5432/techschedule
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@localhost:5432/techschedule",
)

# Create a SQLAlchemy engine. PostgreSQL does not require sqlite connect_args.
engine = create_engine(DATABASE_URL)

# Session factory used by FastAPI dependency injection.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base shared by all SQLAlchemy models.
Base = declarative_base()


def get_db():
    """Yield a DB session and commit only after invariant checks pass."""
    db = SessionLocal()
    try:
        yield db

        # Lazy import avoids circular imports at startup.
        from app.core.invariants import validate_schedule_invariants

        # Validate invariants on changed schedule records before commit.
        for obj in db.new.union(db.dirty):
            if getattr(obj, "__tablename__", None) == "schedules":
                validate_schedule_invariants(db, obj)

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
