import uuid
import qrcode
import io
import base64
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Quiz, Question, Option, Session as QuizSession
from app.schemas.schemas import QuizCreate, QuizOut, QuizSummary
from app.routers.auth import get_current_admin
from app.models.models import Admin

router = APIRouter()

def generate_slug(title: str) -> str:
    base = title.lower().strip().replace(" ", "-")
    base = "".join(c for c in base if c.isalnum() or c == "-")
    return f"{base}-{uuid.uuid4().hex[:6]}"

def generate_qr_base64(url: str) -> str:
    img = qrcode.make(url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return "data:image/png;base64," + base64.b64encode(buf.read()).decode()

@router.post("/", response_model=QuizOut)
def create_quiz(data: QuizCreate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    slug = generate_slug(data.title)
    quiz_url = f"http://localhost:5173/quiz/{slug}"
    qr_code = generate_qr_base64(quiz_url)
    quiz = Quiz(
        admin_id=admin.id,
        title=data.title,
        slug=slug,
        qr_code_url=qr_code,
        status="draft"
    )
    db.add(quiz)
    db.flush()
    for q_data in data.questions:
        question = Question(
            quiz_id=quiz.id,
            content=q_data.content,
            order_index=q_data.order_index,
            time_limit_seconds=q_data.time_limit_seconds,
            correct_option_index=q_data.correct_option_index
        )
        db.add(question)
        db.flush()
        for o_data in q_data.options:
            option = Option(
                question_id=question.id,
                content=o_data.content,
                option_index=o_data.option_index
            )
            db.add(option)
    db.commit()
    db.refresh(quiz)
    return quiz

@router.get("/", response_model=list[QuizSummary])
def list_quizzes(db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    return db.query(Quiz).filter(Quiz.admin_id == admin.id).order_by(Quiz.created_at.desc()).all()

@router.get("/join/{slug}")
def get_quiz_by_slug(slug: str, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.slug == slug, Quiz.status == "published").first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found or not published")
    return {"id": str(quiz.id), "title": quiz.title, "slug": quiz.slug}

@router.get("/{quiz_id}", response_model=QuizOut)
def get_quiz(quiz_id: str, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.admin_id == admin.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz

@router.post("/{quiz_id}/publish")
def publish_quiz(quiz_id: str, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.admin_id == admin.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if not quiz.questions:
        raise HTTPException(status_code=400, detail="Quiz has no questions")
    quiz.status = "published"
    db.commit()
    return {"message": "Quiz published", "slug": quiz.slug, "qr_code_url": quiz.qr_code_url}

@router.delete("/{quiz_id}")
def delete_quiz(quiz_id: str, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.admin_id == admin.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    db.delete(quiz)
    db.commit()
    return {"message": "Quiz deleted"}