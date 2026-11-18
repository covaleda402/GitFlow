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
    // Detect if running on Vercel Serverless (which doesn't host persistent WebSockets)
    const isVercel = typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app');

    if (isVercel && !import.meta.env.VITE_SOCKET_URL) {
      console.log('[Socket] Serverless mode active on Vercel. Telemetría y eventos locales gestionados.');
      setIsConnected(true);
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

    const socket = io(socketUrl, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 3,
      reconnectionDelay: 2000
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
