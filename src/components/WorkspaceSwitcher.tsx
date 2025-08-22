import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, Building2, Plus, Settings, LogOut, 
  Users, TrendingUp, Shield, Crown, UserCheck, User,
  Check
} from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';

const WorkspaceSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const { workspaces, currentWorkspace, switchWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleWorkspaceSwitch = async (workspace: typeof workspaces[0]) => {
    if (workspace.id === currentWorkspace?.id) {
      setIsOpen(false);
      return;
    }

    await switchWorkspace(workspace.id);
    navigate(`/workspaces/${workspace.id}/dashboard`);
    setIsOpen(false);
  };

  const handleCreateWorkspace = () => {
    navigate('/workspaces');
    setIsOpen(false);
  };

  const handleWorkspaceSettings = () => {
    navigate(`/workspaces/${currentWorkspace?.id}/settings`);
    setIsOpen(false);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-3.5 h-3.5" />;
      case 'admin':
        return <UserCheck className="w-3.5 h-3.5" />;
      default:
        return <User className="w-3.5 h-3.5" />;
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

  const getPlanBadge = (plan: string) => {
    const badges = {
      free: { color: 'bg-gray-100 text-gray-700', label: 'Free' },
      starter: { color: 'bg-blue-100 text-blue-700', label: 'Starter' },
      pro: { color: 'bg-purple-100 text-purple-700', label: 'Pro' },
      enterprise: { color: 'bg-gradient-to-r from-amber-100 to-orange-100 text-orange-700', label: 'Enterprise' }
    };
    return badges[plan as keyof typeof badges] || badges.free;
  };

  if (!currentWorkspace) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
      >
        <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-gray-900 text-sm">{currentWorkspace.name}</h3>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            {getRoleIcon(currentWorkspace.role)}
            {getRoleLabel(currentWorkspace.role)}
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50"
          >
            {/* Current Workspace Info */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{currentWorkspace.name}</h4>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                      {getRoleIcon(currentWorkspace.role)}
                      {getRoleLabel(currentWorkspace.role)}
                    </p>
                  </div>
                </div>
                {workspaces.find(w => w.id === currentWorkspace.id)?.plan && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    getPlanBadge(workspaces.find(w => w.id === currentWorkspace.id)!.plan).color
                  }`}>
                    {getPlanBadge(workspaces.find(w => w.id === currentWorkspace.id)!.plan).label}
                  </span>
                )}
              </div>

              {/* Workspace Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">
                      {workspaces.find(w => w.id === currentWorkspace.id)?.member_count || 0}명
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <div className="flex items-center gap-2 text-gray-600">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">
                      {((workspaces.find(w => w.id === currentWorkspace.id)?.ai_usage_this_month || 0) / 1000).toFixed(1)}K 토큰
                    </span>
                  </div>
                </div>
              </div>

              {/* Workspace Actions */}
              {(currentWorkspace.role === 'owner' || currentWorkspace.role === 'admin') && (
                <button
                  onClick={handleWorkspaceSettings}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium text-gray-700"
                >
                  <Settings className="w-4 h-4" />
                  워크스페이스 설정
                </button>
              )}
            </div>

            {/* Other Workspaces */}
            <div className="max-h-64 overflow-y-auto">
              <div className="p-2">
                <p className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  워크스페이스 전환
                </p>
                {workspaces
                  .filter(w => w.id !== currentWorkspace.id)
                  .map(workspace => (
                    <button
                      key={workspace.id}
                      onClick={() => handleWorkspaceSwitch(workspace)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors duration-150 group"
                    >
                      <div className="p-2 bg-gray-100 group-hover:bg-gray-200 rounded-lg transition-colors">
                        <Building2 className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-gray-900">{workspace.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          {getRoleIcon(workspace.role)}
                          {getRoleLabel(workspace.role)}
                          <span className="mx-1">•</span>
                          {workspace.member_count}명
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        getPlanBadge(workspace.plan).color
                      }`}>
                        {getPlanBadge(workspace.plan).label}
                      </span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Create New Workspace */}
            <div className="p-2 border-t border-gray-100">
              <button
                onClick={handleCreateWorkspace}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors duration-150 group"
              >
                <div className="p-2 bg-blue-100 group-hover:bg-blue-200 rounded-lg transition-colors">
                  <Plus className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-blue-600">새 워크스페이스 만들기</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WorkspaceSwitcher;