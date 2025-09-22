import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import workspaceService, { Workspace as WorkspaceType } from '../services/workspaceService';
import memberService, { Member } from '../services/memberService';
import companyService, { Company } from '../services/companyService';

interface WorkspaceWithRole extends WorkspaceType {
  role: 'owner' | 'admin' | 'member';
  member_count?: number;
  ai_usage_this_month?: number;
  ai_usage_limit?: number;
  pulse_usage_this_month?: number;
  pulse_balance?: number;
}

interface CurrentWorkspace {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  companyId: string;
  companyName: string;
}

interface WorkspaceContextType {
  workspaces: WorkspaceWithRole[];
  currentWorkspace: CurrentWorkspace | null;
  currentCompany: Company | null;
  loading: boolean;
  error: string | null;
  loadWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (workspace: CurrentWorkspace) => void;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  updateWorkspace: (id: string, data: any) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  hasWorkspaces: boolean;
  isLoadingInitial: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<CurrentWorkspace | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasWorkspaces, setHasWorkspaces] = useState(false);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);

  // Load workspaces on user change
  useEffect(() => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setCurrentCompany(null);
      setHasWorkspaces(false);
      setIsLoadingInitial(false);
      return;
    }

    const loadWorkspacesForUser = async () => {
      await loadWorkspaces();
    };
    
    loadWorkspacesForUser();
  }, [user?.firebase_uid]); // Only depend on user ID to avoid unnecessary reloads

  const loadWorkspaces = async () => {
    if (!user) return;
    
    // Prevent duplicate loading
    if (isLoadingWorkspaces) {
      return;
    }
    
    try {
      setIsLoadingWorkspaces(true);
      setLoading(true);
      setError(null);
      
      // Get user's workspaces
      const userWorkspaces = await workspaceService.getUserWorkspaces(user.firebase_uid);
      
      if (userWorkspaces.length === 0) {
        setWorkspaces([]);
        setHasWorkspaces(false);
        setCurrentWorkspace(null);
        setCurrentCompany(null);
        setIsLoadingInitial(false);
        return;
      }

      setHasWorkspaces(true);
      
      // Get user's role for each workspace
      const workspacesWithRoles: WorkspaceWithRole[] = [];
      
      for (const workspace of userWorkspaces) {
        const member = await memberService.getMemberByUserAndWorkspace(
          user.firebase_uid,
          workspace.id
        );
        
        // Only include workspaces where user is an active member
        if (member && member.status === 'active') {
          workspacesWithRoles.push({
            ...workspace,
            role: member.workspace_role,
            member_count: workspace.stats.member_count,
            ai_usage_this_month: 0, // TODO: Get from AI usage service
            ai_usage_limit: 10000,
            pulse_usage_this_month: 0, // TODO: Get from Pulse service
            pulse_balance: 0
          });
        }
      }
      
      setWorkspaces(workspacesWithRoles);

      // Try to get workspace ID from current URL first
      const currentPath = window.location.pathname;
      const urlMatch = currentPath.match(/\/workspaces\/([^\/]+)/);
      const urlWorkspaceId = urlMatch ? urlMatch[1] : null;
      
      // Priority: URL workspace ID > saved workspace ID > first workspace
      let selectedWorkspace;
      if (urlWorkspaceId) {
        selectedWorkspace = workspacesWithRoles.find(w => w.id === urlWorkspaceId);
      }
      
      if (!selectedWorkspace) {
        const savedWorkspaceId = localStorage.getItem('selectedWorkspaceId');
        selectedWorkspace = savedWorkspaceId 
          ? workspacesWithRoles.find(w => w.id === savedWorkspaceId)
          : workspacesWithRoles[0];
      }

      if (selectedWorkspace) {
        // Get company details
        const company = await companyService.getCompany(selectedWorkspace.company_id);
        
        setCurrentWorkspace({
          id: selectedWorkspace.id,
          name: selectedWorkspace.name,
          role: selectedWorkspace.role,
          companyId: selectedWorkspace.company_id,
          companyName: selectedWorkspace.company_name
        });
        
        if (company) {
          setCurrentCompany(company);
        }
        
        localStorage.setItem('selectedWorkspaceId', selectedWorkspace.id);
      }

      setIsLoadingInitial(false);
    } catch (error) {
      console.error('Error loading workspaces:', error);
      setError('Failed to load workspaces');
      setIsLoadingInitial(false);
    } finally {
      setLoading(false);
      setIsLoadingWorkspaces(false);
    }
  };

  const switchWorkspace = async (workspaceId: string) => {
    console.log('switchWorkspace called with:', workspaceId);
    const workspace = workspaces.find(w => w.id === workspaceId);
    
    if (!workspace) {
      console.error('Workspace not found in list:', workspaceId);
      // If not in list but we're loading initial, wait
      if (isLoadingInitial) {
        return;
      }
      // If not loading and not found, redirect to workspace selection
      window.location.href = '/workspaces';
      return;
    }

    // Set workspace immediately to avoid loading state
    setCurrentWorkspace({
      id: workspace.id,
      name: workspace.name,
      role: workspace.role,
      companyId: workspace.company_id,
      companyName: workspace.company_name
    });
    
    localStorage.setItem('selectedWorkspaceId', workspaceId);
    console.log('Workspace switched to:', workspace.name);

    // Load company details and update last active in background (non-blocking)
    Promise.all([
      companyService.getCompany(workspace.company_id).then(company => {
        if (company) setCurrentCompany(company);
      }),
      user ? memberService.updateLastActive(user.firebase_uid, workspaceId) : Promise.resolve()
    ]).catch(error => {
      console.error('Error in switchWorkspace background tasks:', error);
      // Don't revert the workspace switch, just log the error
    });
  };

  const updateWorkspace = async (id: string, data: any) => {
    try {
      await workspaceService.updateWorkspace(id, data);
      await loadWorkspaces(); // Reload to get updated data
    } catch (error) {
      console.error('Error updating workspace:', error);
      setError('Failed to update workspace');
      throw error;
    }
  };

  const deleteWorkspace = async (id: string) => {
    try {
      await workspaceService.deleteWorkspace(id);
      
      // If deleted workspace was current, switch to another
      if (currentWorkspace?.id === id) {
        const remainingWorkspaces = workspaces.filter(w => w.id !== id);
        if (remainingWorkspaces.length > 0) {
          await switchWorkspace(remainingWorkspaces[0].id);
        } else {
          setCurrentWorkspace(null);
          setCurrentCompany(null);
        }
      }
      
      await loadWorkspaces(); // Reload workspaces
    } catch (error) {
      console.error('Error deleting workspace:', error);
      setError('Failed to delete workspace');
      throw error;
    }
  };

  const value: WorkspaceContextType = {
    workspaces,
    currentWorkspace,
    currentCompany,
    loading,
    error,
    loadWorkspaces,
    setCurrentWorkspace,
    switchWorkspace,
    updateWorkspace,
    deleteWorkspace,
    hasWorkspaces,
    isLoadingInitial
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export default WorkspaceContext;