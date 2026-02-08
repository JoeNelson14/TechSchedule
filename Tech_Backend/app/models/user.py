from dataclasses import dataclass

# This is a simple User model. In a real application, you would likely want to use an ORM like SQLAlchemy to manage your database models,
# and you would also want to include additional fields such as timestamps for when the user was created or last updated.
@dataclass
class User:
    id: int
    email: str
    hashed_password: str
    role: str # "admin" or "technician"