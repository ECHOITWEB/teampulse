import React from 'react';
import { Command } from 'lucide-react';
import { SlashCommand } from '../../../types/chat.types';

interface SlashCommandsProps {
  show: boolean;
  searchTerm: string;
  selectedIndex: number;
  onSelect: (command: SlashCommand) => void;
}

const slashCommands: SlashCommand[] = [
  { 
    name: '/ai', 
    description: 'AI 어시스턴트와 대화하기', 
    usage: '/ai [메시지]',
    category: 'ai'
  },
  { 
    name: '/gpt', 
    description: 'ChatGPT (OpenAI)와 대화하기', 
    usage: '/gpt [메시지]',
    category: 'ai'
  },
  { 
    name: '/claude', 
    description: 'Claude (Anthropic)와 대화하기', 
    usage: '/claude [메시지]',
    category: 'ai'
  },
  { 
    name: '/invite', 
    description: '멤버 초대하기', 
    usage: '/invite [이메일]',
    category: 'admin'
  },
  { 
    name: '/kick', 
    description: '멤버 내보내기', 
    usage: '/kick [멤버이름]',
    category: 'admin'
  },
  { 
    name: '/topic', 
    description: '채널 주제 변경', 
    usage: '/topic [새 주제]',
    category: 'admin'
  },
  { 
    name: '/rename', 
    description: '채널 이름 변경', 
    usage: '/rename [새 이름]',
    category: 'admin'
  },
  { 
    name: '/archive', 
    description: '채널 보관하기', 
    usage: '/archive',
    category: 'admin'
  },
  { 
    name: '/clear', 
    description: '메시지 지우기', 
    usage: '/clear [개수]',
    category: 'admin'
  },
  { 
    name: '/dm', 
    description: '다이렉트 메시지 보내기', 
    usage: '/dm [사용자] [메시지]',
    category: 'general'
  },
  { 
    name: '/shrug', 
    description: '¯\\_(ツ)_/¯ 이모티콘 추가', 
    usage: '/shrug [메시지]',
    category: 'general'
  },
  { 
    name: '/me', 
    description: '상태 메시지 표시', 
    usage: '/me [상태]',
    category: 'general'
  },
  { 
    name: '/status', 
    description: '상태 변경 (온라인/자리비움/방해금지)', 
    usage: '/status [온라인|자리비움|방해금지]',
    category: 'general'
  },
  { 
    name: '/poll', 
    description: '투표 생성', 
    usage: '/poll "질문" "옵션1" "옵션2" ...',
    category: 'general'
  },
  { 
    name: '/remind', 
    description: '리마인더 설정', 
    usage: '/remind [시간] [메시지]',
    category: 'general'
  }
];

const SlashCommands: React.FC<SlashCommandsProps> = ({
  show,
  searchTerm,
  selectedIndex,
  onSelect
}) => {
  if (!show) return null;

  const filteredCommands = slashCommands.filter(cmd =>
    cmd.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cmd.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categoryColors = {
    ai: 'text-purple-600 bg-purple-50',
    admin: 'text-red-600 bg-red-50',
    general: 'text-blue-600 bg-blue-50'
  };

  const categoryLabels = {
    ai: 'AI',
    admin: '관리',
    general: '일반'
  };

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-y-auto">
      <div className="sticky top-0 bg-white px-4 py-2 border-b border-gray-100">
        <div className="flex items-center text-sm text-gray-500">
          <Command className="w-4 h-4 mr-2" />
          <span>슬래시 명령어</span>
        </div>
      </div>
      <div className="py-1">
        {filteredCommands.length > 0 ? (
          filteredCommands.map((cmd, index) => (
            <button
              key={cmd.name}
              className={`w-full px-4 py-2 flex items-start hover:bg-gray-50 transition-colors ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
              onClick={() => onSelect(cmd)}
            >
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{cmd.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${categoryColors[cmd.category]}`}>
                    {categoryLabels[cmd.category]}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mt-0.5">{cmd.description}</div>
                <div className="text-xs text-gray-400 mt-1 font-mono">{cmd.usage}</div>
              </div>
            </button>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-gray-500">
            <div className="text-sm">명령어를 찾을 수 없습니다</div>
            <div className="text-xs mt-1 text-gray-400">다른 검색어를 시도해보세요</div>
          </div>
        )}
      </div>
      <div className="sticky bottom-0 bg-gray-50 px-4 py-2 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-300">Tab</kbd> 또는{' '}
          <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-300">Enter</kbd>로 선택
        </div>
      </div>
    </div>
  );
};

export default SlashCommands;