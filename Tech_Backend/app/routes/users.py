from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/users", tags=["users"])

# Endpoint to get the current user's information
@router.get("/technicians")
def get_technicians(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if current_user.role != "admin":
        return []
    return db.query(User).filter(User.role == "technician").all()