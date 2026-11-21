import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    // Detect if running locally or deployed on production / Vercel
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    const envSocketUrl = import.meta.env.VITE_SOCKET_URL;
    const socketPointsToLocalhost = envSocketUrl && 
      (envSocketUrl.includes('localhost') || envSocketUrl.includes('127.0.0.1'));

    // If deployed in production/Vercel and socket URL is missing or points to localhost:5000,
    // operate safely in serverless mode to eliminate net::ERR_CONNECTION_REFUSED in console.
    if (!isLocalhost && (!envSocketUrl || socketPointsToLocalhost)) {
      console.log('[Socket] Modo Serverless en Vercel activo. Telemetría sincronizada vía HTTP y eventos locales.');
      setIsConnected(true);
      return;
    }

    const socketUrl = envSocketUrl || (isLocalhost ? 'http://localhost:5000' : window.location.origin);

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 1,
      reconnectionDelay: 5000,
      timeout: 3000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected to GitFlow server:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
    });

    socket.on('room_users', (users) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinProject = (projectId) => {
    if (socketRef.current) {
      socketRef.current.emit('join_project', {
        projectId,
        user: user ? { id: user.id, username: user.username, name: user.name, avatar_url: user.avatar_url } : null
      });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        onlineUsers,
        joinProject
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
