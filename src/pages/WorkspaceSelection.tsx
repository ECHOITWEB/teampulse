import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Plus, Users, ArrowRight, Building2, Sparkles, 
  CheckCircle, Shield, TrendingUp, Search, Send,
  Loader2, AlertCircle, UserPlus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, getDoc, serverTimestamp, arrayUnion, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import WorkspaceCreator from '../modules/onboarding/components/WorkspaceCreator';
import { approveJoinRequestAdmin } from '../services/adminApi';

interface WorkspaceData {
  id: string;
  name: string;
  fullName: string;
  companyName: string;
  company_id: string;
  company_name: string;
  description?: string;
  memberCount: number;
  role: string;
  createdAt: any;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  aiUsage?: number;
  pulseUsage?: number;
  pulseAvailable?: number;
  isPublic?: boolean;
  allowJoinRequests?: boolean;
}

interface JoinRequest {
  id: string;
  workspaceId: string;
  workspaceName: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: any;
}

const WorkspaceSelection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { setCurrentWorkspace } = useWorkspace();
  const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([]);
  const [searchResults, setSearchResults] = useState<WorkspaceData[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'my' | 'search' | 'create'>('my');
  const [requestingJoin, setRequestingJoin] = useState<string | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);

  // Main effect for initial load
  useEffect(() => {
    // Check if we have a saved return URL and should redirect back
    const savedReturnUrl = localStorage.getItem('returnUrl');
    if (savedReturnUrl && savedReturnUrl !== '/workspaces' && savedReturnUrl !== '/login') {
      // Check if the URL contains a workspace ID
      const workspaceMatch = savedReturnUrl.match(/\/workspaces\/([^\/]+)/);
      if (workspaceMatch) {
        // Navigate back to the saved URL
        console.log('Found saved returnUrl, navigating back to:', savedReturnUrl);
        navigate(savedReturnUrl);
        // Don't remove returnUrl yet - let the actual page handle it
        return;
      }
    }
    
    if (user) {
      loadUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.firebase_uid]);
  
  // Reload workspaces when page becomes visible (e.g., after navigation)
  useEffect(() => {
    const handleFocus = () => {
      if (user && location.pathname === '/workspaces') {
        loadUserWorkspaces();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load pending approvals only when workspaces actually change
  useEffect(() => {
    if (workspaces.length > 0 && user) {
      loadPendingApprovals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaces]);

  const loadUserData = async () => {
    if (!user) {
      console.log('🔴 No user found, cannot load data');
      setLoading(false);
      return;
    }
    
    console.log('🔵 Loading data for user:', user.firebase_uid, user.email);
    
    try {
      // Load user's workspaces
      await loadUserWorkspaces();
      
      // Load pending join requests
      await loadJoinRequests();
      
      // Check if user has no workspaces and show appropriate tab
      const membershipsQuery = query(
        collection(db, 'members'),
        where('user_id', '==', user.firebase_uid),
        where('status', '==', 'active')
      );
      const membershipsSnapshot = await getDocs(membershipsQuery);
      
      console.log('🟢 User has', membershipsSnapshot.size, 'workspace memberships');
      
      if (membershipsSnapshot.empty) {
        console.log('🟡 No workspaces found, showing search tab');
        setActiveTab('search'); // Show search tab if no workspaces
      }
    } catch (error) {
      console.error('🔴 Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserWorkspaces = async () => {
    if (!user) {
      console.log('🔴 No user in loadUserWorkspaces');
      return;
    }
    
    // Prevent duplicate loading
    if (isLoadingWorkspaces) {
      console.log('🟡 Already loading workspaces, skipping...');
      return;
    }
    
    setIsLoadingWorkspaces(true);
    console.log('🔵 Searching for workspaces for user:', user.firebase_uid);
    
    try {
      // Get user's workspace memberships
      const membershipsQuery = query(
        collection(db, 'members'),
        where('user_id', '==', user.firebase_uid),
        where('status', '==', 'active')
      );
      
      console.log('🟡 Executing workspace members query...');
      const membershipsSnapshot = await getDocs(membershipsQuery);
      console.log('🟢 Found', membershipsSnapshot.size, 'membership records');
      
      membershipsSnapshot.docs.forEach(doc => {
        console.log('📝 Membership:', doc.id, doc.data());
      });
      
      const workspaceIds = membershipsSnapshot.docs.map(doc => doc.data().workspace_id);
      
      if (workspaceIds.length === 0) {
        console.log('🟡 No workspace IDs found, setting empty array');
        setWorkspaces([]);
        return;
      }
      
      console.log('🟢 Found workspace IDs:', workspaceIds);

      // Get workspace details
      console.log('🟡 Fetching workspace details for IDs:', workspaceIds);
      const workspacesQuery = query(
        collection(db, 'workspaces'),
        where('__name__', 'in', workspaceIds)
      );
      
      const workspacesSnapshot = await getDocs(workspacesQuery);
      console.log('🟢 Found', workspacesSnapshot.size, 'workspaces');
      const workspaceData: WorkspaceData[] = [];
      
      for (const doc of workspacesSnapshot.docs) {
        const data = doc.data();
        const membership = membershipsSnapshot.docs.find(
          m => m.data().workspace_id === doc.id
        );
        
        // Get real member count
        const membersQuery = query(
          collection(db, 'members'),
          where('workspace_id', '==', doc.id),
          where('status', '==', 'active')
        );
        const membersSnapshot = await getDocs(membersQuery);
        const actualMemberCount = membersSnapshot.size || 1;
        
        // Get real AI usage (this month)
        const aiUsageThisMonth = data.ai_usage_this_month || 0;
        
        // Get Pulse usage data
        const pulseUsageThisMonth = data.pulse_usage_this_month || 0;
        const pulseBalance = data.pulse_balance || 0;
        
        workspaceData.push({
          id: doc.id,
          name: data.name,
          fullName: data.full_name || `${data.company_name}-${data.name}`,
          companyName: data.company_name || '',
          company_id: data.company_id || '',
          company_name: data.company_name || '',
          description: data.description,
          memberCount: actualMemberCount,
          role: membership?.data().workspace_role || 'member',
          createdAt: data.created_at,
          plan: data.plan || 'free',
          aiUsage: aiUsageThisMonth,
          pulseUsage: pulseUsageThisMonth,
          pulseAvailable: pulseBalance,
          isPublic: data.is_public !== false,
          allowJoinRequests: data.allow_join_requests !== false
        });
      }
      
      console.log('🟢 Setting workspaces:', workspaceData);
      setWorkspaces(workspaceData.sort((a, b) => 
        b.createdAt?.seconds - a.createdAt?.seconds
      ));
    } catch (error) {
      console.error('🔴 Error loading workspaces:', error);
    } finally {
      setIsLoadingWorkspaces(false);
    }
  };

  const loadJoinRequests = async () => {
    if (!user) return;
    
    try {
      const requestsQuery = query(
        collection(db, 'workspace_join_requests'),
        where('user_id', '==', user.firebase_uid),
        where('status', '==', 'pending')
      );
      
      const requestsSnapshot = await getDocs(requestsQuery);
      const requests: JoinRequest[] = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as JoinRequest));
      
      setJoinRequests(requests);
    } catch (error) {
      console.error('Error loading join requests:', error);
    }
  };

  const loadPendingApprovals = async () => {
    if (!user || workspaces.length === 0) return;
    
    try {
      // Get workspaces where user is owner or admin
      const adminWorkspaces = workspaces.filter(
        ws => ws.role === 'owner' || ws.role === 'admin'
      );
      
      if (adminWorkspaces.length === 0) return;
      
      const approvals: any[] = [];
      
      for (const workspace of adminWorkspaces) {
        const requestsQuery = query(
          collection(db, 'workspace_join_requests'),
          where('workspace_id', '==', workspace.id),
          where('status', '==', 'pending')
        );
        
        const requestsSnapshot = await getDocs(requestsQuery);
        
        requestsSnapshot.docs.forEach(doc => {
          approvals.push({
            id: doc.id,
            workspaceName: workspace.name,
            workspaceId: workspace.id,
            ...doc.data()
          });
        });
      }
      
      setPendingApprovals(approvals);
    } catch (error) {
      console.error('Error loading pending approvals:', error);
    }
  };

  const handleApproveRequest = async (requestId: string, workspaceId: string, userId: string, userName: string, userEmail: string) => {
    try {
      // 1. 요청 상태를 승인으로 변경
      await updateDoc(doc(db, 'workspace_join_requests', requestId), {
        status: 'approved',
        approved_at: serverTimestamp(),
        approved_by: user?.firebase_uid
      });

      // 2. 멤버로 추가
      const memberRef = doc(db, 'members', `${workspaceId}_${userId}`);
      await setDoc(memberRef, {
        user_id: userId,
        workspace_id: workspaceId,
        workspace_role: 'member',
        joined_at: serverTimestamp(),
        status: 'active',
        workspace_profile: {
          display_name: userName,
          email: userEmail
        }
      });

      // 3. 워크스페이스의 members 배열에 추가
      const workspaceRef = doc(db, 'workspaces', workspaceId);
      await updateDoc(workspaceRef, {
        members: arrayUnion(userId)
      });
      
      alert('가입 요청이 승인되었습니다.');
      await loadPendingApprovals();
    } catch (error: any) {
      console.error('Error approving request:', error);
      alert(`요청 승인 중 오류가 발생했습니다.\n\n${error.message || error}`);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'workspace_join_requests', requestId), {
        status: 'rejected',
        rejected_by: user?.firebase_uid,
        rejected_at: serverTimestamp()
      });
      
      alert('가입 요청이 거절되었습니다.');
      await loadPendingApprovals();
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('요청 거절 중 오류가 발생했습니다.');
    }
  };

  const searchWorkspaces = async () => {
    if (!searchTerm.trim()) return;
    
    setSearching(true);
    try {
      // Search by company name or workspace name
      const workspacesRef = collection(db, 'workspaces');
      const companyQuery = query(
        workspacesRef,
        where('company_name', '>=', searchTerm),
        where('company_name', '<=', searchTerm + '\uf8ff')
      );
      
      const companySnapshot = await getDocs(companyQuery);
      const results: WorkspaceData[] = [];
      
      for (const doc of companySnapshot.docs) {
        const data = doc.data();
        
        // Check if user is already a member
        const memberQuery = query(
          collection(db, 'members'),
          where('workspace_id', '==', doc.id),
          where('user_id', '==', user?.firebase_uid)
        );
        const memberSnapshot = await getDocs(memberQuery);
        const isMember = !memberSnapshot.empty;
        
        // Get member count
        const membersQuery = query(
          collection(db, 'members'),
          where('workspace_id', '==', doc.id),
          where('status', '==', 'active')
        );
        const membersSnapshot = await getDocs(membersQuery);
        
        // Check if user has pending request
        const requestQuery = query(
          collection(db, 'workspace_join_requests'),
          where('workspace_id', '==', doc.id),
          where('user_id', '==', user?.firebase_uid),
          where('status', '==', 'pending')
        );
        const requestSnapshot = await getDocs(requestQuery);
        const hasPendingRequest = !requestSnapshot.empty;
        
        if (!isMember && (data.is_public !== false || data.allow_join_requests !== false)) {
          results.push({
            id: doc.id,
            name: data.name,
            fullName: data.full_name || `${data.company_name}-${data.name}`,
            companyName: data.company_name || '',
            company_id: data.company_id || '',
            company_name: data.company_name || '',
            description: data.description,
            memberCount: membersSnapshot.size,
            role: hasPendingRequest ? 'pending' : 'none',
            createdAt: data.created_at,
            plan: data.plan || 'free',
            isPublic: data.is_public !== false,
            allowJoinRequests: data.allow_join_requests !== false
          });
        }
      }
      
      // Also search by workspace name
      const nameQuery = query(
        workspacesRef,
        where('name', '>=', searchTerm),
        where('name', '<=', searchTerm + '\uf8ff')
      );
      
      const nameSnapshot = await getDocs(nameQuery);
      for (const doc of nameSnapshot.docs) {
        if (!results.find(r => r.id === doc.id)) {
          const data = doc.data();
          
          // Similar checks as above
          const memberQuery = query(
            collection(db, 'members'),
            where('workspace_id', '==', doc.id),
            where('user_id', '==', user?.firebase_uid)
          );
          const memberSnapshot = await getDocs(memberQuery);
          const isMember = !memberSnapshot.empty;
          
          const membersQuery = query(
            collection(db, 'members'),
            where('workspace_id', '==', doc.id),
            where('status', '==', 'active')
          );
          const membersSnapshot = await getDocs(membersQuery);
          
          if (!isMember && (data.is_public !== false || data.allow_join_requests !== false)) {
            results.push({
              id: doc.id,
              name: data.name,
              fullName: data.full_name || `${data.company_name}-${data.name}`,
              companyName: data.company_name || '',
              company_id: data.company_id || '',
              company_name: data.company_name || '',
              description: data.description,
              memberCount: membersSnapshot.size,
              role: 'none',
              createdAt: data.created_at,
              plan: data.plan || 'free',
              isPublic: data.is_public !== false,
              allowJoinRequests: data.allow_join_requests !== false
            });
          }
        }
      }
      
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching workspaces:', error);
    } finally {
      setSearching(false);
    }
  };

  const requestJoinWorkspace = async (workspace: WorkspaceData) => {
    if (!user) return;
    
    setRequestingJoin(workspace.id);
    try {
      // Check if already has a pending request
      const existingRequestQuery = query(
        collection(db, 'workspace_join_requests'),
        where('workspace_id', '==', workspace.id),
        where('user_id', '==', user.firebase_uid),
        where('status', '==', 'pending')
      );
      
      const existingRequests = await getDocs(existingRequestQuery);
      if (!existingRequests.empty) {
        alert('이미 가입 요청을 보내셨습니다. 관리자 승인을 기다려주세요.');
        setRequestingJoin(null);
        return;
      }
      
      // Always send join request (for both public and private workspaces)
      await addDoc(collection(db, 'workspace_join_requests'), {
        workspace_id: workspace.id,
        workspace_name: workspace.fullName || workspace.name,
        user_id: user.firebase_uid,
        user_name: user.displayName || user.name || user.email?.split('@')[0] || 'User',
        user_email: user.email || 'unknown@email.com',
        user_nickname: user.displayName || user.name || user.email?.split('@')[0] || 'User',
        status: 'pending',
        requested_at: serverTimestamp(),
        isPublicWorkspace: workspace.isPublic || false
      });
      
      alert('가입 요청이 전송되었습니다. 관리자 승인을 기다려주세요.');
      await loadJoinRequests();
      await searchWorkspaces(); // Refresh search results to show pending status
    } catch (error) {
      console.error('Error requesting to join workspace:', error);
      alert('가입 요청 중 오류가 발생했습니다.');
    } finally {
      setRequestingJoin(null);
    }
  };

  const selectWorkspace = async (workspace: WorkspaceData) => {
    // Show loading state immediately
    setLoading(true);
    
    try {
      setCurrentWorkspace({
        id: workspace.id,
        name: workspace.name,
        role: workspace.role as 'owner' | 'admin' | 'member',
        companyId: workspace.company_id,
        companyName: workspace.company_name
      });
      
      // Store selection in localStorage for persistence
      localStorage.setItem('selectedWorkspaceId', workspace.id);
      
      // Navigate immediately without waiting
      navigate(`/workspaces/${workspace.id}/team-chat`);
    } catch (error) {
      console.error('Error selecting workspace:', error);
      setLoading(false);
    }
  };

  const getPlanBadge = (plan: string) => {
    const badges = {
      free: { color: 'bg-gray-100 text-gray-700', label: 'Free' },
      starter: { color: 'bg-blue-100 text-blue-700', label: 'Starter' },
      pro: { color: 'bg-purple-100 text-purple-700', label: 'Pro' },
      enterprise: { color: 'bg-gradient-to-r from-amber-100 to-orange-100 text-orange-700', label: 'Enterprise' }
    };
    return badges[plan as keyof typeof badges] || badges.free;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">워크스페이스 로딩 중...</h2>
          <p className="text-gray-600">잠시만 기다려주세요</p>
        </motion.div>
      </div>
    );
  }

  // Show WorkspaceCreator if creating new workspace
  if (showCreator) {
    return <WorkspaceCreator />;
  }

  // Removed console.log to prevent render spam

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* User Status Bar */}
      {user && (
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">로그인 중: <strong>{user.email}</strong></span>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="text-sm text-red-600 hover:text-red-700"
            >
              로그아웃
            </button>
          </div>
        </div>
      )}
      
      <div className="max-w-6xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              워크스페이스
            </span>
          </h1>
          <p className="text-xl text-gray-600">
            {workspaces.length === 0 
              ? '워크스페이스를 검색하여 가입하거나 새로 만드세요'
              : '작업할 워크스페이스를 선택하세요'}
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white rounded-lg shadow-md p-1">
            <button
              onClick={() => setActiveTab('my')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                activeTab === 'my'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              내 워크스페이스 {workspaces.length > 0 && `(${workspaces.length})`}
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                activeTab === 'search'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              워크스페이스 검색
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                activeTab === 'create'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              새로 만들기
            </button>
          </div>
        </div>

        {/* My Workspaces Tab */}
        {activeTab === 'my' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {workspaces.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  아직 가입한 워크스페이스가 없습니다
                </h3>
                <p className="text-gray-600 mb-6">
                  워크스페이스를 검색하여 가입하거나 새로 만들어보세요
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setActiveTab('search')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    워크스페이스 검색
                  </button>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    새로 만들기
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workspaces.map((workspace, index) => (
                  <motion.div
                    key={workspace.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => selectWorkspace(workspace)}
                    className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 cursor-pointer hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPlanBadge(workspace.plan).color}`}>
                        {getPlanBadge(workspace.plan).label}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">{workspace.name}</h3>
                    <p className="text-sm text-gray-500 mb-3">{workspace.companyName}</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="w-4 h-4 mr-2" />
                        <span>{workspace.memberCount || 1}명의 멤버</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Shield className="w-4 h-4 mr-2" />
                        <span className="capitalize">{workspace.role === 'owner' ? '소유자' : workspace.role === 'admin' ? '관리자' : '멤버'}</span>
                      </div>
                      {workspace.pulseUsage !== undefined && (
                        <div className="flex items-center text-sm text-gray-500">
                          <TrendingUp className="w-4 h-4 mr-2" />
                          <span>Pulse 사용량: {workspace.pulseUsage.toLocaleString()} Pulse</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center text-blue-600 font-medium">
                      <span>워크스페이스 입장</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Pending Join Requests */}
            {joinRequests.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">대기 중인 가입 요청</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  {joinRequests.map(request => (
                    <div key={request.id} className="flex items-center justify-between py-2">
                      <div>
                        <span className="font-medium text-gray-900">{request.workspaceName}</span>
                        <span className="ml-2 text-sm text-gray-500">
                          {new Date(request.requestedAt?.toDate()).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                        승인 대기중
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Approvals for Admin/Owner */}
            {pendingApprovals.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">승인 대기 중인 요청 (관리자)</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  {pendingApprovals.map(approval => (
                    <div key={approval.id} className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {approval.user_nickname || approval.user_name} ({approval.user_email && approval.user_email !== 'unknown@email.com' ? approval.user_email : '이메일 미제공'})
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            워크스페이스: {approval.workspaceName}
                          </div>
                          {approval.message && (
                            <div className="text-sm text-gray-600 mt-2 italic">
                              "{approval.message}"
                            </div>
                          )}
                          <div className="text-xs text-gray-400 mt-2">
                            {new Date(approval.requested_at?.toDate()).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleApproveRequest(
                              approval.id,
                              approval.workspace_id,
                              approval.user_id,
                              approval.user_name,
                              approval.user_email
                            )}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => handleRejectRequest(approval.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                          >
                            거절
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchWorkspaces()}
                    placeholder="회사명 또는 워크스페이스명으로 검색..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={searchWorkspaces}
                  disabled={searching || !searchTerm.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {searching ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      검색
                    </>
                  )}
                </button>
              </div>
            </div>

            {searchResults.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((workspace, index) => (
                  <motion.div
                    key={workspace.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      {workspace.isPublic ? (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          공개
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                          비공개
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">{workspace.name}</h3>
                    <p className="text-sm text-gray-500 mb-3">{workspace.companyName}</p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="w-4 h-4 mr-2" />
                        <span>{workspace.memberCount || 1}명의 멤버</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded text-xs ${getPlanBadge(workspace.plan).color}`}>
                          {getPlanBadge(workspace.plan).label}
                        </span>
                      </div>
                    </div>

                    {workspace.role === 'pending' ? (
                      <button
                        disabled
                        className="w-full py-2 bg-yellow-100 text-yellow-800 rounded-lg font-medium"
                      >
                        가입 요청 대기중
                      </button>
                    ) : (
                      <button
                        onClick={() => requestJoinWorkspace(workspace)}
                        disabled={requestingJoin === workspace.id}
                        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
                      >
                        {requestingJoin === workspace.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : workspace.isPublic ? (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            바로 가입하기
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            가입 요청하기
                          </>
                        )}
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : searchTerm && !searching ? (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  검색 결과가 없습니다
                </h3>
                <p className="text-gray-600">
                  다른 검색어로 시도하거나 새 워크스페이스를 만들어보세요
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  워크스페이스 검색
                </h3>
                <p className="text-gray-600">
                  회사명 또는 워크스페이스명으로 검색하여 가입할 수 있습니다
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Create Tab */}
        {activeTab === 'create' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl shadow-lg border border-gray-200 p-8"
          >
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="inline-flex p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg mb-4">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">새 워크스페이스 만들기</h2>
                <p className="text-gray-600">팀을 위한 새로운 협업 공간을 만들어보세요</p>
              </div>

              <div className="text-center">
                <button
                  onClick={() => setShowCreator(true)}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  <span className="flex items-center justify-center">
                    <Sparkles className="w-5 h-5 mr-2" />
                    워크스페이스 생성 시작하기
                  </span>
                </button>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  워크스페이스 생성 과정
                </h3>
                <ul className="space-y-1 text-sm text-blue-700">
                  <li>• 회사 정보 및 워크스페이스 이름 설정</li>
                  <li>• 본인 프로필 및 역할 설정</li>
                  <li>• 팀 규모 선택</li>
                  <li>• 과금 방식 선택 (워크스페이스별 / 회사 통합)</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceSelection;