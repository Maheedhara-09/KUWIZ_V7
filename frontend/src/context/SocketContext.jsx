import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const socketRef = useRef(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        socketRef.current = io("https://kuwiz-v7.onrender.com", {
            transports: ["websocket"],
        });

        socketRef.current.on("connect", () => setConnected(true));
        socketRef.current.on("disconnect", () => setConnected(false));

        return () => {
            socketRef.current.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    return useContext(SocketContext);
}