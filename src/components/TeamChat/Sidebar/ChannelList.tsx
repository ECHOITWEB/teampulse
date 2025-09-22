import React from 'react';
import { Hash, Lock, Plus, Edit2, Trash2, MoreVertical, ChevronDown } from 'lucide-react';
import { ChatChannel } from '../../../services/chatService';
import { DirectMessage } from '../../../types/chat.types';
import { useAuth } from '../../../contexts/AuthContext';

interface ChannelListProps {
  channels: ChatChannel[];
  directMessages: DirectMessage[];
  currentChannel: ChatChannel | null;
  currentDM: DirectMessage | null;
  showChannelMenu: string | null;
  onChannelSelect: (channel: ChatChannel) => void;
  onDMSelect: (dm: DirectMessage) => void;
  onCreateChannel: () => void;
  onChannelMenuToggle: (channelId: string | null) => void;
  onChannelEdit: (channelId: string, name: string) => void;
  onChannelDelete: (channelId: string) => void;
  isAdmin: boolean;
}

const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  directMessages,
  currentChannel,
  currentDM,
  showChannelMenu,
  onChannelSelect,
  onDMSelect,
  onCreateChannel,
  onChannelMenuToggle,
  onChannelEdit,
  onChannelDelete,
  isAdmin
}) => {
  const { user } = useAuth();
  const handleChannelEdit = (channel: ChatChannel) => {
    const newName = prompt('새 채널 이름을 입력하세요:', channel.name);
    if (newName && newName !== channel.name) {
      onChannelEdit(channel.id, newName);
    }
    onChannelMenuToggle(null);
  };

  const handleChannelDelete = (channelId: string) => {
    if (window.confirm('정말 이 채널을 삭제하시겠습니까? 모든 메시지가 삭제됩니다.')) {
      onChannelDelete(channelId);
    }
    onChannelMenuToggle(null);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Channels */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <button className="flex items-center gap-1 text-sm font-medium hover:text-white/90">
            <ChevronDown className="w-4 h-4" />
            <span>Channels</span>
          </button>
          <button
            onClick={onCreateChannel}
            className="hover:bg-slate-700 p-1 rounded"
            title="채널 추가"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-1">
          {channels.map(channel => (
            <div
              key={channel.id}
              onClick={() => onChannelSelect(channel)}
              className={`w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-700 text-left group cursor-pointer ${
                currentChannel?.id === channel.id && !currentDM ? 'bg-slate-700' : ''
              }`}
            >
              {channel.type === 'private' ? (
                <Lock className="w-4 h-4 opacity-50" />
              ) : (
                <Hash className="w-4 h-4 opacity-50" />
              )}
              <span className="text-sm flex-1">{channel.name}</span>
              {channel.ai_enabled && (
                <span className="text-xs font-semibold text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">AI</span>
              )}
              
              {/* 채널 메뉴 버튼 */}
              {isAdmin && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onChannelMenuToggle(showChannelMenu === channel.id ? null : channel.id);
                    }}
                    className="p-1 hover:bg-slate-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>
                  
                  {/* 채널 메뉴 */}
                  {showChannelMenu === channel.id && (
                    <div className="absolute right-0 top-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg py-1 z-20 w-48">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChannelEdit(channel);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-slate-600 flex items-center gap-2 text-sm"
                      >
                        <Edit2 className="w-3 h-3" />
                        채널명 수정
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChannelDelete(channel.id);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-slate-600 text-red-400 flex items-center gap-2 text-sm"
                      >
                        <Trash2 className="w-3 h-3" />
                        채널 삭제
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Direct Messages */}
      <div className="p-3 border-t border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <button className="flex items-center gap-1 text-sm font-medium hover:text-white/90">
            <ChevronDown className="w-4 h-4" />
            <span>Direct Messages</span>
          </button>
        </div>
        <div className="space-y-1">
          {directMessages.map(dm => (
            <div
              key={dm.id}
              onClick={() => onDMSelect(dm)}
              className={`w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-700 text-left cursor-pointer ${
                currentDM?.id === dm.id ? 'bg-slate-700' : ''
              }`}
            >
              <div className="relative">
                <div className={`w-2 h-2 rounded-full ${dm.is_online ? 'bg-green-400' : 'bg-gray-400'}`} />
              </div>
              <span className="text-sm flex-1">@{dm.user_name}</span>
              {dm.unread_count > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {dm.unread_count}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChannelList;