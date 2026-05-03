import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import QuizBuilder from "./pages/QuizBuilder";
import AdminSession from "./pages/AdminSession";
import JoinQuiz from "./pages/JoinQuiz";
import QuizRoom from "./pages/QuizRoom";
import Leaderboard from "./pages/Leaderboard";

function ProtectedRoute({ children }) {
  const { admin, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!admin) return <Navigate to="/admin/login" />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Admin routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin/dashboard"
        element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>}
      />
      <Route
        path="/admin/quiz/new"
        element={<ProtectedRoute><QuizBuilder /></ProtectedRoute>}
      />
      <Route
        path="/admin/session/:quizId"
        element={<ProtectedRoute><AdminSession /></ProtectedRoute>}
      />

      {/* Participant routes */}
      <Route path="/quiz/:slug" element={<JoinQuiz />} />
      <Route path="/room/:sessionId" element={<QuizRoom />} />
      <Route path="/leaderboard/:sessionId" element={<Leaderboard />} />

      {/* Default */}
      <Route path="/" element={<Navigate to="/admin/login" />} />
    </Routes>
  );
}