import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useSocketEvent } from "../hooks/useSocket";
import { useState, useEffect } from "react";
import { useSocket } from "../context/SocketContext";

export default function Leaderboard() {
    const { sessionId } = useParams();
    const { state } = useLocation();
    const navigate = useNavigate();
    const { socket } = useSocket();
    const [leaderboard, setLeaderboard] = useState(state?.leaderboard || []);
    const [lbCountdown, setLbCountdown] = useState(5);
    const [participants, setParticipants] = useState([]);
    const [isFinal, setIsFinal] = useState(state?.final || false);
    const participant = state?.participant;

    useEffect(() => {
        if (socket && sessionId) {
            socket.emit("join_session", {
                session_id: sessionId,
                participant_id: participant?.id,
            });
        }
    }, [socket, sessionId]);

    useSocketEvent("participant_joined", (data) => {
        setParticipants(data.participants);
    });

    useSocketEvent("leaderboard_countdown", (data) => {
        setLbCountdown(data.seconds);
    });

    useSocketEvent("next_question", (data) => {
        navigate(`/room/${sessionId}`, {
            state: { participant, quiz: state?.quiz },
        });
    });

    useSocketEvent("leaderboard", (data) => {
        setLeaderboard(data.leaderboard);
    });

    useSocketEvent("quiz_ended", () => {
        setIsFinal(true);
    });

    const getMedal = (rank) => {
        if (rank === 1) return "🥇";
        if (rank === 2) return "🥈";
        if (rank === 3) return "🥉";
        return `#${rank}`;
    };

    const myEntry = leaderboard.find((e) => e.name === participant?.display_name);
    const displayParticipants = participants.length > 0 ? participants : leaderboard.map(e => e.name);

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.logo}>KUWIZ</h1>
                <p style={styles.subtitle}>
                    {isFinal ? "🎉 Final Results" : "Leaderboard"}
                </p>
                {!isFinal && lbCountdown > 0 && (
                    <p style={styles.countdown}>Next question in {lbCountdown}s</p>
                )}
                {isFinal && (
                    <p style={styles.finalBadge}>Quiz Completed!</p>
                )}
            </div>

            <div style={styles.body}>
                {/* Participants list */}
                <div style={styles.participantsBox}>
                    <p style={styles.participantsTitle}>
                        Participants ({displayParticipants.length})
                    </p>
                    <div style={styles.participantsList}>
                        {displayParticipants.map((name, i) => (
                            <span key={i} style={styles.participantTag}>👤 {name}</span>
                        ))}
                    </div>
                </div>

                {/* My score */}
                {myEntry && (
                    <div style={styles.myScore}>
                        <span style={styles.myScoreLabel}>Your score</span>
                        <span style={styles.myScoreNum}>{myEntry.score} pts</span>
                        <span style={styles.myRank}>Rank #{myEntry.rank}</span>
                    </div>
                )}

                {/* Leaderboard */}
                <div style={styles.list}>
                    {leaderboard.map((entry, i) => (
                        <div
                            key={i}
                            style={{
                                ...styles.row,
                                background: entry.name === participant?.display_name
                                    ? "rgba(108,99,255,0.2)"
                                    : "rgba(255,255,255,0.05)",
                                border: entry.name === participant?.display_name
                                    ? "2px solid #6c63ff"
                                    : "2px solid transparent",
                            }}
                        >
                            <span style={styles.medal}>{getMedal(entry.rank)}</span>
                            <span style={styles.name}>{entry.name}</span>
                            <span style={styles.score}>{entry.score} pts</span>
                        </div>
                    ))}
                </div>

                {!isFinal && (
                    <p style={styles.waiting}>Next question coming up...</p>
                )}
                {isFinal && (
                    <p style={styles.finalMsg}>Thanks for playing! 🎊</p>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: { minHeight: "100vh", background: "#1e1b4b", display: "flex", flexDirection: "column" },
    header: { padding: "24px 32px", textAlign: "center", background: "rgba(255,255,255,0.05)" },
    logo: { fontSize: "32px", fontWeight: "800", color: "#a78bfa", margin: 0 },
    subtitle: { color: "#fff", fontSize: "18px", fontWeight: "600", marginTop: "4px" },
    countdown: { color: "#f59e0b", fontSize: "28px", fontWeight: "800", marginTop: "4px" },
    finalBadge: { color: "#22c55e", fontSize: "18px", fontWeight: "700", marginTop: "4px" },
    body: { flex: 1, padding: "16px 24px 40px", maxWidth: "500px", margin: "0 auto", width: "100%" },
    participantsBox: { background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "14px 18px", marginBottom: "16px" },
    participantsTitle: { color: "#a78bfa", fontSize: "13px", fontWeight: "700", marginBottom: "10px", textTransform: "uppercase" },
    participantsList: { display: "flex", flexWrap: "wrap", gap: "8px" },
    participantTag: { background: "rgba(108,99,255,0.2)", color: "#fff", padding: "4px 10px", borderRadius: "20px", fontSize: "13px" },
    myScore: { background: "rgba(108,99,255,0.3)", borderRadius: "12px", padding: "16px 20px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" },
    myScoreLabel: { color: "#fff", fontSize: "14px" },
    myScoreNum: { fontSize: "24px", fontWeight: "800", color: "#a78bfa" },
    myRank: { fontSize: "14px", color: "#c4b5fd" },
    list: { display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" },
    row: { display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px", borderRadius: "12px" },
    medal: { fontSize: "22px", width: "36px", textAlign: "center" },
    name: { flex: 1, color: "#fff", fontWeight: "600", fontSize: "15px" },
    score: { color: "#a78bfa", fontWeight: "700", fontSize: "16px" },
    waiting: { textAlign: "center", color: "#6c63ff", fontSize: "14px" },
    finalMsg: { textAlign: "center", color: "#22c55e", fontSize: "18px", fontWeight: "700" },
};