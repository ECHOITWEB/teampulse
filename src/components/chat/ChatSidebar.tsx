import React from 'react';
import { Building2, Settings, Bell, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import ChannelList from './ChannelList';
import DirectMessageList from './DirectMessageList';

interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private' | 'direct';
  workspace_id: string;
  members?: string[];
  ai_enabled?: boolean;
  unread_count?: number;
}

interface DirectMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_email?: string;
  avatar_url?: string;
  unread_count: number;
  is_online?: boolean;
  last_message?: string;
  last_message_time?: any;
}

interface ChatSidebarProps {
  channels: Channel[];
  directMessages: DirectMessage[];
  currentChannel: Channel | null;
  currentDM: DirectMessage | null;
  userRole: string;
  onChannelSelect: (channel: Channel) => void;
  onDMSelect: (dm: DirectMessage) => void;
  onCreateChannel: () => void;
  onEditChannel: (channel: Channel) => void;
  onDeleteChannel: (channelId: string) => void;
  onInviteMembers: (channel: Channel) => void;
  className?: string;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  channels,
  directMessages,
  currentChannel,
  currentDM,
  userRole,
  onChannelSelect,
  onDMSelect,
  onCreateChannel,
  onEditChannel,
  onDeleteChannel,
  onInviteMembers,
  className = ''
}) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { currentWorkspace } = useWorkspace();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navigateToSettings = () => {
    navigate(`/workspaces/${currentWorkspace?.id}/settings`);
  };

  return (
    <div className={`bg-slate-800 text-white flex flex-col h-full ${className}`}>
      {/* Workspace Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-sm">{currentWorkspace?.name}</h1>
              <p className="text-xs text-gray-400 capitalize">{userRole}</p>
            </div>
          </div>
        </div>
        
        {/* User Info */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span>{user?.name || user?.email}</span>
        </div>
      </div>

      {/* Channels */}
      <ChannelList
        channels={channels}
        currentChannel={currentChannel}
        onChannelSelect={onChannelSelect}
        onCreateChannel={onCreateChannel}
        onEditChannel={onEditChannel}
        onDeleteChannel={onDeleteChannel}
        onInviteMembers={onInviteMembers}
        userRole={userRole}
      />

      {/* Direct Messages */}
      <DirectMessageList
        directMessages={directMessages}
        currentDM={currentDM}
        onDMSelect={onDMSelect}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom Actions */}
      <div className="p-3 border-t border-slate-700 space-y-2">
        <button
          onClick={navigateToSettings}
          className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-700 text-sm"
        >
          <Settings className="w-4 h-4" />
          <span>워크스페이스 설정</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-700 text-sm text-red-400"
        >
          <LogOut className="w-4 h-4" />
          <span>로그아웃</span>
        </button>
      </div>
    </div>
  );
};

export default ChatSidebar;