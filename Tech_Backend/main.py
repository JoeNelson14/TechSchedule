from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create a FastAPI application instance
app = FastAPI(
    title="Tech Scheduling API",
    version="1.0.0",
)

# Define the allowed origins for CORS
origins = [
    "http://localhost:5173"
]

# Set up CORS middleware to allow requests from the specified origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/")
def root():
    return {"status": "API is running!"}

@app.get('/schedule')
def get_schedule():
    return {"schedule": "This is the schedule endpoint"}  