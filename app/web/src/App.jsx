import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { UIFeedbackProvider } from './context/UIFeedbackContext';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import ProjectView from './views/ProjectView';
import ProfileView from './views/ProfileView';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <UIFeedbackProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginView />} />
                <Route path="/dashboard" element={<DashboardView />} />
                <Route path="/profile" element={<ProfileView />} />
                <Route path="/projects/:id" element={<ProjectView />} />
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </BrowserRouter>
          </UIFeedbackProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
