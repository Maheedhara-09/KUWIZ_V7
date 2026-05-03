import socketio
import asyncio
from datetime import datetime
from sqlalchemy.orm import Session as DBSession
from app.database import SessionLocal
from app.models.models import Session, Participant, Question, Response, Quiz

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
active_timers: dict[str, asyncio.Task] = {}
skip_flags: dict[str, bool] = {}

def get_db():
    return SessionLocal()

def calc_score(is_correct: bool, response_time_ms: int, time_limit_seconds: int) -> int:
    if not is_correct:
        return 0
    base = 10
    bonus = round(5 * max(0, 1 - (response_time_ms / (time_limit_seconds * 1000))))
    return base + bonus

def get_question_payload(q):
    return {
        "id": str(q.id),
        "content": q.content,
        "options": [{"index": o.option_index, "content": o.content} for o in q.options],
        "time_limit_seconds": q.time_limit_seconds,
        "order_index": q.order_index
    }

async def send_next_question(session_id: str):
    db = get_db()
    try:
        session = db.query(Session).filter(Session.id == session_id).first()
        if not session or session.status == "ended":
            return
        quiz = db.query(Quiz).filter(Quiz.id == str(session.quiz_id)).first()
        next_index = session.current_question_index + 1
        if next_index >= len(quiz.questions):
            session.status = "ended"
            session.ended_at = datetime.utcnow()
            db.commit()
            await sio.emit("quiz_ended", {}, room=session_id)
        else:
            session.current_question_index = next_index
            db.commit()
            q = quiz.questions[next_index]
            await sio.emit("next_question", {"question": get_question_payload(q)}, room=session_id)
            task = asyncio.create_task(
                run_question_timer(session_id, str(q.id), q.time_limit_seconds)
            )
            active_timers[session_id] = task
    finally:
        db.close()

async def run_question_timer(session_id: str, question_id: str, time_limit: int):
    await asyncio.sleep(time_limit)

    # broadcast leaderboard
    db = get_db()
    try:
        session = db.query(Session).filter(Session.id == session_id).first()
        if not session or session.status == "ended":
            return
        participants = (
            db.query(Participant)
            .filter(Participant.session_id == session_id)
            .order_by(Participant.total_score.desc())
            .all()
        )
        board = [
            {"rank": i + 1, "name": p.display_name, "score": p.total_score}
            for i, p in enumerate(participants)
        ]
        await sio.emit("leaderboard", {"leaderboard": board}, room=session_id)
    finally:
        db.close()

    # 5 second countdown then auto advance
    skip_flags[session_id] = False
    for i in range(5, 0, -1):
        if skip_flags.get(session_id):
            break
        await sio.emit("leaderboard_countdown", {"seconds": i}, room=session_id)
        await asyncio.sleep(1)

    await send_next_question(session_id)

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def join_session(sid, data):
    session_id = data.get("session_id")
    await sio.enter_room(sid, session_id)
    db = get_db()
    try:
        participants = (
            db.query(Participant)
            .filter(Participant.session_id == session_id)
            .all()
        )
        await sio.emit("participant_joined", {
            "count": len(participants),
            "participants": [p.display_name for p in participants]
        }, room=session_id)
    finally:
        db.close()

@sio.event
async def start_quiz(sid, data):
    session_id = data.get("session_id")
    db = get_db()
    try:
        session = db.query(Session).filter(Session.id == session_id).first()
        if not session:
            return
        session.status = "active"
        session.current_question_index = 0
        session.started_at = datetime.utcnow()
        db.commit()
        quiz = db.query(Quiz).filter(Quiz.id == str(session.quiz_id)).first()
        q = quiz.questions[0]
        await sio.emit("next_question", {"question": get_question_payload(q)}, room=session_id)
        task = asyncio.create_task(
            run_question_timer(session_id, str(q.id), q.time_limit_seconds)
        )
        active_timers[session_id] = task
    finally:
        db.close()

@sio.event
async def skip_leaderboard(sid, data):
    session_id = data.get("session_id")
    skip_flags[session_id] = True
    await send_next_question(session_id)

@sio.event
async def end_quiz(sid, data):
    session_id = data.get("session_id")
    db = get_db()
    try:
        session = db.query(Session).filter(Session.id == session_id).first()
        if not session:
            return
        session.status = "ended"
        session.ended_at = datetime.utcnow()
        db.commit()
        await sio.emit("quiz_ended", {}, room=session_id)
        if session_id in active_timers:
            active_timers[session_id].cancel()
            del active_timers[session_id]
    finally:
        db.close()

@sio.event
async def submit_answer(sid, data):
    participant_id = data.get("participant_id")
    question_id    = data.get("question_id")
    selected_index = data.get("selected_option_index")
    response_time  = data.get("response_time_ms")
    db = get_db()
    try:
        existing = db.query(Response).filter(
            Response.participant_id == participant_id,
            Response.question_id == question_id
        ).first()
        if existing:
            return
        question = db.query(Question).filter(Question.id == question_id).first()
        is_correct = (selected_index == question.correct_option_index)
        score = calc_score(is_correct, response_time, question.time_limit_seconds)
        response = Response(
            participant_id=participant_id,
            question_id=question_id,
            selected_option_index=selected_index,
            is_correct=is_correct,
            score_awarded=score,
            response_time_ms=response_time,
            answered_at=datetime.utcnow()
        )
        db.add(response)
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        participant.total_score += score
        db.commit()
        await sio.emit("answer_result", {
            "is_correct": is_correct,
            "score_awarded": score,
            "correct_option_index": question.correct_option_index
        }, to=sid)
    finally:
        db.close()