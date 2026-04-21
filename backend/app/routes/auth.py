from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging

router = APIRouter(prefix="/api/auth", tags=["Auth"])
logger = logging.getLogger(__name__)

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login")
def login(req: LoginRequest):
    print(f"\n[AUTH LOG] 🔐 Login attempt received for username: '{req.username}'")
    logger.info(f"Login attempt for user: {req.username}")
    
    # We accept the login here to show logs in the terminal.
    # Actual user validation is handled by the frontend mock for now.
    print(f"[AUTH LOG] ✅ Login successful for: '{req.username}'\n")
    return {"status": "success", "username": req.username, "message": "Login logged in backend terminal"}
