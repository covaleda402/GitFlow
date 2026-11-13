import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import LoginView from './views/LoginView';
import ProjectView from './views/ProjectView';
import ProfileView from './views/ProfileView';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginView />} />
              <Route path="/profile" element={<ProfileView />} />
              <Route path="/projects/:id" element={<ProjectView />} />
              <Route path="/" element={<Navigate to="/projects/1" replace />} />
              <Route path="*" element={<Navigate to="/projects/1" replace />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
