import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Settings, Users, CreditCard, Shield, AlertTriangle, 
  Save, X, Plus, Mail, UserX, Crown, UserCheck, User,
  Building2, Package, TrendingUp, Clock, AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

interface WorkspaceMemberData {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: any;
  last_active?: any;
  ai_usage_this_month?: number;
}

const WorkspaceSettings: React.FC = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const { currentWorkspace, updateWorkspace, deleteWorkspace } = useWorkspace();
  
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // General settings
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  
  // Members
  const [members, setMembers] = useState<WorkspaceMemberData[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  
  // Billing
  const [workspaceData, setWorkspaceData] = useState<any>(null);

  useEffect(() => {
    if (currentWorkspace) {
      setWorkspaceName(currentWorkspace.name);
      loadWorkspaceData();
      loadMembers();
    }
  }, [currentWorkspace]);

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
      }
    } catch (error) {
      console.error('Error loading workspace data:', error);
    }
  };

  const loadMembers = async () => {
    if (!workspaceId) return;
    
    setLoading(true);
    try {
      const membersQuery = query(
        collection(db, 'workspace_members'),
        where('workspace_id', '==', workspaceId),
        where('status', '==', 'active')
      );
      
      const membersSnapshot = await getDocs(membersQuery);
      const memberData: WorkspaceMemberData[] = [];
      
      for (const memberDoc of membersSnapshot.docs) {
        const data = memberDoc.data();
        // Get user details
        const userQuery = query(
          collection(db, 'users'),
          where('__name__', '==', data.user_id)
        );
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
          const userData = userSnapshot.docs[0].data();
          memberData.push({
            id: memberDoc.id,
            user_id: data.user_id,
            email: userData.email,
            name: userData.display_name || userData.email.split('@')[0],
            role: data.role,
            joined_at: data.joined_at,
            last_active: userData.last_active,
            ai_usage_this_month: userData.ai_usage_this_month || 0
          });
        }
      }
      
      setMembers(memberData.sort((a, b) => {
        const roleOrder = { owner: 0, admin: 1, member: 2 };
        return roleOrder[a.role] - roleOrder[b.role];
      }));
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneral = async () => {
    if (!workspaceId || !currentWorkspace) return;
    
    setSaving(true);
    try {
      await updateWorkspace(workspaceId, {
        name: workspaceName,
        description: workspaceDescription
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
      // Here you would typically send an invitation email
      // For now, we'll just add a pending invitation record
      await addDoc(collection(db, 'workspace_invitations'), {
        workspace_id: workspaceId,
        email: inviteEmail,
        role: inviteRole,
        invited_by: user?.firebase_uid,
        invited_at: serverTimestamp(),
        status: 'pending'
      });
      
      alert(`${inviteEmail}로 초대를 보냈습니다.`);
      setInviteEmail('');
    } catch (error) {
      console.error('Error inviting member:', error);
      alert('초대 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: 'admin' | 'member') => {
    if (!currentWorkspace || currentWorkspace.role !== 'owner') return;
    
    try {
      await updateDoc(doc(db, 'workspace_members', memberId), {
        role: newRole,
        updated_at: serverTimestamp()
      });
      
      await loadMembers();
      alert('멤버 권한이 업데이트되었습니다.');
    } catch (error) {
      console.error('Error updating member role:', error);
      alert('권한 업데이트 중 오류가 발생했습니다.');
    }
  };

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!currentWorkspace || currentWorkspace.role !== 'owner') return;
    
    if (userId === user?.firebase_uid) {
      alert('자기 자신은 제거할 수 없습니다.');
      return;
    }
    
    if (!window.confirm('정말로 이 멤버를 제거하시겠습니까?')) return;
    
    try {
      await updateDoc(doc(db, 'workspace_members', memberId), {
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
    if (!workspaceId || currentWorkspace?.role !== 'owner') return;
    
    if (!window.confirm('정말로 이 워크스페이스를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    
    try {
      await deleteWorkspace(workspaceId);
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
    { id: 'billing', label: '요금제', icon: CreditCard },
    { id: 'security', label: '보안', icon: Shield }
  ];

  if (!currentWorkspace || (currentWorkspace.role !== 'owner' && currentWorkspace.role !== 'admin')) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertCircle className="w-5 h-5" />
            <p>워크스페이스 설정은 관리자 이상의 권한이 필요합니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">워크스페이스 설정</h1>
        <p className="text-gray-600 mt-2">워크스페이스 정보와 멤버를 관리합니다.</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-8 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                initial={false}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {activeTab === 'general' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">일반 설정</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  워크스페이스 이름
                </label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  설명
                </label>
                <textarea
                  value={workspaceDescription}
                  onChange={(e) => setWorkspaceDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <button
                  onClick={handleSaveGeneral}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '변경사항 저장'}
                </button>

                {currentWorkspace.role === 'owner' && (
                  <button
                    onClick={handleDeleteWorkspace}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    워크스페이스 삭제
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">멤버 관리</h2>
            
            {/* Invite Member */}
            {currentWorkspace.role === 'owner' && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">새 멤버 초대</h3>
                <div className="flex gap-3">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="이메일 주소"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="member">멤버</option>
                    <option value="admin">관리자</option>
                  </select>
                  <button
                    onClick={handleInviteMember}
                    disabled={!inviteEmail || saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    초대
                  </button>
                </div>
              </div>
            )}

            {/* Members List */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : (
                members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg">
                        {getRoleIcon(member.role)}
                        <span className="text-sm text-gray-700">{getRoleLabel(member.role)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">AI 사용량</p>
                        <p className="font-medium">{((member.ai_usage_this_month || 0) / 1000).toFixed(1)}K</p>
                      </div>

                      {currentWorkspace.role === 'owner' && member.role !== 'owner' && (
                        <div className="flex items-center gap-2">
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateMemberRole(member.id, e.target.value as 'admin' | 'member')}
                            className="px-3 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="admin">관리자</option>
                            <option value="member">멤버</option>
                          </select>
                          <button
                            onClick={() => handleRemoveMember(member.id, member.user_id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">요금제 및 사용량</h2>
            
            <div className="space-y-6">
              {/* Current Plan */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-blue-900">현재 요금제</h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {workspaceData?.plan === 'free' ? 'Free' : workspaceData?.plan || 'Free'}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-blue-700">
                  <p>• 최대 10명의 팀원</p>
                  <p>• 월 10,000 AI 토큰</p>
                  <p>• 무제한 채널 및 메시지</p>
                  <p>• 90일 데이터 보관</p>
                </div>
              </div>

              {/* Usage Stats */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">이번 달 사용량</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">AI 토큰 사용량</span>
                      <span className="text-gray-900 font-medium">
                        {workspaceData?.ai_usage_this_month?.toLocaleString() || 0} / {workspaceData?.ai_usage_limit?.toLocaleString() || '10,000'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(100, ((workspaceData?.ai_usage_this_month || 0) / (workspaceData?.ai_usage_limit || 10000)) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">활성 멤버</span>
                      <span className="text-gray-900 font-medium">{members.length} / 10</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(members.length / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Upgrade CTA */}
              <div className="pt-4 border-t">
                <button className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200">
                  요금제 업그레이드
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">보안 설정</h2>
            
            <div className="space-y-6">
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-yellow-900">보안 기능 준비 중</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      2단계 인증, SSO, IP 제한 등의 고급 보안 기능이 곧 추가됩니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-not-allowed opacity-50">
                  <input type="checkbox" disabled className="w-4 h-4" />
                  <div>
                    <p className="font-medium text-gray-900">2단계 인증 필수</p>
                    <p className="text-sm text-gray-500">모든 멤버에게 2단계 인증을 요구합니다</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-not-allowed opacity-50">
                  <input type="checkbox" disabled className="w-4 h-4" />
                  <div>
                    <p className="font-medium text-gray-900">IP 주소 제한</p>
                    <p className="text-sm text-gray-500">특정 IP 주소에서만 접근을 허용합니다</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceSettings;