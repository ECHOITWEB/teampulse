import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireWorkspace?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireWorkspace = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login page with return URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // TODO: Add workspace check when WorkspaceContext is integrated
  if (requireWorkspace) {
    // Check if user has at least one workspace
    // If not, redirect to workspace creation
  }

  return <>{children}</>;
};

export default ProtectedRoute;