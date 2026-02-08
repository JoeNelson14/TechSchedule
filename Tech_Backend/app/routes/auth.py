from fastapi import APIRouter, HTTPException
from app.schemas.user import UserCreate, UserLogin, Token
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

# This is a simple in-memory "database" of users. In a real application, you would want to use a real database.
fake_users_db: list[User] = []

# Register a new user
@router.post("/register")
def register(user: UserCreate):
  # Check if the email is already registered
  for u in fake_users_db:
    # In a real application, you would want to use a database query to check for existing users instead of iterating through a list.
    if u.email == user.email:
      raise HTTPException(status_code=400, detail="Email already registered")
    
  # Hash the password and create a new user
  new_user = User(
    id=len(fake_users_db) + 1,
    email=user.email,
    hashed_password=hash_password(user.password),
    role=user.role
  )

  # Add the new user to the "database"
  fake_users_db.append(new_user)
  return {"message": "User registered successfully"}

# Login a user and return a JWT token
@router.post("/login", response_model=Token)
def login(user: UserLogin):
  # In a real application, you would want to use a database query to find the user instead of iterating through a list.
  for u in fake_users_db:
    # Check if the email and password are correct
    if u.email == user.email and verify_password(user.password, u.hashed_password):
      token = create_access_token(data={"sub": u.email, "role": u.role})
      return {"access_token": token}
    
  # If the email or password is incorrect, raise an HTTP 401 Unauthorized error
  raise HTTPException(status_code=401, detail="Invalid email or password")