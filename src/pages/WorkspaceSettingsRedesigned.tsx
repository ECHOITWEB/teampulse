import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Users, CreditCard, Shield, 
  Save, Plus, UserX, Crown, UserCheck, User,
  AlertCircle, Loader2, CheckCircle, ChevronRight,
  Mail, Building2, Globe, Lock, UserPlus, Briefcase, Clock, XCircle, TrendingUp
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import { updateMemberRoleAdmin, deleteWorkspaceAdmin } from '../services/adminApi';
import { colors, componentStyles, roleColors, animations, shadows, borderRadius } from '../styles/DesignSystem';
import usageTrackerService from '../services/usageTrackerService';

interface WorkspaceMemberData {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: any;
  last_active?: any;
  ai_usage_this_month?: number;
  totalInputTokens?: number;
  totalOutputTokens?: number;
  totalCostKRW?: number;
  apiCallCount?: number;
}

const WorkspaceSettingsRedesigned: React.FC = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const { currentWorkspace, updateWorkspace, deleteWorkspace } = useWorkspace();
  
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // General settings
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  
  // Members
  const [members, setMembers] = useState<WorkspaceMemberData[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'admin' | 'member'>('member');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [invitations, setInvitations] = useState<any[]>([]);
  const [inviteLink, setInviteLink] = useState('');
  const [showInviteLink, setShowInviteLink] = useState(false);
  
  // Join Requests
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<{ [key: string]: 'member' | 'admin' }>({});
  
  // Billing
  const [workspaceData, setWorkspaceData] = useState<any>(null);

  useEffect(() => {
    const initializeSettings = async () => {
      if (!workspaceId || !user) {
        setLoading(false);
        return;
      }

      // Wait a bit for workspace context to load if not ready yet
      if (!currentWorkspace) {
        const timeout = setTimeout(() => {
          if (!currentWorkspace) {
            setLoading(false);
          }
        }, 2000);
        return () => clearTimeout(timeout);
      }

      // Verify we're on the correct workspace
      if (currentWorkspace && currentWorkspace.id === workspaceId) {
        setWorkspaceName(currentWorkspace.name);
        await Promise.all([
          loadWorkspaceData(),
          loadMembers(),
          checkUserRole(),
          loadJoinRequests(),
          loadInvitations()
        ]);
        setLoading(false);
      }
    };

    initializeSettings();
  }, [currentWorkspace, workspaceId, user]);

  const checkUserRole = async () => {
    if (!workspaceId || !user) return;
    
    try {
      const memberQuery = query(
        collection(db, 'members'),
        where('workspace_id', '==', workspaceId),
        where('user_id', '==', user.firebase_uid),
        where('status', '==', 'active')
      );
      
      const memberSnapshot = await getDocs(memberQuery);
      if (!memberSnapshot.empty) {
        const memberData = memberSnapshot.docs[0].data();
        setCurrentUserRole(memberData.workspace_role || memberData.role || 'member');
        console.log('✅ User role verified:', memberData.workspace_role || memberData.role);
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const loadWorkspaceData = async () => {
    if (!workspaceId) return;
    
    try {
      const workspaceDoc = await getDocs(query(
        collection(db, 'workspaces'),
        where('__name__', '==', workspaceId)
      ));
      
      if (!workspaceDoc.empty) {
        const data = workspaceDoc.docs[0].data();
        setWorkspaceData(data);
        setWorkspaceDescription(data.description || '');
        setIsPublic(data.is_public !== false);
      }
    } catch (error) {
      console.error('Error loading workspace data:', error);
    }
  };

  // Load pending invitations
  const loadInvitations = async () => {
    if (!workspaceId) return;
    
    try {
      const invitationsQuery = query(
        collection(db, 'workspace_invitations'),
        where('workspace_id', '==', workspaceId),
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(invitationsQuery);
      const invites = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setInvitations(invites);
    } catch (error) {
      console.error('Error loading invitations:', error);
    }
  };

  const loadMembers = async () => {
    if (!workspaceId) return;
    
    setLoading(true);
    try {
      // First, get workspace data to find the owner
      const workspaceQuery = query(
        collection(db, 'workspaces'),
        where('__name__', '==', workspaceId)
      );
      const workspaceSnapshot = await getDocs(workspaceQuery);
      let ownerId = '';
      let ownerName = '';
      let ownerEmail = '';
      
      if (!workspaceSnapshot.empty) {
        const workspaceData = workspaceSnapshot.docs[0].data();
        ownerId = workspaceData.owner_id || workspaceData.created_by;
        ownerName = workspaceData.owner_name || workspaceData.created_by_name || '';
        ownerEmail = workspaceData.owner_email || workspaceData.created_by_email || '';
      }
      
      // Then get all members
      const membersQuery = query(
        collection(db, 'members'),
        where('workspace_id', '==', workspaceId),
        where('status', '==', 'active')
      );
      
      const membersSnapshot = await getDocs(membersQuery);
      const memberData: WorkspaceMemberData[] = [];
      
      for (const memberDoc of membersSnapshot.docs) {
        const data = memberDoc.data();
        // Check if this member is the owner
        const isOwner = data.user_id === ownerId;
        // workspace_role 또는 role 필드 사용, owner는 특별 처리
        const memberRole = isOwner ? 'owner' : (data.workspace_role || data.role || 'member');
        // 유효한 role 값으로 변환
        const validRole = ['owner', 'admin', 'member'].includes(memberRole) ? memberRole : 'member';
        
        // Get display name from various possible fields
        let displayName = data.workspace_profile?.display_name || 
                         data.user_name || 
                         data.display_name || 
                         data.name ||
                         (isOwner && ownerName) ||
                         'Unknown';
        
        // Get email from various possible fields
        let email = data.user_email || 
                   data.email || 
                   (isOwner && ownerEmail) ||
                   'unknown@email.com';
        
        // If still Unknown, try to extract from email
        if (displayName === 'Unknown' && email !== 'unknown@email.com') {
          displayName = email.split('@')[0];
        }
        
        memberData.push({
          id: memberDoc.id,
          user_id: data.user_id,
          email: email,
          name: displayName,
          role: validRole,
          joined_at: data.joined_at,
          ai_usage_this_month: data.ai_usage_this_month || 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalCostKRW: 0,
          apiCallCount: 0
        });
      }
      
      // Load usage data for each member
      const membersWithUsage = await Promise.all(
        memberData.map(async (member) => {
          try {
            const monthlyUsage = await usageTrackerService.getUserMonthlyUsage(member.user_id);
            return {
              ...member,
              totalInputTokens: monthlyUsage.totalInputTokens || 0,
              totalOutputTokens: monthlyUsage.totalOutputTokens || 0,
              totalCostKRW: monthlyUsage.totalCostKRW || 0,
              apiCallCount: monthlyUsage.count || 0
            };
          } catch (error) {
            console.error(`Error loading usage for ${member.name}:`, error);
            return member;
          }
        })
      );
      
      setMembers(membersWithUsage.sort((a, b) => {
        const roleOrder = { owner: 0, admin: 1, member: 2 };
        return roleOrder[a.role] - roleOrder[b.role];
      }));
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load join requests
  const loadJoinRequests = async () => {
    if (!workspaceId) return;
    
    setLoadingRequests(true);
    try {
      const requestsQuery = query(
        collection(db, 'workspace_join_requests'),
        where('workspace_id', '==', workspaceId),
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(requestsQuery);
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setJoinRequests(requests);
    } catch (error) {
      console.error('Error loading join requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Approve join request
  const handleApproveRequest = async (requestId: string, request: any) => {
    if (!workspaceId) return;
    
    try {
      const role = selectedRoles[requestId] || 'member';
      
      // Add member to workspace
      await addDoc(collection(db, 'members'), {
        workspace_id: workspaceId,
        user_id: request.user_id,
        workspace_role: role,
        permissions: {
          can_create_objectives: true,
          can_edit_all_objectives: role === 'admin',
          can_delete_objectives: role === 'admin',
          can_manage_members: role === 'admin',
          can_manage_settings: role === 'admin',
          can_view_analytics: role === 'admin'
        },
        status: 'active',
        joined_at: serverTimestamp(),
        last_active: serverTimestamp(),
        workspace_profile: {
          display_name: request.user_nickname || request.user_name,
          department: '',
          position: request.user_role || 'member',
          team: ''
        }
      });
      
      // Update request status
      await updateDoc(doc(db, 'workspace_join_requests', requestId), {
        status: 'approved',
        approved_by: user?.firebase_uid,
        approved_at: serverTimestamp()
      });
      
      // Reload requests and members
      await loadJoinRequests();
      await loadMembers();
      
      // Also update workspace members array
      await updateDoc(doc(db, 'workspaces', workspaceId), {
        members: arrayUnion(request.user_id)
      });
      
      alert(`${request.user_name}님의 가입 요청을 ${role === 'admin' ? '관리자' : '일반 멤버'}로 승인했습니다.`);
    } catch (error) {
      console.error('Error approving request:', error);
      alert('승인 중 오류가 발생했습니다.');
    }
  };

  // Reject join request
  const handleRejectRequest = async (requestId: string) => {
    try {
      // Update request status
      await updateDoc(doc(db, 'workspace_join_requests', requestId), {
        status: 'rejected',
        rejected_by: user?.firebase_uid,
        rejected_at: serverTimestamp()
      });
      
      // Reload requests
      await loadJoinRequests();
      
      alert('가입 요청을 거절했습니다.');
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('거절 중 오류가 발생했습니다.');
    }
  };

  const handleSaveGeneral = async () => {
    if (!workspaceId || !currentWorkspace) return;
    
    setSaving(true);
    try {
      await updateDoc(doc(db, 'workspaces', workspaceId), {
        name: workspaceName,
        description: workspaceDescription,
        is_public: isPublic,
        updated_at: serverTimestamp()
      });
      
      alert('워크스페이스 정보가 업데이트되었습니다.');
    } catch (error) {
      console.error('Error updating workspace:', error);
      alert('업데이트 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleInviteMember = async () => {
    if (!workspaceId || !inviteEmail) return;
    
    setSaving(true);
    try {
      // Generate unique invitation code
      const inviteCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Create invitation document
      await addDoc(collection(db, 'workspace_invitations'), {
        workspace_id: workspaceId,
        workspace_name: workspaceName,
        email: inviteEmail,
        role: inviteRole,
        invited_by: user?.firebase_uid,
        invited_by_name: user?.displayName || user?.email,
        invited_at: serverTimestamp(),
        status: 'pending',
        invite_code: inviteCode,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
      });
      
      // Generate and show invite link
      const link = `${window.location.origin}/invite/${inviteCode}`;
      setInviteLink(link);
      setShowInviteLink(true);
      
      // Load invitations to update the list
      await loadInvitations();
      
      setInviteEmail('');
      alert(`${inviteEmail}님을 초대했습니다. 초대 링크를 공유해주세요.`);
    } catch (error) {
      console.error('Error inviting member:', error);
      alert('초대 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, userId: string, newRole: 'admin' | 'member') => {
    if (!workspaceId) return;
    
    try {
      await updateMemberRoleAdmin(workspaceId, userId, newRole);
      await loadMembers();
      alert('멤버 역할이 변경되었습니다.');
    } catch (error) {
      console.error('Error updating member role:', error);
      alert('역할 변경 중 오류가 발생했습니다.');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('정말로 이 멤버를 제거하시겠습니까?')) return;
    
    try {
      await updateDoc(doc(db, 'members', memberId), {
        status: 'inactive',
        removed_at: serverTimestamp()
      });
      
      await loadMembers();
      alert('멤버가 제거되었습니다.');
    } catch (error) {
      console.error('Error removing member:', error);
      alert('멤버 제거 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!workspaceId || currentUserRole !== 'owner') return;
    
    if (!window.confirm('정말로 이 워크스페이스를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;
    
    try {
      await deleteWorkspaceAdmin(workspaceId);
      navigate('/workspaces');
    } catch (error) {
      console.error('Error deleting workspace:', error);
      alert('워크스페이스 삭제 중 오류가 발생했습니다.');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4" />;
      case 'admin':
        return <UserCheck className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return '소유자';
      case 'admin':
        return '관리자';
      default:
        return '멤버';
    }
  };

  const tabs = [
    { id: 'general', label: '일반', icon: Settings },
    { id: 'members', label: '멤버', icon: Users },
    { id: 'requests', label: '가입 요청', icon: UserCheck, badge: joinRequests.length },
    { id: 'billing', label: '요금제', icon: CreditCard },
    { id: 'security', label: '보안', icon: Shield }
  ];

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8" style={{ minHeight: 'calc(100vh - 8rem)' }}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">설정을 불러오는 중...</h2>
          </div>
        </div>
      </div>
    );
  }

  // 권한 체크
  if (!currentWorkspace || (currentUserRole !== 'owner' && currentUserRole !== 'admin')) {
    return (
      <div className="flex-1 bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8" style={{ minHeight: 'calc(100vh - 8rem)' }}>
        <div className="max-w-4xl mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full mb-6">
              <AlertCircle className="w-10 h-10 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">접근 권한이 없습니다</h2>
            <p className="text-gray-600 mb-8">워크스페이스 설정은 관리자 이상의 권한이 필요합니다.</p>
            
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg mb-8">
              <span className="text-sm text-gray-500">현재 권한:</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                roleColors[currentUserRole]?.bg || 'bg-gray-100'
              } ${
                roleColors[currentUserRole]?.text || 'text-gray-700'
              }`}>
                {getRoleIcon(currentUserRole)}
                {getRoleLabel(currentUserRole)}
              </span>
            </div>
            
            <button
              onClick={() => navigate(`/workspaces/${workspaceId}/team-chat`)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200"
            >
              팀 채팅으로 돌아가기
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gradient-to-br from-blue-50 via-white to-purple-50" style={{ minHeight: 'calc(100vh - 8rem)' }}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">워크스페이스 설정</h1>
              <p className="text-gray-600 mt-2">워크스페이스 정보와 멤버를 관리합니다.</p>
            </div>
            
            {/* Current User Role Badge */}
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shadow-sm ${
                roleColors[currentUserRole]?.bg || 'bg-gray-100'
              } ${
                roleColors[currentUserRole]?.text || 'text-gray-700'
              } border ${
                roleColors[currentUserRole]?.border || 'border-gray-300'
              }`}>
                {getRoleIcon(currentUserRole)}
                <span>{getRoleLabel(currentUserRole)} 권한</span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-6 py-3 font-medium rounded-t-xl transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm border-t border-x border-gray-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600"
                  initial={false}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-b-xl rounded-tr-xl shadow-lg border border-gray-200"
          >
            {activeTab === 'general' && (
              <div className="p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">일반 설정</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      워크스페이스 이름
                    </label>
                    <input
                      type="text"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      className={componentStyles.input.base + ' ' + componentStyles.input.sizes.md}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      설명 (선택사항)
                    </label>
                    <textarea
                      value={workspaceDescription}
                      onChange={(e) => setWorkspaceDescription(e.target.value)}
                      rows={4}
                      className={componentStyles.input.base + ' resize-none'}
                      placeholder="워크스페이스에 대한 간단한 설명을 입력하세요..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      공개 설정
                    </label>
                    <div className="space-y-3">
                      <label className={`relative flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        isPublic 
                          ? 'border-blue-500 bg-blue-50/50' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}>
                        <input
                          type="radio"
                          checked={isPublic}
                          onChange={() => setIsPublic(true)}
                          className="sr-only"
                        />
                        <div className="flex items-start gap-3 w-full">
                          <div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 mt-0.5 transition-all ${
                            isPublic 
                              ? 'border-blue-600 bg-blue-600' 
                              : 'border-gray-400 bg-white'
                          }`}>
                            {isPublic && (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Globe className={`w-4 h-4 ${isPublic ? 'text-blue-600' : 'text-gray-500'}`} />
                              <span className={`font-medium ${isPublic ? 'text-gray-900' : 'text-gray-700'}`}>
                                공개 워크스페이스
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              누구나 검색하고 가입 요청할 수 있습니다.
                            </p>
                          </div>
                        </div>
                      </label>
                      
                      <label className={`relative flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        !isPublic 
                          ? 'border-blue-500 bg-blue-50/50' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}>
                        <input
                          type="radio"
                          checked={!isPublic}
                          onChange={() => setIsPublic(false)}
                          className="sr-only"
                        />
                        <div className="flex items-start gap-3 w-full">
                          <div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 mt-0.5 transition-all ${
                            !isPublic 
                              ? 'border-blue-600 bg-blue-600' 
                              : 'border-gray-400 bg-white'
                          }`}>
                            {!isPublic && (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Lock className={`w-4 h-4 ${!isPublic ? 'text-blue-600' : 'text-gray-500'}`} />
                              <span className={`font-medium ${!isPublic ? 'text-gray-900' : 'text-gray-700'}`}>
                                비공개 워크스페이스
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              초대를 통해서만 가입할 수 있습니다.
                            </p>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end pt-6 border-t">
                    <button
                      onClick={handleSaveGeneral}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          저장 중...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          변경사항 저장
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'members' && (
              <div className="p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">멤버 관리</h2>
                
                {/* Workspace Usage Summary */}
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      <h3 className="text-sm font-semibold text-gray-700">워크스페이스 총 API 사용량 (이번 달)</h3>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-gray-600">총 토큰</p>
                        <p className="text-lg font-bold text-gray-900">
                          {members.reduce((sum, m) => sum + (m.totalInputTokens || 0) + (m.totalOutputTokens || 0), 0) >= 1000000 ?
                            `${(members.reduce((sum, m) => sum + (m.totalInputTokens || 0) + (m.totalOutputTokens || 0), 0) / 1000000).toFixed(1)}M` :
                            `${(members.reduce((sum, m) => sum + (m.totalInputTokens || 0) + (m.totalOutputTokens || 0), 0) / 1000).toFixed(1)}K`
                          }
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">총 비용</p>
                        <p className="text-lg font-bold text-blue-600">
                          ₩{members.reduce((sum, m) => sum + (m.totalCostKRW || 0), 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">API 호출</p>
                        <p className="text-lg font-bold text-gray-900">
                          {members.reduce((sum, m) => sum + (m.apiCallCount || 0), 0).toLocaleString()}회
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Invite Member - Only for owners */}
                {currentUserRole === 'owner' && (
                  <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                    <h3 className="font-medium text-gray-900 mb-4">새 멤버 초대</h3>
                    <div className="flex gap-3 items-center">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="이메일 주소를 입력하세요"
                        className="flex-1 min-w-0 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                        className="w-28 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="member">멤버</option>
                        <option value="admin">관리자</option>
                      </select>
                      <button
                        onClick={handleInviteMember}
                        disabled={!inviteEmail || saving}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        <Plus className="w-4 h-4 flex-shrink-0" />
                        <span>초대</span>
                      </button>
                    </div>
                    
                    {/* Invite Link Modal */}
                    {showInviteLink && (
                      <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600 mb-2">아래 링크를 공유하여 초대하세요:</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            readOnly
                            value={inviteLink}
                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(inviteLink);
                              alert('초대 링크가 복사되었습니다!');
                            }}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                          >
                            복사
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Members List */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Existing Members */}
                    {members.map((member) => (
                      <motion.div 
                        key={member.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-5 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                            member.role === 'owner' ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                            member.role === 'admin' ? 'bg-gradient-to-br from-purple-500 to-indigo-500' :
                            'bg-gradient-to-br from-gray-400 to-gray-500'
                          }`}>
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          
                          {/* Member Info */}
                          <div>
                            <div className="flex items-center gap-3">
                              <p className="font-semibold text-gray-900">{member.name}</p>
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                                roleColors[member.role]?.bg || 'bg-gray-100'
                              } ${
                                roleColors[member.role]?.text || 'text-gray-700'
                              }`}>
                                {getRoleIcon(member.role)}
                                {getRoleLabel(member.role)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">{member.email}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-4">
                          {/* AI Usage */}
                          <div className="text-right">
                            <p className="text-xs text-gray-500">AI 사용량 (이번 달)</p>
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {member.totalInputTokens && member.totalInputTokens > 0 ? 
                                    (member.totalInputTokens >= 1000000 ? 
                                      `${(member.totalInputTokens / 1000000).toFixed(1)}M` : 
                                      `${(member.totalInputTokens / 1000).toFixed(1)}K`
                                    ) : '0'
                                  } 토큰
                                </p>
                                <p className="text-xs text-gray-500">
                                  {member.apiCallCount || 0}회 호출
                                </p>
                              </div>
                              <div className="border-l pl-3">
                                <p className="font-semibold text-blue-600">
                                  ₩{(member.totalCostKRW || 0).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500">
                                  비용
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Role Management - Only for owners */}
                          {currentUserRole === 'owner' && member.role !== 'owner' && (
                            <div className="flex items-center gap-2">
                              <select
                                value={member.role}
                                onChange={(e) => handleUpdateMemberRole(member.id, member.user_id, e.target.value as 'admin' | 'member')}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="admin">관리자</option>
                                <option value="member">멤버</option>
                              </select>
                              
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="멤버 제거"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    
                    {/* Invited Members */}
                    {invitations.length > 0 && (
                      <>
                        <div className="pt-4 mt-4 border-t border-gray-200">
                          <h4 className="text-sm font-medium text-gray-500 mb-3">초대됨</h4>
                        </div>
                        {invitations.map((invitation) => (
                          <motion.div 
                            key={invitation.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center justify-between p-5 bg-gray-50 border border-gray-200 border-dashed rounded-xl"
                          >
                            <div className="flex items-center gap-4">
                              {/* Avatar */}
                              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-300 text-white font-bold text-lg">
                                <Mail className="w-6 h-6" />
                              </div>
                              
                              {/* Invitation Info */}
                              <div>
                                <div className="flex items-center gap-3">
                                  <p className="font-semibold text-gray-900">{invitation.email}</p>
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                    <Clock className="w-3 h-3" />
                                    초대 대기중
                                  </span>
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                                    invitation.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {invitation.role === 'admin' ? '관리자 예정' : '멤버 예정'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 mt-0.5">
                                  {invitation.invited_by_name}님이 초대 • 
                                  {invitation.invited_at?.toDate ? 
                                    new Date(invitation.invited_at.toDate()).toLocaleDateString('ko-KR') : 
                                    '날짜 정보 없음'
                                  }
                                </p>
                              </div>
                            </div>

                            {/* Actions */}
                            {currentUserRole === 'owner' && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    const link = `${window.location.origin}/invite/${invitation.invite_code}`;
                                    navigator.clipboard.writeText(link);
                                    alert('초대 링크가 복사되었습니다!');
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="초대 링크 복사"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (window.confirm('이 초대를 취소하시겠습니까?')) {
                                      try {
                                        await updateDoc(doc(db, 'workspace_invitations', invitation.id), {
                                          status: 'cancelled',
                                          cancelled_at: serverTimestamp()
                                        });
                                        await loadInvitations();
                                        alert('초대가 취소되었습니다.');
                                      } catch (error) {
                                        console.error('Error cancelling invitation:', error);
                                        alert('초대 취소 중 오류가 발생했습니다.');
                                      }
                                    }
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="초대 취소"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">요금제 및 사용량</h2>
                
                <div className="grid gap-6">
                  {/* Current Plan Card */}
                  <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">현재 요금제</h3>
                      <span className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium">
                        {workspaceData?.plan === 'free' ? 'Free' : workspaceData?.plan || 'Free'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-gray-700">최대 10명의 팀원</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-gray-700">월 10,000 AI 토큰</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-gray-700">무제한 채널 및 메시지</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-gray-700">90일 데이터 보관</span>
                      </div>
                    </div>
                  </div>

                  {/* Usage Stats */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">이번 달 사용량</h3>
                    
                    {/* AI Usage */}
                    <div className="p-4 bg-white border border-gray-200 rounded-xl">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-700 font-medium">AI 토큰 사용량</span>
                        <span className="text-gray-900 font-semibold">
                          {workspaceData?.ai_usage_this_month?.toLocaleString() || 0} / {workspaceData?.ai_usage_limit?.toLocaleString() || '10,000'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min(100, ((workspaceData?.ai_usage_this_month || 0) / (workspaceData?.ai_usage_limit || 10000)) * 100)}%` 
                          }}
                        />
                      </div>
                    </div>

                    {/* Member Count */}
                    <div className="p-4 bg-white border border-gray-200 rounded-xl">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-700 font-medium">활성 멤버</span>
                        <span className="text-gray-900 font-semibold">
                          {members.length} / 10
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${(members.length / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Upgrade CTA */}
                  <div className="pt-6 border-t">
                    <button className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]">
                      🚀 Pro 플랜으로 업그레이드
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">보안 설정</h2>
                
                <div className="space-y-6">
                  {/* 2FA Setting */}
                  <div className="p-6 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">2단계 인증</h3>
                        <p className="text-sm text-gray-600">모든 멤버에게 2단계 인증을 요구합니다.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>

                  {/* Data Retention */}
                  <div className="p-6 bg-gray-50 rounded-xl">
                    <h3 className="font-semibold text-gray-900 mb-4">데이터 보관 기간</h3>
                    <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="30">30일</option>
                      <option value="90" selected>90일 (기본)</option>
                      <option value="180">180일</option>
                      <option value="365">365일</option>
                    </select>
                  </div>

                  {/* Danger Zone - Only for owners */}
                  {currentUserRole === 'owner' && (
                    <div className="p-6 bg-red-50 rounded-xl border border-red-200">
                      <h3 className="font-semibold text-red-900 mb-2">위험 구역</h3>
                      <p className="text-sm text-red-700 mb-4">
                        이 작업은 되돌릴 수 없습니다. 신중하게 진행하세요.
                      </p>
                      <button
                        onClick={handleDeleteWorkspace}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        워크스페이스 삭제
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">가입 요청</h2>
                
                {loadingRequests ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : joinRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <UserPlus className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">대기 중인 가입 요청이 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {joinRequests.map((request) => (
                      <motion.div 
                        key={request.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-gray-900">{request.user_name}</h3>
                              {request.user_nickname && (
                                <span className="text-sm text-gray-500">({request.user_nickname})</span>
                              )}
                            </div>
                            
                            <div className="space-y-1 text-sm text-gray-600">
                              <p className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                {request.user_email}
                              </p>
                              {request.user_role && (
                                <p className="flex items-center gap-2">
                                  <Briefcase className="w-4 h-4" />
                                  {request.user_role}
                                </p>
                              )}
                              {request.message && (
                                <p className="mt-2 p-3 bg-gray-50 rounded-lg italic">
                                  "{request.message}"
                                </p>
                              )}
                              <p className="flex items-center gap-2 text-gray-400">
                                <Clock className="w-4 h-4" />
                                {request.requested_at?.toDate ? 
                                  new Date(request.requested_at.toDate()).toLocaleDateString('ko-KR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : 
                                  '날짜 정보 없음'
                                }
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <select
                              value={selectedRoles[request.id] || 'member'}
                              onChange={(e) => setSelectedRoles({...selectedRoles, [request.id]: e.target.value as 'member' | 'admin'})}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="member">일반 멤버</option>
                              <option value="admin">관리자</option>
                            </select>
                            <button
                              onClick={() => handleApproveRequest(request.id, request)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                              승인
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request.id)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              거절
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WorkspaceSettingsRedesigned;