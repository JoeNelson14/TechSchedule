from fastapi import FastAPI, Request, HTTPException
import os
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.routes import auth, schedules, jobs, users

# ✅ Register all models with SQLAlchemy metadata BEFORE create_all
from app.models.user import User  # noqa
from app.models.job import Job  # noqa
from app.models.schedule import Schedule  # noqa
from app.models.schedule_recommended_job import ScheduleRecommendedJob  # noqa
from app.models.schedule_event import ScheduleEvent  # noqa

# Create the database tables based on the defined models
Base.metadata.create_all(bind=engine)

# Create a FastAPI application instance
app = FastAPI(
    title="Tech Scheduling API",
    version="1.0.0",
    description="Automotive scheduling application with role-based access control"
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "detail" in exc.detail and "code" in exc.detail:
        payload = exc.detail
    else:
        payload = {"detail": str(exc.detail), "code": "INTERNAL"}
    return JSONResponse(status_code=exc.status_code, content=payload)


# Normalize origin strings from env (strip spaces/quotes/brackets/trailing slash).
def _normalize_origin(origin: str) -> str:
    cleaned = origin.strip().strip("\"'").strip("[]").rstrip("/")
    return cleaned


# Define the allowed origins for CORS.
# Production origins can be injected via:
# CORS_ORIGINS="https://frontend.example.com,https://other.example.com"
def _get_cors_origins() -> list[str]:
    configured = os.getenv("CORS_ORIGINS", "")
    parsed = [_normalize_origin(o) for o in configured.split(",") if _normalize_origin(o)]

    # If nothing configured, keep local defaults for development.
    defaults = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]
    return parsed or defaults


# Optional regex matcher for multi-preview deployment domains.
# Example: ^https://.*\.onrender\.com$
def _get_cors_origin_regex() -> str | None:
    raw = os.getenv("CORS_ORIGIN_REGEX", "").strip()
    return raw or None


origins = _get_cors_origins()
origin_regex = _get_cors_origin_regex()

# Set up CORS middleware to allow requests from configured origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the authentication and scheduling routes in the application
app.include_router(auth.router)
app.include_router(schedules.router)
app.include_router(jobs.router)
app.include_router(users.router)


# Health check endpoint
@app.get("/")
def root():
    return {
        "status": "API is running!",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/auth",
            "schedules": "/schedules",
            "docs": "/docs"
        }
    }
