import React, { useState } from 'react';
import { Hash, Lock, Plus, ChevronDown, MoreVertical, Edit2, Trash2, UserPlus } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private' | 'direct';
  workspace_id: string;
  members?: string[];
  ai_enabled?: boolean;
  unread_count?: number;
}

interface ChannelListProps {
  channels: Channel[];
  currentChannel: Channel | null;
  onChannelSelect: (channel: Channel) => void;
  onCreateChannel: () => void;
  onEditChannel: (channel: Channel) => void;
  onDeleteChannel: (channelId: string) => void;
  onInviteMembers: (channel: Channel) => void;
  userRole: string;
}

const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  currentChannel,
  onChannelSelect,
  onCreateChannel,
  onEditChannel,
  onDeleteChannel,
  onInviteMembers,
  userRole
}) => {
  const [showChannelMenu, setShowChannelMenu] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const publicChannels = channels.filter(c => c.type === 'public');
  const privateChannels = channels.filter(c => c.type === 'private');

  const handleChannelMenu = (e: React.MouseEvent, channelId: string) => {
    e.stopPropagation();
    setShowChannelMenu(showChannelMenu === channelId ? null : channelId);
  };

  return (
    <div className="p-3 border-t border-slate-700">
      {/* Public Channels */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1 text-sm font-medium hover:text-white/90"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
            <span>Channels</span>
          </button>
          <button
            onClick={onCreateChannel}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Create channel"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        {!isCollapsed && (
          <div className="space-y-1">
            {/* Public Channels */}
            {publicChannels.map(channel => (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel)}
                className={`w-full flex items-center justify-between px-2 py-1 rounded hover:bg-slate-700 text-left group ${
                  currentChannel?.id === channel.id ? 'bg-slate-700' : ''
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm truncate">{channel.name}</span>
                  {channel.ai_enabled && (
                    <span className="text-xs text-purple-400">AI</span>
                  )}
                  {channel.unread_count && channel.unread_count > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {channel.unread_count}
                    </span>
                  )}
                </div>
                
                {userRole !== 'member' && (
                  <div className="relative">
                    <button
                      onClick={(e) => handleChannelMenu(e, channel.id)}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-600 rounded transition-all"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </button>
                    
                    {showChannelMenu === channel.id && (
                      <div className="absolute right-0 top-full mt-1 bg-slate-700 rounded-lg shadow-lg py-1 z-10 w-40">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onInviteMembers(channel);
                            setShowChannelMenu(null);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-slate-600 flex items-center gap-2 text-sm"
                        >
                          <UserPlus className="w-3 h-3" />
                          멤버 초대
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditChannel(channel);
                            setShowChannelMenu(null);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-slate-600 flex items-center gap-2 text-sm"
                        >
                          <Edit2 className="w-3 h-3" />
                          채널명 수정
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChannel(channel.id);
                            setShowChannelMenu(null);
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
              </button>
            ))}
            
            {/* Private Channels */}
            {privateChannels.map(channel => (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel)}
                className={`w-full flex items-center justify-between px-2 py-1 rounded hover:bg-slate-700 text-left group ${
                  currentChannel?.id === channel.id ? 'bg-slate-700' : ''
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm truncate">{channel.name}</span>
                  {channel.ai_enabled && (
                    <span className="text-xs text-purple-400">AI</span>
                  )}
                  {channel.unread_count && channel.unread_count > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {channel.unread_count}
                    </span>
                  )}
                </div>
                
                {userRole !== 'member' && (
                  <div className="relative">
                    <button
                      onClick={(e) => handleChannelMenu(e, channel.id)}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-600 rounded transition-all"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </button>
                    
                    {showChannelMenu === channel.id && (
                      <div className="absolute right-0 top-full mt-1 bg-slate-700 rounded-lg shadow-lg py-1 z-10 w-40">
                        {channel.type === 'private' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onInviteMembers(channel);
                              setShowChannelMenu(null);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-slate-600 flex items-center gap-2 text-sm"
                          >
                            <UserPlus className="w-3 h-3" />
                            멤버 초대
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditChannel(channel);
                            setShowChannelMenu(null);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-slate-600 flex items-center gap-2 text-sm"
                        >
                          <Edit2 className="w-3 h-3" />
                          채널명 수정
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChannel(channel.id);
                            setShowChannelMenu(null);
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
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelList;