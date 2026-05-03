from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime

# ── Auth ──────────────────────────────────────────
class AdminCreate(BaseModel):
    email: EmailStr
    password: str

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# ── Options ───────────────────────────────────────
class OptionCreate(BaseModel):
    content: str
    option_index: int

class OptionOut(BaseModel):
    id: UUID
    content: str
    option_index: int
    model_config = {"from_attributes": True}

# ── Questions ─────────────────────────────────────
class QuestionCreate(BaseModel):
    content: str
    order_index: int
    time_limit_seconds: int = 15
    correct_option_index: int
    options: list[OptionCreate]

class QuestionOut(BaseModel):
    id: UUID
    content: str
    order_index: int
    time_limit_seconds: int
    correct_option_index: int
    options: list[OptionOut]
    model_config = {"from_attributes": True}

# ── Quiz ──────────────────────────────────────────
class QuizCreate(BaseModel):
    title: str
    questions: list[QuestionCreate]

class QuizOut(BaseModel):
    id: UUID
    title: str
    slug: str
    qr_code_url: Optional[str]
    status: str
    questions: list[QuestionOut]
    model_config = {"from_attributes": True}

class QuizSummary(BaseModel):
    id: UUID
    title: str
    slug: str
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}

# ── Session ───────────────────────────────────────
class SessionOut(BaseModel):
    id: UUID
    quiz_id: UUID
    status: str
    current_question_index: int
    model_config = {"from_attributes": True}

# ── Participant ───────────────────────────────────
class ParticipantJoin(BaseModel):
    display_name: str

class ParticipantOut(BaseModel):
    id: UUID
    display_name: str
    total_score: int
    model_config = {"from_attributes": True}