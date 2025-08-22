import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface WorkspaceProtectedRouteProps {
  children: React.ReactNode;
}

const WorkspaceProtectedRoute: React.FC<WorkspaceProtectedRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { currentWorkspace, hasWorkspaces, isLoadingInitial } = useWorkspace();
  const { workspaceId } = useParams();

  // Show loading state while checking auth and workspace status
  if (authLoading || isLoadingInitial) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // No workspaces - redirect to workspace selection
  if (!hasWorkspaces) {
    return <Navigate to="/workspaces" replace />;
  }

  // No current workspace selected - redirect to workspace selection
  if (!currentWorkspace) {
    return <Navigate to="/workspaces" replace />;
  }

  // Workspace ID in URL doesn't match current workspace
  if (workspaceId && workspaceId !== currentWorkspace.id) {
    return <Navigate to="/workspaces" replace />;
  }

  return <>{children}</>;
};

export default WorkspaceProtectedRoute;