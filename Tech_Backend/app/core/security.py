from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext

# Security settings for the application
SECRET_KEY = "CHANGE_THIS_IN_PRODUCTION"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Initialize the password context for hashing and verifying passwords
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# Hash a password using argon2
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

# Verify a password against a hashed password
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# Create a JWT access token
def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)