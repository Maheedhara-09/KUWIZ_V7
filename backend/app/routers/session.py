from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Session as QuizSession, Quiz, Participant
from app.schemas.schemas import SessionOut, ParticipantJoin, ParticipantOut
from app.routers.auth import get_current_admin
from app.models.models import Admin

router = APIRouter()

@router.post("/{quiz_id}/create", response_model=SessionOut)
def create_session(quiz_id: str, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.admin_id == admin.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if quiz.status != "published":
        raise HTTPException(status_code=400, detail="Quiz must be published first")
    existing = db.query(QuizSession).filter(
        QuizSession.quiz_id == quiz_id,
        QuizSession.status != "ended"
    ).first()
    if existing:
        existing.status = "ended"
        db.commit()
    session = QuizSession(quiz_id=quiz_id, status="waiting", current_question_index=-1)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.post("/{session_id}/join", response_model=ParticipantOut)
def join_session(session_id: str, data: ParticipantJoin, db: Session = Depends(get_db)):
    session = db.query(QuizSession).filter(QuizSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status == "ended":
        raise HTTPException(status_code=400, detail="This session has already ended")
    if session.status == "active":
        raise HTTPException(status_code=400, detail="Quiz already in progress")
    participant = Participant(session_id=session_id, display_name=data.display_name.strip())
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant

@router.get("/{session_id}", response_model=SessionOut)
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(QuizSession).filter(QuizSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.get("/{session_id}/leaderboard")
def get_leaderboard(session_id: str, db: Session = Depends(get_db)):
    participants = (
        db.query(Participant)
        .filter(Participant.session_id == session_id)
        .order_by(Participant.total_score.desc())
        .all()
    )
    return [
        {"rank": i + 1, "name": p.display_name, "score": p.total_score}
        for i, p in enumerate(participants)
    ]

@router.get("/by-quiz/{quiz_id}/active")
def get_active_session(quiz_id: str, db: Session = Depends(get_db)):
    session = db.query(QuizSession).filter(
        QuizSession.quiz_id == quiz_id,
        QuizSession.status != "ended"
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="No active session for this quiz")
    return {"session_id": str(session.id), "status": session.status}