from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Admin
from app.schemas.schemas import AdminCreate, Token
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Admin:
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    admin = db.query(Admin).filter(Admin.id == payload.get("sub")).first()
    if not admin:
        raise HTTPException(status_code=401, detail="Admin not found")
    return admin

@router.post("/register", response_model=Token)
def register(data: AdminCreate, db: Session = Depends(get_db)):
    existing = db.query(Admin).filter(Admin.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    admin = Admin(email=data.email, password_hash=hash_password(data.password))
    db.add(admin)
    db.commit()
    db.refresh(admin)
    token = create_access_token({"sub": str(admin.id)})
    return {"access_token": token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.email == form.username).first()
    if not admin or not verify_password(form.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(admin.id)})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me")
def me(current_admin: Admin = Depends(get_current_admin)):
    return {"id": str(current_admin.id), "email": current_admin.email}