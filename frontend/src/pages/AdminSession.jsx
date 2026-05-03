import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getQuiz, getActiveSession } from "../services/api";
import { useSocket } from "../context/SocketContext";
import { useSocketEvent } from "../hooks/useSocket";

export default function AdminSession() {
    const { quizId } = useParams();
    const navigate = useNavigate();
    const { socket } = useSocket();
    const [quiz, setQuiz] = useState(null);
    const [session, setSession] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [status, setStatus] = useState("waiting");
    const [lbCountdown, setLbCountdown] = useState(5);

    useEffect(() => {
        getQuiz(quizId).then((res) => setQuiz(res.data));
        getActiveSession(quizId).then((res) => {
            setSession(res.data);
            socket?.emit("join_session", { session_id: res.data.session_id });
        });
    }, [quizId, socket]);

    useSocketEvent("participant_joined", (data) => {
        setParticipants(data.participants);
    });

    useSocketEvent("next_question", (data) => {
        setCurrentQuestion(data.question);
        setStatus("active");
        setLeaderboard([]);
    });

    useSocketEvent("leaderboard", (data) => {
        setLeaderboard(data.leaderboard);
        setStatus("leaderboard");
        setLbCountdown(5);
        setCurrentQuestion(null);
    });

    useSocketEvent("leaderboard_countdown", (data) => {
        setLbCountdown(data.seconds);
    });

    useSocketEvent("quiz_ended", () => {
        setStatus("ended");
        setCurrentQuestion(null);
    });

    const handleStart = () => {
        socket?.emit("start_quiz", { session_id: session?.session_id });
    };

    const handleSkip = () => {
        socket?.emit("skip_leaderboard", { session_id: session?.session_id });
    };

    const handleEndQuiz = () => {
        if (!confirm("End this quiz session?")) return;
        socket?.emit("end_quiz", { session_id: session?.session_id });
    };

    const handleQuit = () => {
        navigate("/admin/dashboard");
    };

    if (!quiz || !session) return (
        <div style={styles.loading}>Loading session...</div>
    );

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button style={styles.backBtn} onClick={handleQuit}>← Dashboard</button>
                <h1 style={styles.logo}>KUWIZ — Admin</h1>
                <span style={styles.quizTitle}>{quiz.title}</span>
            </div>

            <div style={styles.body}>
                {/* Left panel */}
                <div style={styles.left}>
                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>Join Link</h3>
                        <p style={styles.link}>http://localhost:5173/quiz/{quiz.slug}</p>
                        <h3 style={styles.cardTitle} onClick={() => navigator.clipboard.writeText(`http://localhost:5173/quiz/${quiz.slug}`)} style={{ ...styles.cardTitle, cursor: "pointer" }}>📋 Copy Link</h3>
                    </div>

                    <div style={styles.card}>
                        {quiz.qr_code_url && (
                            <>
                                <h3 style={styles.cardTitle}>QR Code</h3>
                                <img src={quiz.qr_code_url} alt="QR Code" style={styles.qr} />
                            </>
                        )}
                    </div>

                    <div style={styles.card}>
                        <h3 style={styles.cardTitle}>Participants ({participants.length})</h3>
                        {participants.length === 0 ? (
                            <p style={styles.muted}>Waiting for participants...</p>
                        ) : (
                            participants.map((name, i) => (
                                <div key={i} style={styles.participant}>👤 {name}</div>
                            ))
                        )}
                    </div>

                    <div style={styles.actions}>
                        {status === "waiting" && (
                            <button style={styles.startBtn} onClick={handleStart}>
                                ▶ Start Quiz
                            </button>
                        )}
                        {status === "leaderboard" && (
                            <button style={styles.skipBtn} onClick={handleSkip}>
                                Next Question →
                            </button>
                        )}
                        {(status === "active" || status === "leaderboard") && (
                            <button style={styles.endBtn} onClick={handleEndQuiz}>
                                ⏹ End Quiz
                            </button>
                        )}
                        {status === "ended" && (
                            <button style={styles.quitBtn} onClick={handleQuit}>
                                ✓ Quit Session
                            </button>
                        )}
                    </div>
                </div>

                {/* Right panel */}
                <div style={styles.right}>
                    {status === "waiting" && (
                        <div style={styles.waitBox}>
                            <p style={styles.waitText}>Waiting to start...</p>
                            <p style={styles.muted}>Click "Start Quiz" when all participants have joined</p>
                        </div>
                    )}

                    {currentQuestion && status === "active" && (
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>
                                Question {currentQuestion.order_index + 1} of {quiz.questions.length}
                            </h3>
                            <p style={styles.questionText}>{currentQuestion.content}</p>
                            <div style={styles.options}>
                                {currentQuestion.options.map((o, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            ...styles.option,
                                            background: i === currentQuestion.correct_option_index ? "#dcfce7" : "#f8fafc",
                                            borderColor: i === currentQuestion.correct_option_index ? "#22c55e" : "#e2e8f0",
                                        }}
                                    >
                                        <span style={styles.optionLetter}>{String.fromCharCode(65 + i)}</span>
                                        {o.content}
                                        {i === currentQuestion.correct_option_index && (
                                            <span style={styles.correctTag}>✓ Correct</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <p style={styles.timer}>⏱ {currentQuestion.time_limit_seconds}s per question</p>
                        </div>
                    )}

                    {status === "leaderboard" && leaderboard.length > 0 && (
                        <div style={styles.card}>
                            <div style={styles.lbHeader}>
                                <h3 style={styles.cardTitle}>Leaderboard</h3>
                                <span style={styles.lbCountdown}>Next in {lbCountdown}s</span>
                            </div>
                            {leaderboard.map((entry, i) => (
                                <div key={i} style={styles.leaderRow}>
                                    <span style={styles.rank}>
                                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${entry.rank}`}
                                    </span>
                                    <span style={styles.name}>{entry.name}</span>
                                    <span style={styles.score}>{entry.score} pts</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {status === "ended" && (
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>🎉 Quiz Ended</h3>
                            <p style={styles.muted}>Final Leaderboard:</p>
                            {leaderboard.map((entry, i) => (
                                <div key={i} style={styles.leaderRow}>
                                    <span style={styles.rank}>
                                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${entry.rank}`}
                                    </span>
                                    <span style={styles.name}>{entry.name}</span>
                                    <span style={styles.score}>{entry.score} pts</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: { minHeight: "100vh", background: "#f0f2f5" },
    loading: { padding: "40px", textAlign: "center" },
    header: { background: "#6c63ff", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" },
    logo: { color: "#fff", fontSize: "20px", fontWeight: "800", margin: 0 },
    quizTitle: { color: "#fff", fontSize: "16px" },
    backBtn: { padding: "8px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", cursor: "pointer" },
    body: { display: "flex", gap: "24px", padding: "24px" },
    left: { width: "280px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "16px" },
    right: { flex: 1, display: "flex", flexDirection: "column", gap: "16px" },
    card: { background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.07)" },
    cardTitle: { fontSize: "13px", fontWeight: "700", color: "#6c63ff", marginBottom: "10px", textTransform: "uppercase", margin: 0 },
    link: { fontSize: "12px", color: "#334155", wordBreak: "break-all", background: "#f8fafc", padding: "8px", borderRadius: "6px", marginTop: "8px" },
    qr: { width: "100%", borderRadius: "8px", marginTop: "8px" },
    muted: { color: "#94a3b8", fontSize: "13px" },
    participant: { padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: "14px" },
    actions: { display: "flex", flexDirection: "column", gap: "10px" },
    startBtn: { width: "100%", padding: "14px", borderRadius: "10px", background: "#22c55e", color: "#fff", border: "none", cursor: "pointer", fontSize: "16px", fontWeight: "700" },
    skipBtn: { width: "100%", padding: "12px", borderRadius: "10px", background: "#6c63ff", color: "#fff", border: "none", cursor: "pointer", fontSize: "15px", fontWeight: "600" },
    endBtn: { width: "100%", padding: "12px", borderRadius: "10px", background: "#fee2e2", color: "#ef4444", border: "none", cursor: "pointer", fontSize: "15px", fontWeight: "600" },
    quitBtn: { width: "100%", padding: "14px", borderRadius: "10px", background: "#1e293b", color: "#fff", border: "none", cursor: "pointer", fontSize: "16px", fontWeight: "700" },
    waitBox: { background: "#fff", borderRadius: "12px", padding: "40px", textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.07)" },
    waitText: { fontSize: "20px", fontWeight: "600", color: "#334155", marginBottom: "8px" },
    questionText: { fontSize: "18px", fontWeight: "600", color: "#1e293b", margin: "12px 0 16px" },
    options: { display: "flex", flexDirection: "column", gap: "8px" },
    option: { padding: "10px 14px", borderRadius: "8px", border: "1px solid", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" },
    optionLetter: { fontWeight: "700", color: "#6c63ff", width: "20px" },
    correctTag: { marginLeft: "auto", color: "#22c55e", fontSize: "12px", fontWeight: "700" },
    timer: { marginTop: "12px", color: "#f59e0b", fontWeight: "700", fontSize: "13px" },
    lbHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
    lbCountdown: { background: "#f59e0b", color: "#fff", padding: "4px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: "700" },
    leaderRow: { display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: "1px solid #f1f5f9" },
    rank: { fontSize: "20px", width: "32px" },
    name: { flex: 1, fontSize: "14px", color: "#1e293b" },
    score: { fontWeight: "700", color: "#22c55e" },
};