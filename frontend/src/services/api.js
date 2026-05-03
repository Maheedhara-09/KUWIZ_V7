import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:8000/api",
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth
export const registerAdmin = (data) => api.post("/auth/register", data);
export const loginAdmin = (data) =>
    api.post("/auth/login", new URLSearchParams(data));
export const getMe = () => api.get("/auth/me");

// Quiz
export const createQuiz = (data) => api.post("/quiz/", data);
export const listQuizzes = () => api.get("/quiz/");
export const getQuiz = (id) => api.get(`/quiz/${id}`);
export const publishQuiz = (id) => api.post(`/quiz/${id}/publish`);
export const deleteQuiz = (id) => api.delete(`/quiz/${id}`);
export const getQuizBySlug = (slug) => api.get(`/quiz/join/${slug}`);

// Session
export const createSession = (quizId) =>
    api.post(`/session/${quizId}/create`);
export const joinSession = (sessionId, data) =>
    api.post(`/session/${sessionId}/join`, data);
export const getSession = (sessionId) => api.get(`/session/${sessionId}`);
export const getActiveSession = (quizId) =>
    api.get(`/session/by-quiz/${quizId}/active`);
export const getLeaderboard = (sessionId) =>
    api.get(`/session/${sessionId}/leaderboard`);

export default api;