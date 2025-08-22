import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import ScrollToTop from './utils/scrollToTop';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/DashboardRedesigned';
import TeamChat from './pages/TeamChat';
import GoalsDashboard from './pages/GoalsDashboard';
import GoalsAnalytics from './pages/GoalsAnalytics';
import TaskManagement from './pages/TaskManagementFirebase';
import AITools from './pages/AITools';
import Meetings from './pages/Meetings';
import LoginPage from './components/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import WorkspaceProtectedRoute from './components/auth/WorkspaceProtectedRoute';
import WorkspaceSelection from './pages/WorkspaceSelection';
import WorkspaceSettings from './pages/WorkspaceSettingsRedesigned';
import WorkspaceManagement from './pages/WorkspaceManagement';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';

function App() {
  console.log('App component rendering');
  
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <WorkspaceProvider>
          <div className="min-h-screen flex flex-col bg-gray-50">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<LoginPage />} />
              
              {/* Admin routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              
              {/* Workspace selection route */}
              <Route path="/workspaces" element={
                <ProtectedRoute>
                  <WorkspaceSelection />
                </ProtectedRoute>
              } />
              
              {/* Workspace management route */}
              <Route path="/workspace-management" element={
                <ProtectedRoute>
                  <WorkspaceManagement />
                </ProtectedRoute>
              } />

              {/* Workspace-scoped routes */}
              <Route path="/workspaces/:workspaceId/*" element={
                <WorkspaceProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="team-chat" element={<TeamChat />} />
                      <Route path="goals" element={<GoalsDashboard />} />
                      <Route path="goals-analytics" element={<GoalsAnalytics />} />
                      <Route path="tasks" element={<TaskManagement />} />
                      <Route path="ai-tools" element={<AITools />} />
                      <Route path="meetings" element={<Meetings />} />
                      <Route path="settings" element={<WorkspaceSettings />} />
                      <Route path="*" element={<Navigate to="dashboard" replace />} />
                    </Routes>
                  </Layout>
                </WorkspaceProtectedRoute>
              } />

              {/* Legacy routes - redirect to workspace selection */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Navigate to="/workspaces" replace />
                </ProtectedRoute>
              } />
              <Route path="/team-chat" element={
                <ProtectedRoute>
                  <Navigate to="/workspaces" replace />
                </ProtectedRoute>
              } />
              <Route path="/goals" element={
                <ProtectedRoute>
                  <Navigate to="/workspaces" replace />
                </ProtectedRoute>
              } />
              <Route path="/tasks" element={
                <ProtectedRoute>
                  <Navigate to="/workspaces" replace />
                </ProtectedRoute>
              } />
              <Route path="/ai-tools" element={
                <ProtectedRoute>
                  <Navigate to="/workspaces" replace />
                </ProtectedRoute>
              } />
              <Route path="/meetings" element={
                <ProtectedRoute>
                  <Navigate to="/workspaces" replace />
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </WorkspaceProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;