import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Users, Shield, CreditCard, Settings, ChevronDown, 
  Plus, Mail, Crown, UserCheck, User, TrendingUp, Lock,
  Activity, BarChart3, DollarSign, Zap
} from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  icon: string;
  memberCount: number;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  role: 'owner' | 'admin' | 'member';
  usage: {
    storage: number;
    ai: number;
  };
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  avatar: string;
  lastActive: string;
  aiUsage: number;
}

const WorkspacePreview: React.FC = () => {
  const [selectedWorkspace, setSelectedWorkspace] = useState('ws1');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'billing' | 'settings'>('members');
  const [showInviteModal, setShowInviteModal] = useState(false);

  const workspaces: Workspace[] = [
    {
      id: 'ws1',
      name: '우리 회사',
      icon: '🏢',
      memberCount: 24,
      plan: 'pro',
      role: 'owner',
      usage: { storage: 67, ai: 82 }
    },
    {
      id: 'ws2',
      name: '마케팅 팀',
      icon: '📊',
      memberCount: 8,
      plan: 'starter',
      role: 'admin',
      usage: { storage: 45, ai: 61 }
    },
    {
      id: 'ws3',
      name: '개발 프로젝트',
      icon: '💻',
      memberCount: 12,
      plan: 'free',
      role: 'member',
      usage: { storage: 23, ai: 94 }
    }
  ];

  const members: Member[] = [
    {
      id: 'm1',
      name: '김대표',
      email: 'ceo@company.com',
      role: 'owner',
      avatar: '👨‍💼',
      lastActive: '방금 전',
      aiUsage: 1250
    },
    {
      id: 'm2',
      name: '박매니저',
      email: 'manager@company.com',
      role: 'admin',
      avatar: '👩‍💼',
      lastActive: '5분 전',
      aiUsage: 890
    },
    {
      id: 'm3',
      name: '이개발',
      email: 'dev@company.com',
      role: 'member',
      avatar: '👨‍💻',
      lastActive: '1시간 전',
      aiUsage: 2100
    },
    {
      id: 'm4',
      name: '최디자인',
      email: 'design@company.com',
      role: 'member',
      avatar: '👩‍🎨',
      lastActive: '2시간 전',
      aiUsage: 650
    }
  ];

  const currentWorkspace = workspaces.find(ws => ws.id === selectedWorkspace)!;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4" />;
      case 'admin': return <UserCheck className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'text-amber-600 bg-amber-100';
      case 'admin': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
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

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 shadow-lg">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">워크스페이스 관리</h3>
        <p className="text-gray-600">팀별로 독립된 업무 공간을 관리하고 권한을 설정하세요</p>
      </div>

      {/* Workspace Switcher */}
      <div className="mb-6">
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">{currentWorkspace.icon}</div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">{currentWorkspace.name}</div>
                <div className="text-sm text-gray-500">
                  {currentWorkspace.memberCount}명의 멤버 · {getPlanBadge(currentWorkspace.plan).label} 플랜
                </div>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </motion.button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-10"
              >
                {workspaces.map((workspace) => (
                  <motion.button
                    key={workspace.id}
                    whileHover={{ backgroundColor: '#f9fafb' }}
                    onClick={() => {
                      setSelectedWorkspace(workspace.id);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{workspace.icon}</div>
                      <div>
                        <div className="font-medium text-gray-900">{workspace.name}</div>
                        <div className="text-sm text-gray-500">{workspace.memberCount}명의 멤버</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPlanBadge(workspace.plan).color}`}>
                        {getPlanBadge(workspace.plan).label}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRoleColor(workspace.role)}`}>
                        {workspace.role === 'owner' ? '소유자' : workspace.role === 'admin' ? '관리자' : '멤버'}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'members', icon: Users, label: '멤버 관리' },
          { id: 'billing', icon: CreditCard, label: '요금제' },
          { id: 'settings', icon: Settings, label: '설정' }
        ].map((tab) => (
          <motion.button
            key={tab.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </motion.button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'members' && (
          <motion.div
            key="members"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-lg p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">팀 멤버</h4>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                멤버 초대
              </motion.button>
            </div>

            <div className="space-y-3">
              {members.map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{member.avatar}</div>
                    <div>
                      <div className="font-medium text-gray-900">{member.name}</div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                      {getRoleIcon(member.role)}
                      <span>{member.role === 'owner' ? '소유자' : member.role === 'admin' ? '관리자' : '멤버'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <div className="text-gray-500">AI 사용량</div>
                      <div className="font-medium text-gray-900">{member.aiUsage.toLocaleString()} 토큰</div>
                    </div>
                    <div className="text-gray-400">{member.lastActive}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'billing' && (
          <motion.div
            key="billing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-lg p-6 shadow-sm"
          >
            <h4 className="text-lg font-semibold text-gray-900 mb-4">요금제 및 사용량</h4>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-lg font-semibold">Pro Plan</h5>
                    <Zap className="w-6 h-6" />
                  </div>
                  <div className="text-3xl font-bold mb-2">₩99,000<span className="text-lg font-normal">/월</span></div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      최대 50명의 팀원
                    </li>
                    <li className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      월 100,000 AI 토큰
                    </li>
                    <li className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      고급 보안 기능
                    </li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">AI 토큰 사용량</span>
                    <span className="text-sm text-gray-600">{currentWorkspace.usage.ai}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${currentWorkspace.usage.ai}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full ${currentWorkspace.usage.ai > 80 ? 'bg-red-500' : 'bg-indigo-600'}`}
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-500">82,000 / 100,000 토큰</div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">저장 공간</span>
                    <span className="text-sm text-gray-600">{currentWorkspace.usage.storage}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${currentWorkspace.usage.storage}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                      className="h-full bg-green-500"
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-500">67GB / 100GB</div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                >
                  Enterprise 플랜으로 업그레이드
                </motion.button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <div className="text-xl font-bold text-gray-900">₩297,000</div>
                <div className="text-sm text-gray-600">이번 달 예상 요금</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <div className="text-xl font-bold text-gray-900">+15%</div>
                <div className="text-sm text-gray-600">전월 대비 사용량</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <BarChart3 className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <div className="text-xl font-bold text-gray-900">4.2</div>
                <div className="text-sm text-gray-600">멤버당 평균 AI 사용</div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-lg p-6 shadow-sm"
          >
            <h4 className="text-lg font-semibold text-gray-900 mb-4">워크스페이스 설정</h4>
            
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-gray-700" />
                    <div>
                      <h5 className="font-medium text-gray-900">2단계 인증</h5>
                      <p className="text-sm text-gray-500">모든 멤버에게 2FA를 요구합니다</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-700" />
                    <div>
                      <h5 className="font-medium text-gray-900">이메일 도메인 제한</h5>
                      <p className="text-sm text-gray-500">특정 도메인만 가입 허용</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-gray-700" />
                    <div>
                      <h5 className="font-medium text-gray-900">데이터 암호화</h5>
                      <p className="text-sm text-gray-500">모든 데이터를 암호화하여 저장</p>
                    </div>
                  </div>
                  <span className="text-sm text-green-600 font-medium">활성화됨</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">새 멤버 초대</h3>
              <input
                type="email"
                placeholder="이메일 주소 입력"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option>멤버</option>
                <option>관리자</option>
              </select>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  초대 보내기
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  취소
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WorkspacePreview;