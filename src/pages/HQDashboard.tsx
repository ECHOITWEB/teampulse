import React, { useState, useEffect } from 'react';
import {
  Building2, Users, Target, CreditCard, Settings,
  Shield, Plus, Check, X, AlertCircle, TrendingUp,
  Package, UserCheck, UserX, Clock, DollarSign
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import hqService, { CompanyHQ, HQMember, WorkspaceJoinRequest, CompanyObjective } from '../services/hqService';
import workspaceService from '../services/workspaceService';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

const HQDashboard: React.FC = () => {
  const { user } = useAuth();
  const { currentWorkspace, currentCompany } = useWorkspace();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [hqData, setHQData] = useState<CompanyHQ | null>(null);
  const [hqMembers, setHQMembers] = useState<HQMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<WorkspaceJoinRequest[]>([]);
  const [companyObjectives, setCompanyObjectives] = useState<CompanyObjective[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'workspaces' | 'members' | 'objectives' | 'billing' | 'settings'>('overview');
  const [isHQMember, setIsHQMember] = useState(false);
  const [realtimeMemberCount, setRealtimeMemberCount] = useState(0);
  const [realtimeWorkspaceCount, setRealtimeWorkspaceCount] = useState(0);

  useEffect(() => {
    loadHQData();
  }, [currentCompany]);

  // Real-time listeners for member count and workspace count
  useEffect(() => {
    if (!currentCompany) return;

    // Real-time workspace count listener
    const workspacesQuery = query(
      collection(db, 'workspaces'),
      where('company_id', '==', currentCompany.id)
    );
    
    const unsubscribeWorkspaces = onSnapshot(workspacesQuery, (snapshot) => {
      const activeWorkspaces = snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.status !== 'deleted' && data.status !== 'archived';
      });
      setRealtimeWorkspaceCount(activeWorkspaces.length);
    });

    // Real-time member count listener - count all unique members across all workspaces
    const membersQuery = query(
      collection(db, 'members'),
      where('company_id', '==', currentCompany.id)
    );
    
    const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
      const uniqueMembers = new Set();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'active') {
          uniqueMembers.add(data.user_id);
        }
      });
      setRealtimeMemberCount(uniqueMembers.size);
    });

    return () => {
      unsubscribeWorkspaces();
      unsubscribeMembers();
    };
  }, [currentCompany]);

  const loadHQData = async () => {
    if (!currentCompany || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Check if user is HQ member
      const memberStatus = await hqService.isHQMember(user.firebase_uid, currentCompany.id);
      setIsHQMember(memberStatus);

      if (!memberStatus) {
        setLoading(false);
        return;
      }

      // Initialize HQ if needed
      let hq = await hqService.getCompanyHQ(currentCompany.id);
      if (!hq) {
        const hqId = await hqService.initializeHQ(
          currentCompany.id,
          currentCompany.name_ko || currentCompany.name_en,
          user.firebase_uid
        );
        hq = await hqService.getCompanyHQ(currentCompany.id);
      }
      setHQData(hq);

      // Load related data
      const [members, requests, objectives, companyWorkspaces] = await Promise.all([
        hqService.getHQMembers(currentCompany.id),
        loadAllJoinRequests(),
        hqService.getCompanyObjectives(currentCompany.id),
        workspaceService.getCompanyWorkspaces(currentCompany.id)
      ]);

      setHQMembers(members);
      setJoinRequests(requests);
      setCompanyObjectives(objectives);
      setWorkspaces(companyWorkspaces);
      
      // Initialize real-time counts if not already set
      if (realtimeWorkspaceCount === 0 && companyWorkspaces.length > 0) {
        setRealtimeWorkspaceCount(companyWorkspaces.length);
      }
      if (realtimeMemberCount === 0 && hq?.usage.current_total_members) {
        setRealtimeMemberCount(hq.usage.current_total_members);
      }

      // Update usage stats
      await hqService.updateUsageStats(currentCompany.id);
    } catch (error) {
      console.error('Error loading HQ data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllJoinRequests = async (): Promise<WorkspaceJoinRequest[]> => {
    if (!currentCompany) return [];
    
    // Get all workspaces for this company
    const companyWorkspaces = await workspaceService.getCompanyWorkspaces(currentCompany.id);
    
    // Get join requests for each workspace
    const allRequests: WorkspaceJoinRequest[] = [];
    for (const workspace of companyWorkspaces) {
      const requests = await hqService.getPendingJoinRequests(workspace.id);
      allRequests.push(...requests);
    }
    
    return allRequests;
  };

  const handleJoinRequest = async (requestId: string, decision: 'approved' | 'rejected', reason?: string) => {
    if (!user) return;

    try {
      await hqService.reviewJoinRequest(requestId, decision, user.firebase_uid, reason);
      await loadHQData();
    } catch (error) {
      console.error('Error handling join request:', error);
    }
  };

  const updateBillingPlan = async (plan: 'free' | 'starter' | 'professional' | 'enterprise') => {
    if (!hqData) return;

    try {
      await hqService.updateBillingPlan(hqData.id!, plan, hqData.billing.billing_cycle);
      await loadHQData();
    } catch (error) {
      console.error('Error updating billing plan:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isHQMember) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-center mb-4">접근 권한 없음</h2>
          <p className="text-gray-600 text-center">
            HQ 대시보드는 회사 관리자만 접근할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Building2 className="w-8 h-8 text-primary mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {currentCompany?.name_ko || currentCompany?.name_en} HQ
                </h1>
                <p className="text-sm text-gray-600">회사 통합 관리 대시보드</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">현재 플랜</p>
                <p className="text-lg font-semibold text-primary capitalize">
                  {hqData?.billing.plan || 'Free'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-8 border-t -mb-px">
            {[
              { id: 'overview', label: '개요', icon: TrendingUp },
              { id: 'workspaces', label: '워크스페이스', icon: Package },
              { id: 'members', label: '멤버 관리', icon: Users },
              { id: 'objectives', label: '회사 목표', icon: Target },
              { id: 'billing', label: '비용 관리', icon: CreditCard },
              { id: 'settings', label: '설정', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <Package className="w-8 h-8 text-blue-500" />
                <div className="text-right">
                  <span className="text-2xl font-bold transition-all duration-500 ease-in-out">
                    {realtimeWorkspaceCount}
                  </span>
                  {realtimeWorkspaceCount > 0 && (
                    <div className="absolute top-1 right-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              </div>
              <h3 className="text-gray-600 text-sm">활성 워크스페이스</h3>
              <p className="text-xs text-gray-500 mt-1">
                최대 {hqData?.limits.max_workspaces === -1 ? '무제한' : hqData?.limits.max_workspaces}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-8 h-8 text-green-500" />
                <div className="text-right">
                  <span className="text-2xl font-bold transition-all duration-500 ease-in-out">
                    {realtimeMemberCount}
                  </span>
                  {realtimeMemberCount > 0 && (
                    <div className="absolute top-1 right-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>
              </div>
              <h3 className="text-gray-600 text-sm">전체 멤버</h3>
              <p className="text-xs text-gray-500 mt-1">
                최대 {hqData?.limits.max_total_members === -1 ? '무제한' : hqData?.limits.max_total_members}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <Target className="w-8 h-8 text-purple-500" />
                <span className="text-2xl font-bold">{hqData?.usage.active_objectives || 0}</span>
              </div>
              <h3 className="text-gray-600 text-sm">활성 목표</h3>
              <p className="text-xs text-gray-500 mt-1">회사 전체</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="w-8 h-8 text-yellow-500" />
                <span className="text-2xl font-bold">${hqData?.billing.total_monthly_cost || 0}</span>
              </div>
              <h3 className="text-gray-600 text-sm">월 비용</h3>
              <p className="text-xs text-gray-500 mt-1">{hqData?.billing.billing_cycle === 'yearly' ? '연간 결제' : '월간 결제'}</p>
            </div>
          </div>
        )}

        {/* Workspaces Tab */}
        {activeTab === 'workspaces' && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold">워크스페이스 관리</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">
                <Plus className="w-4 h-4" />
                새 워크스페이스
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      워크스페이스
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      멤버
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      타입
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      생성일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {workspaces.map((workspace) => (
                    <tr key={workspace.id}>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{workspace.name}</p>
                          <p className="text-sm text-gray-500">{workspace.description}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {workspace.stats?.member_count || 0} 명
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                          {workspace.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {workspace.created_at?.toDate?.().toLocaleDateString('ko-KR') || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => navigate(`/workspaces/${workspace.id}/settings`)}
                          className="text-primary hover:text-primary-dark"
                        >
                          관리
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Members Tab - Show Join Requests */}
        {activeTab === 'members' && (
          <div>
            <h2 className="text-xl font-semibold mb-6">멤버 승인 요청</h2>
            
            {joinRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">대기 중인 가입 요청이 없습니다.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        사용자
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        워크스페이스
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        요청일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {joinRequests.map((request) => (
                      <tr key={request.id}>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium">{request.user_name}</p>
                            <p className="text-sm text-gray-500">{request.user_email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {request.workspace_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {request.requested_at?.toDate?.().toLocaleDateString('ko-KR') || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleJoinRequest(request.id!, 'approved')}
                              className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              <Check className="w-4 h-4" />
                              승인
                            </button>
                            <button
                              onClick={() => handleJoinRequest(request.id!, 'rejected', '관리자 거절')}
                              className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              <X className="w-4 h-4" />
                              거절
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Company Objectives Tab */}
        {activeTab === 'objectives' && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold">회사 전체 목표</h2>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">
                <Plus className="w-4 h-4" />
                회사 목표 추가
              </button>
            </div>

            {companyObjectives.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">회사 전체 목표가 설정되지 않았습니다.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {companyObjectives.map((objective) => (
                  <div key={objective.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{objective.title}</h3>
                        <p className="text-gray-600 mt-1">{objective.description}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        objective.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        objective.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        objective.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {objective.priority === 'critical' ? '긴급' :
                         objective.priority === 'high' ? '높음' :
                         objective.priority === 'medium' ? '보통' : '낮음'}
                      </span>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>진행률</span>
                        <span>{objective.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${objective.progress}%` }}
                        />
                      </div>
                    </div>

                    {objective.cascaded_to && objective.cascaded_to.length > 0 && (
                      <p className="text-sm text-gray-500">
                        {objective.cascaded_to.length}개 워크스페이스에 전파됨
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div>
            <h2 className="text-xl font-semibold mb-6">비용 관리</h2>
            
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              {[
                { name: 'Free', price: 0, features: ['3 워크스페이스', '25명까지', '5GB 스토리지'] },
                { name: 'Starter', price: 29, features: ['10 워크스페이스', '200명까지', '50GB 스토리지'] },
                { name: 'Professional', price: 99, features: ['50 워크스페이스', '1000명까지', '500GB 스토리지'] },
                { name: 'Enterprise', price: 299, features: ['무제한 워크스페이스', '무제한 멤버', '무제한 스토리지'] }
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`bg-white rounded-lg shadow p-6 ${
                    hqData?.billing.plan === plan.name.toLowerCase() ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
                  <p className="text-2xl font-bold mb-4">${plan.price}<span className="text-sm text-gray-500">/월</span></p>
                  <ul className="space-y-2 mb-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="text-sm text-gray-600">✓ {feature}</li>
                    ))}
                  </ul>
                  {hqData?.billing.plan !== plan.name.toLowerCase() && (
                    <button
                      onClick={() => updateBillingPlan(plan.name.toLowerCase() as any)}
                      className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                    >
                      선택
                    </button>
                  )}
                  {hqData?.billing.plan === plan.name.toLowerCase() && (
                    <div className="text-center text-green-600 font-medium">현재 플랜</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <h2 className="text-xl font-semibold mb-6">HQ 설정</h2>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">워크스페이스 승인 필요</h3>
                    <p className="text-sm text-gray-500">새 워크스페이스 생성 시 HQ 승인 필요</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={hqData?.settings.require_workspace_approval}
                    onChange={(e) => {
                      if (hqData) {
                        hqService.updateHQSettings(hqData.id!, {
                          ...hqData.settings,
                          require_workspace_approval: e.target.checked
                        });
                      }
                    }}
                    className="toggle"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">멤버 가입 승인 필요</h3>
                    <p className="text-sm text-gray-500">새 멤버 가입 시 관리자 승인 필요</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={hqData?.settings.require_member_approval}
                    onChange={(e) => {
                      if (hqData) {
                        hqService.updateHQSettings(hqData.id!, {
                          ...hqData.settings,
                          require_member_approval: e.target.checked
                        });
                      }
                    }}
                    className="toggle"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">2단계 인증 강제</h3>
                    <p className="text-sm text-gray-500">모든 멤버에게 2FA 필수</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={hqData?.settings.enforce_2fa}
                    onChange={(e) => {
                      if (hqData) {
                        hqService.updateHQSettings(hqData.id!, {
                          ...hqData.settings,
                          enforce_2fa: e.target.checked
                        });
                      }
                    }}
                    className="toggle"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HQDashboard;