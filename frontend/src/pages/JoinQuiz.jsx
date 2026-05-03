import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getQuizBySlug, getActiveSession, joinSession } from "../services/api";
import { useSocket } from "../context/SocketContext";

export default function JoinQuiz() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { socket } = useSocket();
    const [quiz, setQuiz] = useState(null);
    const [session, setSession] = useState(null);
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getQuizBySlug(slug)
            .then((res) => {
                setQuiz(res.data);
                return getActiveSession(res.data.id);
            })
            .then((res) => setSession(res.data))
            .catch(() => setError("Quiz not found or no active session"));
    }, [slug]);

    const handleJoin = async () => {
        if (!name.trim()) return setError("Please enter your name");
        setLoading(true);
        try {
            const res = await joinSession(session.session_id, { display_name: name });
            const participant = res.data;
            socket?.emit("join_session", {
                session_id: session.session_id,
                participant_id: participant.id,
            });
            navigate(`/room/${session.session_id}`, {
                state: { participant, quiz },
            });
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to join");
        } finally {
            setLoading(false);
        }
    };

    if (error) return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.logo}>KUWIZ</h1>
                <p style={styles.error}>{error}</p>
            </div>
        </div>
    );

    if (!quiz) return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.logo}>KUWIZ</h1>
                <p>Loading...</p>
            </div>
        </div>
    );

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.logo}>KUWIZ</h1>
                <h2 style={styles.quizTitle}>{quiz.title}</h2>
                <p style={styles.subtitle}>Enter your name to join</p>
                <input
                    style={styles.input}
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                />
                {error && <p style={styles.error}>{error}</p>}
                <button style={styles.button} onClick={handleJoin} disabled={loading}>
                    {loading ? "Joining..." : "Join Quiz"}
                </button>
            </div>
        </div>
    );
}

const styles = {
    container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f2f5" },
    card: { background: "#fff", padding: "40px", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", width: "100%", maxWidth: "400px", textAlign: "center" },
    logo: { fontSize: "32px", fontWeight: "800", color: "#6c63ff", marginBottom: "8px" },
    quizTitle: { fontSize: "20px", fontWeight: "700", color: "#1e293b", marginBottom: "8px" },
    subtitle: { color: "#64748b", marginBottom: "24px" },
    input: { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "15px", marginBottom: "12px", boxSizing: "border-box" },
    button: { width: "100%", padding: "12px", borderRadius: "8px", background: "#6c63ff", color: "#fff", fontSize: "16px", fontWeight: "600", border: "none", cursor: "pointer" },
    error: { color: "red", marginBottom: "12px" },
};