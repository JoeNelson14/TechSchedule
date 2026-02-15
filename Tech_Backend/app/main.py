from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, schedules, jobs
from app.core.database import Base, engine
from app.routes import users

# Create the database tables based on the defined models
Base.metadata.create_all(bind=engine)

# Create a FastAPI application instance
app = FastAPI(
    title="Tech Scheduling API",
    version="1.0.0",
    description="Automotive scheduling application with role-based access control"
)

# Define the allowed origins for CORS
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

# Set up CORS middleware to allow requests from the specified origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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