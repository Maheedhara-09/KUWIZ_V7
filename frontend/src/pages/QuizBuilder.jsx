import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createQuiz } from "../services/api";

const emptyOption = () => ({ content: "", option_index: 0 });
const emptyQuestion = () => ({
    content: "",
    time_limit_seconds: 15,
    correct_option_index: 0,
    options: [
        { content: "", option_index: 0 },
        { content: "", option_index: 1 },
        { content: "", option_index: 2 },
        { content: "", option_index: 3 },
    ],
});

export default function QuizBuilder() {
    const navigate = useNavigate();
    const [title, setTitle] = useState("");
    const [questions, setQuestions] = useState([emptyQuestion()]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const updateQuestion = (qi, field, value) => {
        setQuestions((prev) =>
            prev.map((q, i) => (i === qi ? { ...q, [field]: value } : q))
        );
    };

    const updateOption = (qi, oi, value) => {
        setQuestions((prev) =>
            prev.map((q, i) =>
                i === qi
                    ? { ...q, options: q.options.map((o, j) => (j === oi ? { ...o, content: value } : o)) }
                    : q
            )
        );
    };

    const addQuestion = () => setQuestions((prev) => [...prev, emptyQuestion()]);

    const removeQuestion = (qi) =>
        setQuestions((prev) => prev.filter((_, i) => i !== qi));

    const handleSubmit = async () => {
        if (!title.trim()) return setError("Quiz title is required");
        for (let i = 0; i < questions.length; i++) {
            if (!questions[i].content.trim()) return setError(`Question ${i + 1} is empty`);
            for (let j = 0; j < questions[i].options.length; j++) {
                if (!questions[i].options[j].content.trim())
                    return setError(`Question ${i + 1}, Option ${j + 1} is empty`);
            }
        }
        setError("");
        setLoading(true);
        try {
            const payload = {
                title,
                questions: questions.map((q, i) => ({
                    ...q,
                    order_index: i,
                    options: q.options.map((o, j) => ({ ...o, option_index: j })),
                })),
            };
            await createQuiz(payload);
            navigate("/admin/dashboard");
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to create quiz");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button style={styles.backBtn} onClick={() => navigate("/admin/dashboard")}>← Back</button>
                <h1 style={styles.logo}>KUWIZ</h1>
                <button style={styles.saveBtn} onClick={handleSubmit} disabled={loading}>
                    {loading ? "Saving..." : "Save Quiz"}
                </button>
            </div>

            <div style={styles.body}>
                {error && <p style={styles.error}>{error}</p>}
                <input
                    style={styles.titleInput}
                    placeholder="Quiz Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

                {questions.map((q, qi) => (
                    <div key={qi} style={styles.questionCard}>
                        <div style={styles.questionHeader}>
                            <span style={styles.questionNum}>Q{qi + 1}</span>
                            {questions.length > 1 && (
                                <button style={styles.removeBtn} onClick={() => removeQuestion(qi)}>✕</button>
                            )}
                        </div>
                        <input
                            style={styles.input}
                            placeholder="Question"
                            value={q.content}
                            onChange={(e) => updateQuestion(qi, "content", e.target.value)}
                        />
                        <div style={styles.timerRow}>
                            <label style={styles.label}>Time limit:</label>
                            <select
                                style={styles.select}
                                value={q.time_limit_seconds}
                                onChange={(e) => updateQuestion(qi, "time_limit_seconds", Number(e.target.value))}
                            >
                                {[5, 10, 15, 20, 30, 45, 60].map((t) => (
                                    <option key={t} value={t}>{t} seconds</option>
                                ))}
                            </select>
                        </div>
                        <p style={styles.label}>Options — click circle to mark correct answer:</p>
                        {q.options.map((o, oi) => (
                            <div key={oi} style={styles.optionRow}>
                                <div
                                    style={{
                                        ...styles.circle,
                                        background: q.correct_option_index === oi ? "#6c63ff" : "#e2e8f0",
                                    }}
                                    onClick={() => updateQuestion(qi, "correct_option_index", oi)}
                                />
                                <input
                                    style={styles.optionInput}
                                    placeholder={`Option ${oi + 1}`}
                                    value={o.content}
                                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                ))}

                <button style={styles.addBtn} onClick={addQuestion}>+ Add Question</button>
            </div>
        </div>
    );
}

const styles = {
    container: { minHeight: "100vh", background: "#f0f2f5" },
    header: { background: "#6c63ff", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" },
    logo: { color: "#fff", fontSize: "24px", fontWeight: "800", margin: 0 },
    backBtn: { padding: "8px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", cursor: "pointer" },
    saveBtn: { padding: "8px 20px", borderRadius: "8px", background: "#fff", color: "#6c63ff", border: "none", cursor: "pointer", fontWeight: "700" },
    body: { maxWidth: "720px", margin: "0 auto", padding: "32px 16px" },
    error: { color: "red", marginBottom: "12px" },
    titleInput: { width: "100%", padding: "14px", fontSize: "20px", fontWeight: "700", borderRadius: "10px", border: "1px solid #ddd", marginBottom: "24px", boxSizing: "border-box" },
    questionCard: { background: "#fff", borderRadius: "12px", padding: "20px", marginBottom: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.07)" },
    questionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
    questionNum: { fontWeight: "700", color: "#6c63ff", fontSize: "16px" },
    removeBtn: { background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: "6px", padding: "4px 10px", cursor: "pointer" },
    input: { width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "15px", marginBottom: "12px", boxSizing: "border-box" },
    timerRow: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" },
    label: { color: "#64748b", fontSize: "13px", marginBottom: "8px" },
    select: { padding: "8px", borderRadius: "8px", border: "1px solid #ddd" },
    optionRow: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" },
    circle: { width: "20px", height: "20px", borderRadius: "50%", cursor: "pointer", flexShrink: 0 },
    optionInput: { flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px" },
    addBtn: { width: "100%", padding: "14px", borderRadius: "10px", background: "#6c63ff", color: "#fff", border: "none", cursor: "pointer", fontSize: "16px", fontWeight: "600", marginTop: "8px" },
};