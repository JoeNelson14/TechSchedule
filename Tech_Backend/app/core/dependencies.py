from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.core.security import SECRET_KEY, ALGORITHM

# Dependency to get the current user based on the JWT token
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> User:
    # Extract the token from the credentials
    token = credentials.credentials
    
    # Define the exception to be raised if the credentials are invalid
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Decode the JWT token to get the user's email
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Query the database for the user with the given email
    user = db.query(User).filter(User.email == email).first()

    # If the user is not found in the database, raise an exception
    if user is None:
        raise credentials_exception
    return user

# Dependency to require admin role
async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    # Check if the current user has the admin role
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return current_user