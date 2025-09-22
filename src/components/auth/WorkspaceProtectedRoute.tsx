import React, { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface WorkspaceProtectedRouteProps {
  children: React.ReactNode;
}

const WorkspaceProtectedRoute: React.FC<WorkspaceProtectedRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { currentWorkspace, hasWorkspaces, isLoadingInitial, switchWorkspace, workspaces } = useWorkspace();
  const { workspaceId } = useParams();

  // Debug logs
  console.log('WorkspaceProtectedRoute Debug:', {
    workspaceId,
    currentWorkspaceId: currentWorkspace?.id,
    hasWorkspaces,
    isLoadingInitial,
    workspacesCount: workspaces.length,
    authLoading,
    user: user?.email
  });

  // Try to set workspace from URL if not set or if mismatch
  useEffect(() => {
    if (workspaceId && workspaces.length > 0 && !isLoadingInitial) {
      // If no current workspace or mismatch with URL
      if (!currentWorkspace || currentWorkspace.id !== workspaceId) {
        console.log('Workspace mismatch, attempting to switch to:', workspaceId);
        const workspaceFromUrl = workspaces.find(w => w.id === workspaceId);
        if (workspaceFromUrl) {
          console.log('Found workspace, switching:', workspaceFromUrl.name);
          switchWorkspace(workspaceId);
        } else {
          console.error('Workspace not found in user workspaces:', workspaceId);
        }
      }
    }
  }, [workspaceId, currentWorkspace?.id, workspaces, isLoadingInitial, switchWorkspace]);

  // Clear returnUrl if we successfully reached the desired page
  useEffect(() => {
    if (user && currentWorkspace && workspaceId === currentWorkspace.id) {
      // Successfully loaded the correct workspace, clear any saved return URL
      const savedReturnUrl = localStorage.getItem('returnUrl');
      const currentPath = window.location.pathname;
      
      if (savedReturnUrl && savedReturnUrl === currentPath) {
        console.log('Successfully reached saved URL, clearing returnUrl');
        localStorage.removeItem('returnUrl');
      }
    }
  }, [user, currentWorkspace, workspaceId]);

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
    // Save current location to localStorage for persistence across refresh
    const currentPath = window.location.pathname + window.location.search + window.location.hash;
    if (currentPath !== '/login' && currentPath !== '/') {
      localStorage.setItem('returnUrl', currentPath);
    }
    return <Navigate to="/login" replace />;
  }

  // No workspaces - redirect to workspace selection (but preserve returnUrl)
  // Only redirect if we're sure there are no workspaces (not still loading)
  if (!hasWorkspaces && !isLoadingInitial) {
    // Save the current path as return URL so we can come back after workspace selection
    const currentPath = window.location.pathname + window.location.search + window.location.hash;
    if (currentPath !== '/workspaces' && currentPath !== '/login' && currentPath !== '/') {
      localStorage.setItem('returnUrl', currentPath);
    }
    return <Navigate to="/workspaces" replace />;
  }

  // Check if workspace exists in user's workspaces
  if (workspaceId && workspaces.length > 0) {
    const workspaceExists = workspaces.some(w => w.id === workspaceId);
    if (!workspaceExists) {
      // Workspace doesn't exist or user doesn't have access
      console.error(`User ${user?.email} does not have access to workspace ${workspaceId}`);
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">접근 권한이 없습니다</h2>
            <p className="text-gray-600 mb-6">
              이 워크스페이스에 접근할 권한이 없습니다. 
              관리자에게 초대를 요청하거나 다른 워크스페이스를 선택해주세요.
            </p>
            <button
              onClick={() => window.location.href = '/workspaces'}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              워크스페이스 목록으로 이동
            </button>
          </div>
        </div>
      );
    }
  }

  // If we have a workspaceId in URL but no currentWorkspace yet
  if (workspaceId && !currentWorkspace) {
    // Check if we have workspaces loaded
    if (workspaces.length > 0) {
      // Workspaces are loaded but currentWorkspace is not set
      const targetWorkspace = workspaces.find(w => w.id === workspaceId);
      if (targetWorkspace) {
        // Show loading while waiting for workspace switch to complete
        console.log('Waiting for workspace switch to complete:', workspaceId);
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">워크스페이스 설정 중...</p>
            </div>
          </div>
        );
      } else {
        // Workspace doesn't exist - redirect to workspace selection
        console.error('Workspace not found:', workspaceId);
        return <Navigate to="/workspaces" replace />;
      }
    } else if (!isLoadingInitial) {
      // Workspaces loaded but empty - redirect to workspace selection
      console.error('No workspaces available');
      return <Navigate to="/workspaces" replace />;
    } else {
      // Still loading workspaces
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">워크스페이스 로딩 중...</p>
          </div>
        </div>
      );
    }
  }

  // All checks passed, render children
  return <>{children}</>;
};

export default WorkspaceProtectedRoute;