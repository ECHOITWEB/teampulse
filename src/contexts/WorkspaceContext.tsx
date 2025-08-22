import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '../config/firebase';

interface Workspace {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  role: 'owner' | 'admin' | 'member';
  member_count?: number;
  created_at: any;
  ai_usage_this_month?: number;
  ai_usage_limit?: number;
}

interface WorkspaceMember {
  user_id: string;
  workspace_id: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'invited' | 'inactive';
  joined_at: any;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: {
    id: string;
    name: string;
    role: 'owner' | 'admin' | 'member';
  } | null;
  loading: boolean;
  error: string | null;
  loadWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (workspace: { id: string; name: string; role: 'owner' | 'admin' | 'member' }) => void;
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
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<{
    id: string;
    name: string;
    role: 'owner' | 'admin' | 'member';
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasWorkspaces, setHasWorkspaces] = useState(false);

  // Load workspaces and set up real-time listeners
  useEffect(() => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setHasWorkspaces(false);
      setIsLoadingInitial(false);
      return;
    }

    let unsubscribes: Unsubscribe[] = [];

    const setupWorkspaceListeners = async () => {
      try {
        // Listen to user's workspace memberships
        const membershipsQuery = query(
          collection(db, 'workspace_members'),
          where('user_id', '==', user.firebase_uid),
          where('status', '==', 'active')
        );

        const unsubscribeMemberships = onSnapshot(membershipsQuery, async (snapshot) => {
          const workspaceIds = snapshot.docs.map(doc => doc.data().workspace_id);
          
          if (workspaceIds.length === 0) {
            setWorkspaces([]);
            setHasWorkspaces(false);
            setCurrentWorkspace(null);
            setIsLoadingInitial(false);
            return;
          }

          setHasWorkspaces(true);

          // Get workspace details
          const workspaceData: Workspace[] = [];
          
          for (const workspaceId of workspaceIds) {
            try {
              const workspaceDoc = await getDoc(doc(db, 'workspaces', workspaceId));
              if (workspaceDoc.exists()) {
                const data = workspaceDoc.data();
                const membership = snapshot.docs.find(
                  m => m.data().workspace_id === workspaceId
                );
                
                // Get member count
                const membersQuery = query(
                  collection(db, 'workspace_members'),
                  where('workspace_id', '==', workspaceId),
                  where('status', '==', 'active')
                );
                const membersSnapshot = await getDocs(membersQuery);
                
                workspaceData.push({
                  id: workspaceDoc.id,
                  name: data.name,
                  description: data.description,
                  owner_id: data.owner_id,
                  plan: data.plan || 'free',
                  role: membership?.data().role || 'member',
                  member_count: membersSnapshot.size,
                  created_at: data.created_at,
                  ai_usage_this_month: data.ai_usage_this_month || 0,
                  ai_usage_limit: data.ai_usage_limit || 10000
                });
              }
            } catch (error) {
              console.error(`Error loading workspace ${workspaceId}:`, error);
            }
          }
          
          setWorkspaces(workspaceData);

          // Check if there's a previously selected workspace in localStorage
          const savedWorkspaceId = localStorage.getItem('selectedWorkspaceId');
          if (savedWorkspaceId && workspaceData.find(w => w.id === savedWorkspaceId)) {
            const selectedWorkspace = workspaceData.find(w => w.id === savedWorkspaceId)!;
            setCurrentWorkspace({
              id: selectedWorkspace.id,
              name: selectedWorkspace.name,
              role: selectedWorkspace.role
            });
          } else if (workspaceData.length === 1) {
            // If user has only one workspace, auto-select it
            setCurrentWorkspace({
              id: workspaceData[0].id,
              name: workspaceData[0].name,
              role: workspaceData[0].role
            });
            localStorage.setItem('selectedWorkspaceId', workspaceData[0].id);
          }

          setIsLoadingInitial(false);
        });

        unsubscribes.push(unsubscribeMemberships);
      } catch (error) {
        console.error('Error setting up workspace listeners:', error);
        setError('Failed to load workspaces');
        setIsLoadingInitial(false);
      }
    };

    setupWorkspaceListeners();

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [user]);

  // Load user's workspaces
  const loadWorkspaces = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get user's workspace memberships
      const membershipsQuery = query(
        collection(db, 'workspace_members'),
        where('user_id', '==', user.firebase_uid),
        where('status', '==', 'active')
      );
      
      const membershipsSnapshot = await getDocs(membershipsQuery);
      const workspaceIds = membershipsSnapshot.docs.map(doc => doc.data().workspace_id);
      
      if (workspaceIds.length === 0) {
        setWorkspaces([]);
        setHasWorkspaces(false);
        setLoading(false);
        return;
      }

      setHasWorkspaces(true);

      // Get workspace details
      const workspaceData: Workspace[] = [];
      
      for (const workspaceId of workspaceIds) {
        const workspaceDoc = await getDoc(doc(db, 'workspaces', workspaceId));
        if (workspaceDoc.exists()) {
          const data = workspaceDoc.data();
          const membership = membershipsSnapshot.docs.find(
            m => m.data().workspace_id === workspaceId
          );
          
          workspaceData.push({
            id: workspaceDoc.id,
            name: data.name,
            description: data.description,
            owner_id: data.owner_id,
            plan: data.plan || 'free',
            role: membership?.data().role || 'member',
            created_at: data.created_at,
            ai_usage_this_month: data.ai_usage_this_month || 0,
            ai_usage_limit: data.ai_usage_limit || 10000
          });
        }
      }
      
      setWorkspaces(workspaceData);
    } catch (error) {
      console.error('Error loading workspaces:', error);
      setError('Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  // Switch to a different workspace
  const switchWorkspace = async (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }
    
    setCurrentWorkspace({
      id: workspace.id,
      name: workspace.name,
      role: workspace.role
    });
    
    localStorage.setItem('selectedWorkspaceId', workspaceId);
  };

  // Update workspace details (only for owners/admins)
  const updateWorkspace = async (id: string, data: any) => {
    const workspace = workspaces.find(w => w.id === id);
    if (!workspace || (workspace.role !== 'owner' && workspace.role !== 'admin')) {
      throw new Error('Insufficient permissions');
    }
    
    try {
      await updateDoc(doc(db, 'workspaces', id), {
        ...data,
        updated_at: new Date()
      });
      
      // Update local state
      setWorkspaces(prev => prev.map(w => 
        w.id === id ? { ...w, ...data } : w
      ));
      
      if (currentWorkspace?.id === id) {
        setCurrentWorkspace(prev => prev ? { ...prev, name: data.name || prev.name } : null);
      }
    } catch (error) {
      console.error('Error updating workspace:', error);
      throw error;
    }
  };

  // Delete workspace (only for owners)
  const deleteWorkspace = async (id: string) => {
    const workspace = workspaces.find(w => w.id === id);
    if (!workspace || workspace.role !== 'owner') {
      throw new Error('Only workspace owners can delete workspaces');
    }
    
    try {
      // Delete workspace document
      await deleteDoc(doc(db, 'workspaces', id));
      
      // Remove from local state
      setWorkspaces(prev => prev.filter(w => w.id !== id));
      
      if (currentWorkspace?.id === id) {
        setCurrentWorkspace(null);
        localStorage.removeItem('selectedWorkspaceId');
      }
    } catch (error) {
      console.error('Error deleting workspace:', error);
      throw error;
    }
  };

  const value: WorkspaceContextType = {
    workspaces,
    currentWorkspace,
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