import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import ScrollToTop from './utils/scrollToTop';
import Layout from './components/Layout';
import Home from './pages/Home';
import OKRDashboard from './pages/OKRDashboardEnhanced';
import HQExecutiveDashboard from './pages/HQExecutiveDashboardEnhanced';
import AITools from './pages/AIToolsRedesigned';
import Meetings from './pages/Meetings';
import TeamChat from './pages/TeamChat';
import Profile from './pages/Profile';
import LoginPage from './components/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import WorkspaceProtectedRoute from './components/auth/WorkspaceProtectedRoute';
import WorkspaceSelection from './pages/WorkspaceSelection';
import WorkspaceSettings from './pages/WorkspaceSettingsRedesigned';
import WorkspaceManagement from './pages/WorkspaceManagement';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import InviteAcceptance from './pages/InviteAcceptance';
import ErrorBoundary from './components/common/ErrorBoundary';
import { ToastContainer, useToast } from './components/common/Toast';
import errorLogger from './utils/errorLogger';

function AppWithToasts() {
  const { toasts, remove } = useToast();
  
  // Initialize error logging
  React.useEffect(() => {
    errorLogger.info('Application started', {
      component: 'App',
      action: 'init',
      metadata: {
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }
    });
  }, []);
  
  return (
    <Router>
        <ScrollToTop />
        <AuthProvider>
          <WorkspaceProvider>
            <div className="min-h-screen flex flex-col bg-gray-50">
              <ToastContainer toasts={toasts} onClose={remove} />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/invite/:code" element={<InviteAcceptance />} />
              
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

              {/* Company HQ Dashboard route */}
              <Route path="/company/:companyId/hq" element={
                <ProtectedRoute>
                  <HQExecutiveDashboard />
                </ProtectedRoute>
              } />

              {/* Workspace-scoped routes */}
              <Route path="/workspaces/:workspaceId/*" element={
                <WorkspaceProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="team-chat" element={<TeamChat />} />
                      <Route path="goals" element={<OKRDashboard />} />
                      <Route path="meetings" element={<Meetings />} />
                      <Route path="ai-tools" element={<AITools />} />
                      <Route path="settings" element={<WorkspaceSettings />} />
                      <Route path="profile" element={<Profile />} />
                      <Route path="*" element={<Navigate to="team-chat" replace />} />
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
              <Route path="/goals" element={
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

function App() {
  return (
    <ErrorBoundary>
      <AppWithToasts />
    </ErrorBoundary>
  );
}

export default App;