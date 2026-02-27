from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserCreate, UserLogin, Token, User as UserSchema
from app.services.auth_service import register_user, authenticate_user, generate_token
from app.utils.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserSchema)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    return register_user(db, user_data)


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login and get access token"""
    user = authenticate_user(db, credentials.email, credentials.password)
    access_token = generate_token(user)
    return Token(
        access_token=access_token, token_type="bearer", user=UserSchema.model_validate(user)
    )


@router.get("/me", response_model=UserSchema)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current user"""
    return current_user
