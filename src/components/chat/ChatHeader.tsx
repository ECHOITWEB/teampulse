import React, { useState } from 'react';
import { 
  Hash, Lock, Users, Menu, MoreVertical, Download, Bot, X,
  Edit2, UserPlus, Trash2
} from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private' | 'direct';
  ai_enabled?: boolean;
}

interface DirectMessage {
  id: string;
  user_name: string;
  is_online?: boolean;
}

interface ChatHeaderProps {
  currentChannel?: Channel | null;
  currentDM?: DirectMessage | null;
  channelMemberCount?: number;
  userRole?: string;
  onShowMobileSidebar?: () => void;
  onShowMembers?: () => void;
  onExportChat?: () => void;
  onInviteAI?: () => void;
  onKickAI?: () => void;
  onEditChannel?: () => void;
  onDeleteChannel?: () => void;
  onInviteMembers?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  currentChannel,
  currentDM,
  channelMemberCount = 0,
  userRole = 'member',
  onShowMobileSidebar,
  onShowMembers,
  onExportChat,
  onInviteAI,
  onKickAI,
  onEditChannel,
  onDeleteChannel,
  onInviteMembers
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <button 
          onClick={onShowMobileSidebar}
          className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {/* Channel Info */}
        {currentChannel && (
          <div className="flex items-center gap-2">
            {currentChannel.type === 'private' ? (
              <Lock className="w-5 h-5 text-gray-500 flex-shrink-0" />
            ) : (
              <Hash className="w-5 h-5 text-gray-500 flex-shrink-0" />
            )}
            <div className="flex flex-col">
              <h2 className="font-semibold text-gray-900 leading-tight">
                {currentChannel.name}
              </h2>
              <button 
                onClick={onShowMembers}
                className="text-xs text-gray-500 hover:text-gray-700 text-left transition-colors"
              >
                {channelMemberCount}명
              </button>
            </div>
            {currentChannel.ai_enabled && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                AI 활성화
              </span>
            )}
          </div>
        )}
        
        {/* DM Info */}
        {currentDM && (
          <>
            <Users className="w-5 h-5 text-gray-500" />
            <div>
              <h2 className="font-semibold text-gray-900">@{currentDM.user_name}</h2>
              <p className="text-xs text-gray-500">
                {currentDM.is_online ? '온라인' : '오프라인'}
              </p>
            </div>
          </>
        )}
      </div>
      
      {/* Menu */}
      {currentChannel && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 z-10 w-56">
              <button
                onClick={() => {
                  onExportChat?.();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
              >
                <Download className="w-3 h-3" />
                채팅 기록 내보내기
              </button>
              
              {!currentChannel.ai_enabled && (
                <button
                  onClick={() => {
                    onInviteAI?.();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
                >
                  <Bot className="w-3 h-3" />
                  Pulse AI 초대하기
                </button>
              )}
              
              {currentChannel.ai_enabled && (
                <>
                  <button
                    onClick={() => {
                      onInviteAI?.();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
                  >
                    <Bot className="w-3 h-3" />
                    Pulse AI 모델 변경
                  </button>
                  <button
                    onClick={() => {
                      onKickAI?.();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600 flex items-center gap-2 text-sm"
                  >
                    <X className="w-3 h-3" />
                    Pulse AI 내보내기
                  </button>
                </>
              )}
              
              {userRole !== 'member' && (
                <>
                  <div className="border-t my-1"></div>
                  <button
                    onClick={() => {
                      onEditChannel?.();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
                  >
                    <Edit2 className="w-3 h-3" />
                    채널 설정
                  </button>
                  {currentChannel.type === 'private' && (
                    <button
                      onClick={() => {
                        onInviteMembers?.();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
                    >
                      <UserPlus className="w-3 h-3" />
                      멤버 초대
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onDeleteChannel?.();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600 flex items-center gap-2 text-sm"
                  >
                    <Trash2 className="w-3 h-3" />
                    채널 삭제
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatHeader;