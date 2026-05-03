import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database import engine, Base
from app.socket_events import sio
from app.routers import auth, quiz, session

# Create all tables
Base.metadata.create_all(bind=engine)

# FastAPI app
app = FastAPI(title="KUWIZ API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router,    prefix="/api/auth",    tags=["Auth"])
app.include_router(quiz.router,    prefix="/api/quiz",    tags=["Quiz"])
app.include_router(session.router, prefix="/api/session", tags=["Session"])

@app.get("/")
def root():
    return {"message": "KUWIZ API running"}

# Wrap FastAPI with Socket.io
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)