import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listQuizzes, publishQuiz, deleteQuiz, createSession } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboard() {
    const { admin, logout } = useAuth();
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        listQuizzes()
            .then((res) => setQuizzes(res.data))
            .finally(() => setLoading(false));
    }, []);

    const handlePublish = async (id) => {
        await publishQuiz(id);
        setQuizzes((prev) =>
            prev.map((q) => (q.id === id ? { ...q, status: "published" } : q))
        );
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this quiz?")) return;
        await deleteQuiz(id);
        setQuizzes((prev) => prev.filter((q) => q.id !== id));
    };

    const handleStartSession = async (quizId) => {
        await createSession(quizId);
        navigate(`/admin/session/${quizId}`);
    };

    const statusColor = (status) => {
        if (status === "published") return "#22c55e";
        if (status === "active") return "#f59e0b";
        return "#94a3b8";
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.logo}>KUWIZ</h1>
                <div style={styles.headerRight}>
                    <span style={styles.email}>{admin?.email}</span>
                    <button style={styles.logoutBtn} onClick={logout}>Logout</button>
                </div>
            </div>

            <div style={styles.body}>
                <div style={styles.topBar}>
                    <h2 style={styles.heading}>My Quizzes</h2>
                    <button style={styles.createBtn} onClick={() => navigate("/admin/quiz/new")}>
                        + Create Quiz
                    </button>
                </div>

                {loading ? (
                    <p>Loading...</p>
                ) : quizzes.length === 0 ? (
                    <div style={styles.empty}>
                        <p>No quizzes yet. Create your first one!</p>
                    </div>
                ) : (
                    <div style={styles.grid}>
                        {quizzes.map((quiz) => (
                            <div key={quiz.id} style={styles.card}>
                                <div style={styles.cardTop}>
                                    <h3 style={styles.quizTitle}>{quiz.title}</h3>
                                    <span style={{ ...styles.badge, background: statusColor(quiz.status) }}>
                                        {quiz.status}
                                    </span>
                                </div>
                                <p style={styles.slug}>/{quiz.slug}</p>
                                <div style={styles.actions}>
                                    {quiz.status === "draft" && (
                                        <button style={styles.publishBtn} onClick={() => handlePublish(quiz.id)}>
                                            Publish
                                        </button>
                                    )}
                                    {quiz.status === "published" && (
                                        <button style={styles.startBtn} onClick={() => handleStartSession(quiz.id)}>
                                            Start Session
                                        </button>
                                    )}
                                    <button style={styles.deleteBtn} onClick={() => handleDelete(quiz.id)}>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: { minHeight: "100vh", background: "#f0f2f5" },
    header: { background: "#6c63ff", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" },
    logo: { color: "#fff", fontSize: "24px", fontWeight: "800", margin: 0 },
    headerRight: { display: "flex", alignItems: "center", gap: "16px" },
    email: { color: "#fff", fontSize: "14px" },
    logoutBtn: { padding: "8px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", cursor: "pointer" },
    body: { padding: "32px" },
    topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
    heading: { fontSize: "22px", fontWeight: "700", color: "#1e293b" },
    createBtn: { padding: "10px 20px", borderRadius: "8px", background: "#6c63ff", color: "#fff", border: "none", cursor: "pointer", fontWeight: "600" },
    empty: { textAlign: "center", padding: "60px", color: "#94a3b8" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" },
    card: { background: "#fff", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.08)" },
    cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" },
    quizTitle: { fontSize: "16px", fontWeight: "700", color: "#1e293b", margin: 0 },
    badge: { padding: "4px 10px", borderRadius: "20px", color: "#fff", fontSize: "12px", fontWeight: "600" },
    slug: { color: "#94a3b8", fontSize: "13px", marginBottom: "16px" },
    actions: { display: "flex", gap: "8px" },
    publishBtn: { padding: "8px 14px", borderRadius: "8px", background: "#22c55e", color: "#fff", border: "none", cursor: "pointer", fontSize: "13px" },
    startBtn: { padding: "8px 14px", borderRadius: "8px", background: "#6c63ff", color: "#fff", border: "none", cursor: "pointer", fontSize: "13px" },
    deleteBtn: { padding: "8px 14px", borderRadius: "8px", background: "#fee2e2", color: "#ef4444", border: "none", cursor: "pointer", fontSize: "13px" },
};