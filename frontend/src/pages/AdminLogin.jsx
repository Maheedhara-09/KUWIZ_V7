import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAdmin, getMe, registerAdmin } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function AdminLogin() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            let token;
            if (isRegister) {
                const res = await registerAdmin({ email, password });
                token = res.data.access_token;
            } else {
                const res = await loginAdmin({ username: email, password });
                token = res.data.access_token;
            }
            localStorage.setItem("token", token);
            const meRes = await getMe();
            login(token, meRes.data);
            navigate("/admin/dashboard");
        } catch (err) {
            setError(err.response?.data?.detail || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>KUWIZ</h1>
                <h2 style={styles.subtitle}>{isRegister ? "Create Account" : "Admin Login"}</h2>
                {error && <p style={styles.error}>{error}</p>}
                <form onSubmit={handleSubmit} style={styles.form}>
                    <input
                        style={styles.input}
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        style={styles.input}
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button style={styles.button} type="submit" disabled={loading}>
                        {loading ? "Please wait..." : isRegister ? "Register" : "Login"}
                    </button>
                </form>
                <p style={styles.toggle}>
                    {isRegister ? "Already have an account?" : "No account yet?"}{" "}
                    <span style={styles.link} onClick={() => setIsRegister(!isRegister)}>
                        {isRegister ? "Login" : "Register"}
                    </span>
                </p>
            </div>
        </div>
    );
}

const styles = {
    container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f2f5" },
    card: { background: "#fff", padding: "40px", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", width: "100%", maxWidth: "400px" },
    title: { textAlign: "center", fontSize: "32px", fontWeight: "800", color: "#6c63ff", marginBottom: "4px" },
    subtitle: { textAlign: "center", fontSize: "18px", color: "#333", marginBottom: "24px" },
    form: { display: "flex", flexDirection: "column", gap: "12px" },
    input: { padding: "12px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "15px", outline: "none" },
    button: { padding: "12px", borderRadius: "8px", background: "#6c63ff", color: "#fff", fontSize: "16px", fontWeight: "600", border: "none", cursor: "pointer" },
    error: { color: "red", textAlign: "center", marginBottom: "8px" },
    toggle: { textAlign: "center", marginTop: "16px", color: "#666" },
    link: { color: "#6c63ff", cursor: "pointer", fontWeight: "600" },
};