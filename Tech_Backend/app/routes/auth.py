from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.schemas.user import UserCreate, UserLogin, Token
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.core.database import get_db
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

# Register a new user
@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: Session = Depends(get_db)):
  existing_user = db.query(User).filter(User.email == user.email).first()
  if existing_user:
    raise HTTPException(status_code=400, detail="Email already registered")
  
  if user.role not in ["admin", "technician"]:
    raise HTTPException(status_code=400, detail="Invalid role. Must be 'admin' or 'technician'.")
  
  new_user = User(
    email=user.email,
    hashed_password=hash_password(user.password),
    role=user.role
  )

  db.add(new_user)
  db.commit()
  db.refresh(new_user)

  return {"message": "User registered successfully", "user_id": new_user.id}

# Login a user and return a JWT token
@router.post("/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
  db_user = db.query(User).filter(User.email == user.email).first()

  if not db_user or not verify_password(user.password, db_user.hashed_password):
    raise HTTPException(status_code=401, detail="Invalid email or password")
  
  token = create_access_token(data={"sub": db_user.email, "role": db_user.role})
  return {"access_token": token, "token_type": "bearer"}

@router.get("/me")
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "created_at": current_user.created_at
    }