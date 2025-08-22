import { auth } from '../config/firebase';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

/**
 * Get Firebase ID token for authentication
 */
const getIdToken = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return await user.getIdToken();
};

/**
 * Create workspace using Admin SDK
 */
export const createWorkspaceAdmin = async (workspaceData: {
  companyName: string;
  workspaceName: string;
  userName: string;
  userNickname: string;
  userRole: string;
  teamSize: string;
  billingType: 'workspace' | 'company';
}) => {
  const token = await getIdToken();
  
  const response = await fetch(`${API_BASE_URL}/admin/workspaces`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(workspaceData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create workspace');
  }
  
  return await response.json();
};

/**
 * Delete workspace using Admin SDK (owner only)
 */
export const deleteWorkspaceAdmin = async (workspaceId: string) => {
  const token = await getIdToken();
  
  const response = await fetch(`${API_BASE_URL}/admin/workspaces/${workspaceId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete workspace');
  }
  
  return await response.json();
};

/**
 * Update member role using Admin SDK
 */
export const updateMemberRoleAdmin = async (
  workspaceId: string,
  userId: string,
  role: 'owner' | 'admin' | 'member'
) => {
  const token = await getIdToken();
  
  const response = await fetch(`${API_BASE_URL}/admin/workspaces/${workspaceId}/members/${userId}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ role })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update role');
  }
  
  return await response.json();
};

/**
 * Approve join request using Admin SDK
 */
export const approveJoinRequestAdmin = async (
  workspaceId: string,
  requestId: string
) => {
  const token = await getIdToken();
  
  const response = await fetch(`${API_BASE_URL}/admin/workspaces/${workspaceId}/join-requests/${requestId}/approve`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to approve request');
  }
  
  return await response.json();
};

/**
 * Track AI usage using Admin SDK
 */
export const trackAIUsageAdmin = async (
  workspaceId: string,
  model: string,
  tokensUsed: number,
  operation: string
) => {
  const token = await getIdToken();
  
  const response = await fetch(`${API_BASE_URL}/admin/workspaces/${workspaceId}/ai-usage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ model, tokensUsed, operation })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to track AI usage');
  }
  
  return await response.json();
};