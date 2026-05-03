import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { useSocketEvent } from "../hooks/useSocket";

export default function QuizRoom() {
    const { sessionId } = useParams();
    const { state } = useLocation();
    const navigate = useNavigate();
    const { socket } = useSocket();
    const [question, setQuestion] = useState(null);
    const [selected, setSelected] = useState(null);
    const [result, setResult] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [status, setStatus] = useState("waiting");
    const [leaderboard, setLeaderboard] = useState([]);
    const [lbCountdown, setLbCountdown] = useState(5);
    const [waitingParticipants, setWaitingParticipants] = useState([]);
    const timerRef = useRef(null);
    const questionStartRef = useRef(null);
    const participant = state?.participant;

    useEffect(() => {
        if (!participant) { navigate("/"); return; }
        if (socket && sessionId) {
            socket.emit("join_session", {
                session_id: sessionId,
                participant_id: participant.id,
            });
        }
    }, [socket, sessionId]);

    useSocketEvent("participant_joined", (data) => {
        setWaitingParticipants(data.participants);
    });

    useSocketEvent("next_question", (data) => {
        const q = data.question;
        setQuestion(q);
        setSelected(null);
        setResult(null);
        setLeaderboard([]);
        setStatus("active");
        questionStartRef.current = Date.now();
        clearInterval(timerRef.current);
        setTimeLeft(q.time_limit_seconds);
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) { clearInterval(timerRef.current); return 0; }
                return prev - 1;
            });
        }, 1000);
    });

    useSocketEvent("answer_result", (data) => {
        setResult(data);
        clearInterval(timerRef.current);
    });

    useSocketEvent("leaderboard", (data) => {
        setLeaderboard(data.leaderboard);
        setStatus("leaderboard");
        setLbCountdown(5);
        clearInterval(timerRef.current);
    });

    useSocketEvent("leaderboard_countdown", (data) => {
        setLbCountdown(data.seconds);
    });

    useSocketEvent("quiz_ended", () => {
        setStatus("ended");
        clearInterval(timerRef.current);
        navigate(`/leaderboard/${sessionId}`, {
            state: { leaderboard, participant, quiz: state?.quiz, final: true },
        });
    });

    const handleAnswer = (optionIndex) => {
        if (selected !== null || timeLeft === 0) return;
        setSelected(optionIndex);
        const responseTime = Date.now() - questionStartRef.current;
        socket?.emit("submit_answer", {
            session_id: sessionId,
            participant_id: participant?.id,
            question_id: question?.id,
            selected_option_index: optionIndex,
            response_time_ms: responseTime,
        });
    };

    const handleSkip = () => {
        socket?.emit("skip_leaderboard", { session_id: sessionId });
    };

    const getOptionStyle = (index) => {
        if (result) {
            if (index === result.correct_option_index)
                return { ...styles.option, background: "#22c55e", color: "#fff", borderColor: "#22c55e" };
            if (index === selected && !result.is_correct)
                return { ...styles.option, background: "#ef4444", color: "#fff", borderColor: "#ef4444" };
        }
        if (selected === index)
            return { ...styles.option, background: "#6c63ff", color: "#fff", borderColor: "#6c63ff" };
        return styles.option;
    };

    const timerColor = timeLeft > 10 ? "#22c55e" : timeLeft > 5 ? "#f59e0b" : "#ef4444";
    const myEntry = leaderboard.find((e) => e.name === participant?.display_name);

    // ── Waiting screen ─────────────────────────────────────────
    if (status === "waiting") return (
        <div style={styles.container}>
            <div style={styles.centerCard}>
                <h1 style={styles.logo}>KUWIZ</h1>
                <p style={styles.waitText}>Waiting for quiz to start...</p>
                <p style={styles.muted}>Hi, {participant?.display_name}! 👋</p>
                <div style={styles.participantsBox}>
                    <p style={styles.participantsTitle}>
                        Participants ({waitingParticipants.length})
                    </p>
                    {waitingParticipants.map((name, i) => (
                        <div key={i} style={styles.participantRow}>
                            👤 {name}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    // ── Leaderboard screen ─────────────────────────────────────
    if (status === "leaderboard") return (
        <div style={styles.container}>
            <div style={styles.lbHeader}>
                <h1 style={styles.logo}>KUWIZ</h1>
                <p style={styles.lbTitle}>Leaderboard</p>
                <div style={styles.lbCountdownBox}>
                    <span style={styles.lbCountdownNum}>{lbCountdown}</span>
                    <span style={styles.lbCountdownLabel}>next question in</span>
                </div>
            </div>
            <div style={styles.lbBody}>
                {myEntry && (
                    <div style={styles.myScore}>
                        <span style={styles.myScoreLabel}>Your score</span>
                        <span style={styles.myScoreNum}>{myEntry.score} pts</span>
                        <span style={styles.myRank}>Rank #{myEntry.rank}</span>
                    </div>
                )}
                <div style={styles.list}>
                    {leaderboard.map((entry, i) => (
                        <div key={i} style={{
                            ...styles.row,
                            background: entry.name === participant?.display_name ? "rgba(108,99,255,0.25)" : "rgba(255,255,255,0.05)",
                            border: entry.name === participant?.display_name ? "2px solid #6c63ff" : "2px solid transparent",
                        }}>
                            <span style={styles.medal}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${entry.rank}`}</span>
                            <span style={styles.name}>{entry.name}</span>
                            <span style={styles.score}>{entry.score} pts</span>
                        </div>
                    ))}
                </div>
                <button style={styles.skipBtn} onClick={handleSkip}>
                    Next Question →
                </button>
            </div>
        </div>
    );

    // ── Active question screen ─────────────────────────────────
    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span style={styles.playerName}>👤 {participant?.display_name}</span>
                <div style={styles.timerBox}>
                    <span style={{ ...styles.timerNum, color: timerColor }}>{timeLeft}</span>
                    <span style={styles.timerLabel}>seconds</span>
                </div>
            </div>

            {question && (
                <div style={styles.body}>
                    <div style={styles.questionCard}>
                        <p style={styles.questionNum}>Question {question.order_index + 1} / {state?.quiz?.questions?.length || "?"}</p>
                        <p style={styles.questionText}>{question.content}</p>
                    </div>
                    <div style={styles.optionsGrid}>
                        {question.options.map((o, i) => (
                            <button
                                key={i}
                                style={getOptionStyle(i)}
                                onClick={() => handleAnswer(i)}
                                disabled={selected !== null}
                            >
                                <span style={styles.optionLetter}>{String.fromCharCode(65 + i)}</span>
                                {o.content}
                            </button>
                        ))}
                    </div>
                    {result && (
                        <div style={{ ...styles.resultBanner, background: result.is_correct ? "#22c55e" : "#ef4444" }}>
                            {result.is_correct ? `✓ Correct! +${result.score_awarded} pts` : "✗ Wrong answer!"}
                        </div>
                    )}
                    {selected === null && timeLeft === 0 && (
                        <div style={{ ...styles.resultBanner, background: "#94a3b8" }}>Time's up!</div>
                    )}
                </div>
            )}
        </div>
    );
}

const styles = {
    container: { minHeight: "100vh", background: "#1e1b4b", display: "flex", flexDirection: "column" },
    centerCard: { margin: "auto", textAlign: "center", color: "#fff", padding: "40px" },
    logo: { fontSize: "36px", fontWeight: "800", color: "#a78bfa", marginBottom: "8px" },
    waitText: { fontSize: "22px", fontWeight: "600", marginBottom: "8px", color: "#fff" },
    muted: { color: "#a78bfa", fontSize: "16px", marginBottom: "0" },
    participantsBox: { background: "rgba(255,255,255,0.08)", borderRadius: "12px", padding: "16px 20px", marginTop: "24px", minWidth: "280px", textAlign: "left" },
    participantsTitle: { color: "#a78bfa", fontSize: "13px", fontWeight: "700", marginBottom: "12px", textTransform: "uppercase" },
    participantRow: { color: "#fff", fontSize: "14px", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" },
    header: { padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.05)" },
    playerName: { color: "#fff", fontWeight: "600" },
    timerBox: { display: "flex", flexDirection: "column", alignItems: "center" },
    timerNum: { fontSize: "32px", fontWeight: "800", lineHeight: 1 },
    timerLabel: { fontSize: "11px", color: "#a78bfa" },
    body: { flex: 1, padding: "24px", maxWidth: "680px", margin: "0 auto", width: "100%" },
    questionCard: { background: "rgba(255,255,255,0.08)", borderRadius: "16px", padding: "24px", marginBottom: "24px" },
    questionNum: { color: "#a78bfa", fontSize: "13px", fontWeight: "600", marginBottom: "8px" },
    questionText: { color: "#fff", fontSize: "20px", fontWeight: "600", lineHeight: "1.4" },
    optionsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" },
    option: { padding: "16px", borderRadius: "12px", background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.15)", color: "#fff", fontSize: "15px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "10px" },
    optionLetter: { fontWeight: "800", fontSize: "18px", color: "#a78bfa" },
    resultBanner: { padding: "16px", borderRadius: "12px", color: "#fff", textAlign: "center", fontSize: "18px", fontWeight: "700" },
    lbHeader: { padding: "24px", textAlign: "center", background: "rgba(255,255,255,0.05)" },
    lbTitle: { color: "#fff", fontSize: "20px", fontWeight: "700", margin: "4px 0" },
    lbCountdownBox: { display: "flex", flexDirection: "column", alignItems: "center", marginTop: "8px" },
    lbCountdownNum: { fontSize: "40px", fontWeight: "800", color: "#f59e0b" },
    lbCountdownLabel: { fontSize: "12px", color: "#a78bfa" },
    lbBody: { flex: 1, padding: "16px 24px 40px", maxWidth: "500px", margin: "0 auto", width: "100%" },
    myScore: { background: "rgba(108,99,255,0.3)", borderRadius: "12px", padding: "16px 20px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" },
    myScoreLabel: { color: "#fff", fontSize: "14px" },
    myScoreNum: { fontSize: "24px", fontWeight: "800", color: "#a78bfa" },
    myRank: { fontSize: "14px", color: "#c4b5fd" },
    list: { display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" },
    row: { display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px", borderRadius: "12px" },
    medal: { fontSize: "22px", width: "36px", textAlign: "center" },
    name: { flex: 1, color: "#fff", fontWeight: "600", fontSize: "15px" },
    score: { color: "#a78bfa", fontWeight: "700", fontSize: "16px" },
    skipBtn: { width: "100%", padding: "14px", borderRadius: "12px", background: "#6c63ff", color: "#fff", border: "none", cursor: "pointer", fontSize: "16px", fontWeight: "700" },
};