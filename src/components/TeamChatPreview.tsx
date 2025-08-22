import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Paperclip, Smile, Hash, Lock, 
  Search, Plus, MoreVertical, Phone, Video,
  FileText, Bell, CheckCheck, Circle, Bot, UserPlus,
  Code, TrendingUp, Download
} from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private' | 'dm';
  unread: number;
  lastMessage?: string;
  lastActivity?: string;
  members?: number;
}

interface Message {
  id: string;
  user: string;
  avatar: string;
  content: string | React.ReactNode;
  timestamp: string;
  reactions?: { emoji: string; count: number }[];
  isAI?: boolean;
  isSystem?: boolean;
  status?: 'sending' | 'sent' | 'read';
  attachments?: { type: string; name: string; content?: string }[];
  modelInfo?: string;
}

const TeamChatPreview: React.FC = () => {
  const [selectedChannel, setSelectedChannel] = useState('general');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [autoPlayIndex, setAutoPlayIndex] = useState(-1);
  const [showAIInvite, setShowAIInvite] = useState(true);
  const [channelUnreadCounts, setChannelUnreadCounts] = useState<{[key: string]: number}>({
    dm1: 5,
    dm2: 3,
    dm3: 0,
    dm4: 0,
    dm5: 0
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const channels: Channel[] = [
    { id: 'general', name: 'general', type: 'public', unread: 0, members: 24 },
    { id: 'dev-team', name: 'dev-team', type: 'public', unread: 0, members: 11 },
    { id: 'marketing', name: 'marketing', type: 'public', unread: 0, members: 8 },
    { id: 'project-secret', name: 'project-secret', type: 'private', unread: 0, members: 5 },
    { id: 'dm1', name: 'Licky', type: 'dm', unread: channelUnreadCounts.dm1 },
    { id: 'dm2', name: 'Mina', type: 'dm', unread: channelUnreadCounts.dm2 },
    { id: 'dm3', name: 'Hayden', type: 'dm', unread: channelUnreadCounts.dm3 },
    { id: 'dm4', name: 'Hannah', type: 'dm', unread: channelUnreadCounts.dm4, lastActivity: '2 days ago' },
    { id: 'dm5', name: '이희성', type: 'dm', unread: channelUnreadCounts.dm5, lastActivity: '6 days ago' }
  ];

  const generalMessages: Message[] = [
    {
      id: '1',
      user: 'Mina',
      avatar: '👩',
      content: '안녕하세요! 오늘 스프린트 미팅 있는거 맞죠?',
      timestamp: '오전 9:30',
      status: 'read'
    },
    {
      id: '2',
      user: 'Hayden',
      avatar: '👨‍💻',
      content: '네 맞아요! 10시에 시작합니다',
      timestamp: '오전 9:32',
      status: 'read',
      reactions: [{ emoji: '👍', count: 6 }]
    },
    {
      id: '3',
      user: 'System',
      avatar: '⚙️',
      content: 'Hayden이 Pulse AI를 초대했습니다.',
      timestamp: '오전 9:33',
      isSystem: true,
      status: 'read'
    },
    {
      id: '4',
      user: 'Pulse AI',
      avatar: '🤖',
      content: '#general 대화방에 초대되었습니다.',
      timestamp: '오전 9:33',
      isAI: true,
      modelInfo: 'Model: Claude Sonnet 4',
      status: 'read'
    },
    {
      id: '5',
      user: 'Hayden',
      avatar: '👨‍💻',
      content: '@AI 예정된 미팅 내역 알려줘',
      timestamp: '오전 9:34',
      status: 'read'
    },
    {
      id: '6',
      user: 'Pulse AI',
      avatar: '🤖',
      content: (
        <div className="space-y-2">
          <p>예정된 미팅 내역은 다음과 같습니다:</p>
          <div className="pl-4 border-l-2 border-purple-300 space-y-1 text-sm">
            <p>📅 8월 18일 오전 10시 - 전체 팀 스프린트 미팅</p>
            <p>📅 8월 18일 오전 11시 - 개발 팀 미팅</p>
            <p>📅 8월 18일 오후 2시 - 대표님 면담 (@Hannah @이희성)</p>
            <p>📅 8월 19일 오전 10시 - 마케팅팀 외주 미팅</p>
          </div>
        </div>
      ),
      timestamp: '오전 9:35',
      isAI: true,
      status: 'read'
    },
    {
      id: '7',
      user: 'Licky',
      avatar: '👨‍💼',
      content: '이번 스프린트 목표 달성률이 85%네요. 잘하고 있습니다 👏',
      timestamp: '오전 9:40',
      status: 'read',
      reactions: [{ emoji: '👍', count: 3 }, { emoji: '💪', count: 1 }, { emoji: '🎉', count: 20 }],
      attachments: [{ type: 'file', name: 'sprint_report.pdf' }]
    }
  ];

  // Direct Message 대화 내용들
  const dmLickyMessages: Message[] = [
    {
      id: 'l1',
      user: 'Licky',
      avatar: '👨‍💼',
      content: '프로젝트 진행 상황 업데이트 좀 부탁드립니다',
      timestamp: '오후 2:15',
      status: 'read'
    },
    {
      id: 'l2',
      user: 'Licky',
      avatar: '👨‍💼',
      content: '특히 API 개발 부분이 궁금합니다',
      timestamp: '오후 2:16',
      status: 'read'
    },
    {
      id: 'l3',
      user: 'Licky',
      avatar: '👨‍💼',
      content: (
        <div className="space-y-2">
          <p>이번 주 금요일까지 완료 가능할까요?</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-blue-700 mb-2">
              <span className="font-semibold">📅 프로젝트 마감일</span>
            </div>
            <p className="text-sm">2024년 8월 23일 금요일</p>
            <p className="text-xs text-gray-600 mt-1">D-5</p>
          </div>
        </div>
      ),
      timestamp: '오후 2:20',
      status: 'read'
    },
    {
      id: 'l4',
      user: 'Licky',
      avatar: '👨‍💼',
      content: '답변 기다리겠습니다 👍',
      timestamp: '오후 2:21',
      status: 'read'
    },
    {
      id: 'l5',
      user: 'Licky',
      avatar: '👨‍💼',
      content: '혹시 추가 리소스가 필요하면 말씀해주세요',
      timestamp: '오후 2:25',
      status: 'sent'
    }
  ];

  const dmMinaMessages: Message[] = [
    {
      id: 'm1',
      user: '나',
      avatar: '👤',
      content: '디자인 시안 확인했습니다!',
      timestamp: '오전 11:30',
      status: 'read'
    },
    {
      id: 'm2',
      user: 'Mina',
      avatar: '👩',
      content: '감사합니다! 수정사항 있으신가요?',
      timestamp: '오전 11:32',
      status: 'read'
    },
    {
      id: 'm3',
      user: 'Mina',
      avatar: '👩',
      content: (
        <div className="space-y-2">
          <p>참고로 이미지 첨부합니다</p>
          <div className="bg-gray-100 rounded-lg p-2 cursor-pointer hover:bg-gray-200">
            <img 
              src="/api/placeholder/300/200" 
              alt="Design mockup" 
              className="rounded w-full"
            />
            <p className="text-xs text-gray-600 mt-1">design_v2.png</p>
          </div>
        </div>
      ),
      timestamp: '오전 11:35',
      status: 'read'
    },
    {
      id: 'm4',
      user: 'Mina',
      avatar: '👩',
      content: '색상 팔레트도 함께 보내드릴게요',
      timestamp: '오전 11:36',
      status: 'sent'
    }
  ];

  const dmHaydenMessages: Message[] = [
    {
      id: 'h1',
      user: 'Hayden',
      avatar: '👨‍💻',
      content: '코드 리뷰 부탁드립니다',
      timestamp: '2일 전',
      status: 'read'
    },
    {
      id: 'h2',
      user: 'Hayden',
      avatar: '👨‍💻',
      content: (
        <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-xs overflow-x-auto">
          <p className="text-green-400 mb-2">// utils/auth.ts</p>
          <pre className="whitespace-pre-wrap">{`export const validateToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error };
  }
}`}</pre>
        </div>
      ),
      timestamp: '2일 전',
      status: 'read',
      attachments: [{ type: 'code', name: 'auth.ts' }]
    },
    {
      id: 'h3',
      user: '나',
      avatar: '👤',
      content: 'LGTM! 머지해도 될 것 같습니다',
      timestamp: '2일 전',
      status: 'read',
      reactions: [{ emoji: '👍', count: 1 }]
    }
  ];

  const dmHannahMessages: Message[] = [
    {
      id: 'ha1',
      user: 'Hannah',
      avatar: '👩‍💼',
      content: '다음 주 미팅 일정 조율 가능하실까요?',
      timestamp: '2일 전',
      status: 'read'
    },
    {
      id: 'ha2',
      user: '나',
      avatar: '👤',
      content: '네, 화요일이나 목요일 괜찮습니다',
      timestamp: '2일 전',
      status: 'read'
    },
    {
      id: 'ha3',
      user: 'Hannah',
      avatar: '👩‍💼',
      content: '그럼 화요일 오후 3시로 하겠습니다. 감사합니다!',
      timestamp: '2일 전',
      status: 'read'
    }
  ];

  const dmLeeMessages: Message[] = [
    {
      id: 'lee1',
      user: '이희성',
      avatar: '👨‍💼',
      content: '투자 미팅 준비 자료 공유드립니다',
      timestamp: '6일 전',
      status: 'read',
      attachments: [{ type: 'file', name: 'Investment_Deck_2024.pdf' }]
    },
    {
      id: 'lee2',
      user: '나',
      avatar: '👤',
      content: '확인했습니다. 잘 정리되어 있네요',
      timestamp: '6일 전',
      status: 'read'
    },
    {
      id: 'lee3',
      user: '이희성',
      avatar: '👨‍💼',
      content: '다음 주에 후속 미팅 진행하겠습니다',
      timestamp: '6일 전',
      status: 'read'
    }
  ];

  const devTeamMessages: Message[] = [
    {
      id: 'd1',
      user: 'Licky',
      avatar: '👨‍💼',
      content: '@Hayden 지금 개발 진척도 체크해주세요',
      timestamp: '오전 10:00',
      status: 'read'
    },
    {
      id: 'd2',
      user: 'System',
      avatar: '⚙️',
      content: 'Hayden이 Pulse AI를 초대했습니다.',
      timestamp: '오전 10:01',
      isSystem: true,
      status: 'read'
    },
    {
      id: 'd3',
      user: 'Pulse AI',
      avatar: '🤖',
      content: '#dev-team 대화방에 초대되었습니다.',
      timestamp: '오전 10:01',
      isAI: true,
      modelInfo: 'Model: Claude Sonnet 4',
      status: 'read'
    },
    {
      id: 'd4',
      user: 'Hayden',
      avatar: '👨‍💻',
      content: '@AI 개발 진척도와 코드 커밋 내역 알려줘',
      timestamp: '오전 10:02',
      status: 'read'
    },
    {
      id: 'd5',
      user: 'Pulse AI',
      avatar: '🤖',
      content: (
        <div className="space-y-3">
          <p>지난 주까지 진행된 진척도 그래프와 커밋 내역입니다:</p>
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">전체 진행률</span>
              <span className="text-green-600 font-bold">85%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
            </div>
          </div>
          <div className="bg-gray-900 text-green-400 rounded-lg p-3 font-mono text-xs">
            <p className="text-gray-400 mb-2">// 최근 커밋 내역</p>
            <p>+ 추가: 245 줄</p>
            <p>- 삭제: 89 줄</p>
            <p>~ 수정: 156 줄</p>
            <p className="text-gray-400 mt-2">총 코드: 12,456 줄</p>
          </div>
          <div className="text-sm text-gray-600">
            <p>📝 feat: AI 채팅 기능 구현</p>
            <p>📝 fix: 메시지 전송 버그 수정</p>
            <p>📝 refactor: 컴포넌트 구조 개선</p>
          </div>
        </div>
      ),
      timestamp: '오전 10:03',
      isAI: true,
      status: 'read'
    },
    {
      id: 'd6',
      user: 'Linda',
      avatar: '👩‍💻',
      content: '이 코드가 반영이 안되어있어요. 추가해서 커밋해주세요',
      timestamp: '오전 10:05',
      status: 'read',
      reactions: [{ emoji: '👍', count: 3 }, { emoji: '💪', count: 1 }, { emoji: '🎉', count: 80 }],
      attachments: [{ 
        type: 'code', 
        name: 'AITools.tsx',
        content: `import React from 'react';
import { Brain, Sparkles } from 'lucide-react';

const AITools: React.FC = () => {
  return (
    <div className="p-4">
      <h2>AI Tools Component</h2>
      {/* AI 도구 구현 */}
    </div>
  );
};

export default AITools;`
      }]
    },
    {
      id: 'd7',
      user: 'Pulse AI',
      avatar: '🤖',
      content: (
        <div className="space-y-2">
          <p>AITools.tsx 코드가 정상적으로 반영되었습니다.</p>
          <div className="flex gap-2 mt-2">
            <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors">
              브랜치 보기
            </button>
            <button className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors">
              커밋하기
            </button>
          </div>
        </div>
      ),
      timestamp: '오전 10:06',
      isAI: true,
      status: 'read'
    }
  ];

  // 채널에 따른 메시지 설정
  useEffect(() => {
    if (selectedChannel === 'general') {
      setMessages([]);
      setAutoPlayIndex(0);
    } else if (selectedChannel === 'dev-team') {
      setMessages([]);
      setAutoPlayIndex(0);
    } else if (selectedChannel === 'dm1') {
      setMessages(dmLickyMessages);
      setAutoPlayIndex(-1);
      // 읽음 처리 - unread count를 0으로
      setChannelUnreadCounts(prev => ({ ...prev, dm1: 0 }));
    } else if (selectedChannel === 'dm2') {
      setMessages(dmMinaMessages);
      setAutoPlayIndex(-1);
      setChannelUnreadCounts(prev => ({ ...prev, dm2: 0 }));
    } else if (selectedChannel === 'dm3') {
      setMessages(dmHaydenMessages);
      setAutoPlayIndex(-1);
      setChannelUnreadCounts(prev => ({ ...prev, dm3: 0 }));
    } else if (selectedChannel === 'dm4') {
      setMessages(dmHannahMessages);
      setAutoPlayIndex(-1);
      setChannelUnreadCounts(prev => ({ ...prev, dm4: 0 }));
    } else if (selectedChannel === 'dm5') {
      setMessages(dmLeeMessages);
      setAutoPlayIndex(-1);
      setChannelUnreadCounts(prev => ({ ...prev, dm5: 0 }));
    } else {
      // 다른 채널들은 기본 메시지
      setMessages([
        {
          id: 'default1',
          user: 'System',
          avatar: '⚙️',
          content: `#${channels.find(ch => ch.id === selectedChannel)?.name} 채널에 오신 것을 환영합니다!`,
          timestamp: '방금 전',
          isSystem: true,
          status: 'read'
        }
      ]);
      setAutoPlayIndex(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChannel]);

  // 자동 메시지 재생
  useEffect(() => {
    if (autoPlayIndex >= 0) {
      const messagesToPlay = selectedChannel === 'general' ? generalMessages : 
                            selectedChannel === 'dev-team' ? devTeamMessages : [];
      
      if (autoPlayIndex < messagesToPlay.length) {
        const timer = setTimeout(() => {
          setMessages(prev => [...prev, messagesToPlay[autoPlayIndex]]);
          setAutoPlayIndex(autoPlayIndex + 1);
          
          // AI가 타이핑하는 효과
          if (messagesToPlay[autoPlayIndex]?.isAI && autoPlayIndex + 1 < messagesToPlay.length) {
            setIsTyping(true);
            setTimeout(() => setIsTyping(false), 1500);
          }
        }, 1500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [autoPlayIndex, selectedChannel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    // 채팅 영역 내부에서만 스크롤하도록 수정
    if (messagesEndRef.current) {
      const chatContainer = messagesEndRef.current.closest('.overflow-y-auto');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      user: '나',
      avatar: '👤',
      content: message,
      timestamp: '방금 전',
      status: 'sending'
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage('');

    // Simulate message sent
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg
        )
      );
    }, 500);

    // Simulate AI response
    if (message.toLowerCase().includes('@ai') || message.includes('?')) {
      setIsTyping(true);
      setTimeout(() => {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          user: 'Pulse AI',
          avatar: '🤖',
          content: '네, 무엇을 도와드릴까요? 프로젝트 현황, 일정 관리, 데이터 분석 등 다양한 업무를 지원할 수 있습니다.',
          timestamp: '방금 전',
          isAI: true,
          modelInfo: 'Model: Claude Sonnet 4',
          status: 'sent'
        };
        setMessages(prev => [...prev, aiResponse]);
        setIsTyping(false);
      }, 2000);
    }
  };

  const currentChannel = channels.find(ch => ch.id === selectedChannel)!;

  const emojis = ['👍', '❤️', '😄', '🎉', '🚀', '💡', '👏', '🔥'];

  return (
    <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-8 shadow-lg">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">실시간 팀 채팅</h3>
        <p className="text-gray-600">AI 어시스턴트와 함께하는 스마트한 협업 공간</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[700px] flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
          {/* Workspace Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">TeamPulse</h4>
              <button className="p-1 hover:bg-gray-200 rounded">
                <MoreVertical className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="검색..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Channels */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">채널</span>
                <Plus className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
              </div>
              <div className="space-y-1">
                {channels.filter(ch => ch.type !== 'dm').map((channel) => (
                  <motion.button
                    key={channel.id}
                    whileHover={{ x: 2 }}
                    onClick={() => setSelectedChannel(channel.id)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm text-left transition-colors ${
                      selectedChannel === channel.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {channel.type === 'private' ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <Hash className="w-4 h-4" />
                    )}
                    <span className="flex-1">{channel.name}</span>
                    {channel.unread > 0 && (
                      <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        {channel.unread}
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="p-3 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">Direct Messages</span>
                <Plus className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
              </div>
              <div className="space-y-1">
                {channels.filter(ch => ch.type === 'dm').map((channel) => (
                  <motion.button
                    key={channel.id}
                    whileHover={{ x: 2 }}
                    onClick={() => setSelectedChannel(channel.id)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm text-left transition-colors ${
                      selectedChannel === channel.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Circle className="w-2 h-2 text-green-500 fill-current" />
                    <span className="flex-1">{channel.name}</span>
                    {channel.unread > 0 && (
                      <span className="bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                        {channel.unread}
                      </span>
                    )}
                    {channel.lastActivity && (
                      <span className="text-xs text-gray-400">{channel.lastActivity}</span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Channel Header */}
          <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              {currentChannel.type === 'private' ? (
                <Lock className="w-5 h-5 text-gray-600" />
              ) : currentChannel.type === 'public' ? (
                <Hash className="w-5 h-5 text-gray-600" />
              ) : (
                <Circle className="w-3 h-3 text-green-500 fill-current" />
              )}
              <h3 className="font-semibold text-gray-900">
                {currentChannel.type === 'dm' ? '' : '#'}{currentChannel.name}
              </h3>
              {currentChannel.members && (
                <span className="text-sm text-gray-500">{currentChannel.members}명</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {currentChannel.type !== 'dm' && (selectedChannel === 'general' || selectedChannel === 'dev-team') && showAIInvite && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAIInvite(false)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
                >
                  <Bot className="w-4 h-4" />
                  Pulse AI 초대하기
                </motion.button>
              )}
              <button className="p-2 hover:bg-gray-100 rounded">
                <Phone className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded">
                <Video className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded">
                <Bell className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <AnimatePresence>
              {messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-3 ${msg.user === '나' ? 'flex-row-reverse' : ''}`}
                >
                  {!msg.isSystem && (
                    <div className="text-2xl flex-shrink-0">{msg.avatar}</div>
                  )}
                  <div className={`flex-1 ${msg.user === '나' ? 'text-right' : ''}`}>
                    {msg.isSystem ? (
                      <div className="flex items-center justify-center">
                        <div className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-sm">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className={`font-medium ${msg.isAI ? 'text-purple-600' : 'text-gray-900'}`}>
                            {msg.user}
                          </span>
                          <span className="text-xs text-gray-500">{msg.timestamp}</span>
                          {msg.modelInfo && (
                            <span className="text-xs text-purple-500 bg-purple-50 px-2 py-0.5 rounded">
                              {msg.modelInfo}
                            </span>
                          )}
                          {msg.status && msg.user === '나' && (
                            <span className="text-xs text-gray-400">
                              {msg.status === 'sending' ? '전송 중...' : 
                               msg.status === 'sent' ? <CheckCheck className="inline w-3 h-3" /> : 
                               <CheckCheck className="inline w-3 h-3 text-blue-500" />}
                            </span>
                          )}
                        </div>
                        <div className={`inline-block ${msg.user === '나' ? 'text-left' : ''}`}>
                          <div className={`px-4 py-2 rounded-lg ${
                            msg.user === '나' 
                              ? 'bg-blue-600 text-white' 
                              : msg.isAI 
                                ? 'bg-purple-100 text-purple-900'
                                : 'bg-gray-100 text-gray-900'
                          }`}>
                            {msg.content}
                          </div>
                          {msg.attachments && (
                            <div className="mt-2 space-y-2">
                              {msg.attachments.map((att, i) => (
                                <div key={i}>
                                  {att.type === 'file' ? (
                                    <motion.div 
                                      whileHover={{ scale: 1.02 }}
                                      className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100"
                                    >
                                      <FileText className="w-5 h-5 text-blue-600" />
                                      <span className="text-sm text-gray-700 font-medium">{att.name}</span>
                                      <Download className="w-4 h-4 text-gray-400 ml-auto" />
                                    </motion.div>
                                  ) : att.type === 'code' ? (
                                    <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-green-400 flex items-center gap-1">
                                          <Code className="w-4 h-4" />
                                          {att.name}
                                        </span>
                                      </div>
                                      <pre className="whitespace-pre-wrap">{att.content}</pre>
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          )}
                          {msg.reactions && (
                            <div className="flex gap-1 mt-2">
                              {msg.reactions.map((reaction, i) => (
                                <motion.button
                                  key={i}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs"
                                >
                                  <span>{reaction.emoji}</span>
                                  <span className="text-gray-600">{reaction.count}</span>
                                </motion.button>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-sm text-gray-500"
              >
                <div className="flex gap-1">
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                    className="w-2 h-2 bg-purple-400 rounded-full"
                  />
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                    className="w-2 h-2 bg-purple-400 rounded-full"
                  />
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                    className="w-2 h-2 bg-purple-400 rounded-full"
                  />
                </div>
                <span>Pulse AI가 입력 중...</span>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="px-6 py-4 border-t border-gray-200 bg-white">
            <div className="flex items-end gap-2">
              <button className="p-2 hover:bg-gray-100 rounded">
                <Paperclip className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex-1 relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="메시지를 입력하세요... (@AI로 AI 어시스턴트 호출)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={1}
                />
              </div>
              <div className="relative">
                <button 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <Smile className="w-5 h-5 text-gray-600" />
                </button>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute bottom-full right-0 mb-2 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
                  >
                    <div className="grid grid-cols-4 gap-1">
                      {emojis.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => {
                            setMessage(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                          className="p-2 hover:bg-gray-100 rounded text-xl"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSendMessage}
                disabled={!message.trim()}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamChatPreview;