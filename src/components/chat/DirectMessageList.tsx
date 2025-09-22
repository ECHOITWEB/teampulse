import React from 'react';
import { ChevronDown, Users } from 'lucide-react';

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

interface DirectMessageListProps {
  directMessages: DirectMessage[];
  currentDM: DirectMessage | null;
  onDMSelect: (dm: DirectMessage) => void;
}

const DirectMessageList: React.FC<DirectMessageListProps> = ({
  directMessages,
  currentDM,
  onDMSelect
}) => {
  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <div className="p-3 border-t border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <button className="flex items-center gap-1 text-sm font-medium hover:text-white/90">
          <ChevronDown className="w-4 h-4" />
          <span>Direct Messages</span>
        </button>
      </div>
      
      <div className="space-y-1">
        {directMessages.map(dm => (
          <button
            key={dm.id}
            onClick={() => onDMSelect(dm)}
            className={`w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-700 text-left ${
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
            {dm.last_message_time && (
              <span className="text-xs text-gray-400">
                {formatTimeAgo(dm.last_message_time)}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DirectMessageList;