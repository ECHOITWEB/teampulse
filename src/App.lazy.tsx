import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './components/auth/LoginPage';

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const TeamChat = lazy(() => import('./pages/TeamChat'));
const GoalsDashboard = lazy(() => import('./pages/GoalsDashboard'));
const TaskManagement = lazy(() => import('./pages/TaskManagementFirebase'));
const AITools = lazy(() => import('./pages/AITools'));
const Meetings = lazy(() => import('./pages/Meetings'));

// Loading component
const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-gray-600">로딩 중...</p>
    </div>
  </div>
);

function App() {
  console.log('App component rendering');
  
  return (
    <Router>
      <AuthProvider>
        <WorkspaceProvider>
          <div className="min-h-screen flex flex-col bg-gray-50">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              
              {/* Protected routes with header and footer */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <>
                      <Header />
                      <main className="flex-1 bg-white">
                        <Suspense fallback={<PageLoader />}>
                          <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/team-chat" element={<TeamChat />} />
                            <Route path="/goals" element={<GoalsDashboard />} />
                            <Route path="/tasks" element={<TaskManagement />} />
                            <Route path="/ai-tools" element={<AITools />} />
                            <Route path="/meetings" element={<Meetings />} />
                            <Route path="/workspaces/:slug/*" element={
                              <Routes>
                                <Route path="dashboard" element={<Dashboard />} />
                                <Route path="*" element={<Navigate to="dashboard" replace />} />
                              </Routes>
                            } />
                          </Routes>
                        </Suspense>
                      </main>
                      <Footer />
                    </>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </WorkspaceProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;