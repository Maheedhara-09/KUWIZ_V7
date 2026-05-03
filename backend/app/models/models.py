import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, Text,
    ForeignKey, DateTime
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class Admin(Base):
    __tablename__ = "admins"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email         = Column(String(255), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    created_at    = Column(DateTime(timezone=True), default=datetime.utcnow)
    quizzes       = relationship("Quiz", back_populates="admin", cascade="all, delete")

class Quiz(Base):
    __tablename__ = "quizzes"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id    = Column(UUID(as_uuid=True), ForeignKey("admins.id", ondelete="CASCADE"), nullable=False)
    title       = Column(String(255), nullable=False)
    slug        = Column(String(100), unique=True, nullable=False)
    qr_code_url = Column(Text)
    status      = Column(String(20), default="draft")
    created_at  = Column(DateTime(timezone=True), default=datetime.utcnow)
    admin       = relationship("Admin", back_populates="quizzes")
    questions   = relationship("Question", back_populates="quiz", cascade="all, delete", order_by="Question.order_index")
    sessions    = relationship("Session", back_populates="quiz", cascade="all, delete")

class Question(Base):
    __tablename__ = "questions"
    id                   = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id              = Column(UUID(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    content              = Column(Text, nullable=False)
    order_index          = Column(Integer, nullable=False)
    time_limit_seconds   = Column(Integer, default=15)
    correct_option_index = Column(Integer, nullable=False)
    quiz                 = relationship("Quiz", back_populates="questions")
    options              = relationship("Option", back_populates="question", cascade="all, delete", order_by="Option.option_index")
    responses            = relationship("Response", back_populates="question", cascade="all, delete")

class Option(Base):
    __tablename__ = "options"
    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id  = Column(UUID(as_uuid=True), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    content      = Column(Text, nullable=False)
    option_index = Column(Integer, nullable=False)
    question     = relationship("Question", back_populates="options")

class Session(Base):
    __tablename__ = "sessions"
    id                     = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id                = Column(UUID(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    current_question_index = Column(Integer, default=-1)
    status                 = Column(String(20), default="waiting")
    started_at             = Column(DateTime(timezone=True))
    ended_at               = Column(DateTime(timezone=True))
    created_at             = Column(DateTime(timezone=True), default=datetime.utcnow)
    quiz                   = relationship("Quiz", back_populates="sessions")
    participants           = relationship("Participant", back_populates="session", cascade="all, delete")

class Participant(Base):
    __tablename__ = "participants"
    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id   = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    display_name = Column(String(60), nullable=False)
    total_score  = Column(Integer, default=0)
    joined_at    = Column(DateTime(timezone=True), default=datetime.utcnow)
    session      = relationship("Session", back_populates="participants")
    responses    = relationship("Response", back_populates="participant", cascade="all, delete")

class Response(Base):
    __tablename__ = "responses"
    id                    = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    participant_id        = Column(UUID(as_uuid=True), ForeignKey("participants.id", ondelete="CASCADE"), nullable=False)
    question_id           = Column(UUID(as_uuid=True), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    selected_option_index = Column(Integer, nullable=False)
    is_correct            = Column(Boolean, nullable=False)
    score_awarded         = Column(Integer, default=0)
    response_time_ms      = Column(Integer, nullable=False)
    answered_at           = Column(DateTime(timezone=True), default=datetime.utcnow)
    participant           = relationship("Participant", back_populates="responses")
    question              = relationship("Question", back_populates="responses")