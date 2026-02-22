from fastapi import HTTPException

class ErrorCode:
  UNAUTHORIZED = "UNAUTHORIZED"
  FORBIDDEN = "FORBIDDEN"
  NOT_FOUND = "NOT_FOUND"
  CONFLICT = "CONFLICT"
  VALIDATION = "VALIDATION"
  INTERNAL = "INTERNAL"

  RO_ALREADY_ACCEPTED = "RO_ALREADY_ACCEPTED"
  RO_NOT_ACTIVE = "RO_NOT_ACTIVE"
  RO_NOT_ASSIGNED_TO_YOU = "RO_NOT_ASSIGNED_TO_YOU"
  RO_LOCKED_COMPLETED = "RO_LOCKED_COMPLETED"

def http_error(status_code: int, detail: str, code: str):
 raise HTTPException(status_code=status_code, detail={"detail": detail, "code": code})