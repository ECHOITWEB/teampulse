import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, Paperclip, Sparkles, Hash, Lock, AtSign,
  Send, Plus, Smile, Code, Image, FileText,
  BarChart, Vote, GitBranch, GitCommit, Zap, Star, X
} from 'lucide-react';

interface Message {
  id: number;
  user: string;
  avatar: string;
  content: string | React.ReactNode;
  time: string;
  isSystem?: boolean;
  isAI?: boolean;
  reactions?: { emoji: string; count: number }[];
  attachment?: { type: string; name: string; preview?: string };
}

const TeamChatShowcase: React.FC = () => {
  const [currentChannelIndex, setCurrentChannelIndex] = useState(0);
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // 채널 데이터
  const channels = [
    {
      name: 'general',
      members: 24,
      icon: <Hash className="w-4 h-4" />,
      messages: [
        {
          id: 1,
          user: 'Mina',
          avatar: 'M',
          content: '안녕하세요! 오늘 스프린트 미팅 있는거 맞죠?',
          time: '10:00'
        },
        {
          id: 2,
          user: 'Hayden',
          avatar: 'H',
          content: '네 맞아요! 10시에 시작합니다',
          time: '10:01',
          reactions: [{ emoji: '👍', count: 6 }]
        },
        {
          id: 3,
          user: 'System',
          avatar: '',
          content: 'Hayden이 Pulse AI를 초대했습니다',
          time: '10:02',
          isSystem: true
        },
        {
          id: 4,
          user: 'Pulse AI',
          avatar: '🤖',
          content: (
            <div>
              <p className="font-medium"># general 대화방에 초대되었습니다</p>
              <span className="text-xs text-purple-600 font-semibold">(Model: Claude Sonnet 4)</span>
            </div>
          ),
          time: '10:02',
          isAI: true
        },
        {
          id: 5,
          user: 'Hayden',
          avatar: 'H',
          content: '@AI 예정된 미팅 내역 알려줘',
          time: '10:03'
        },
        {
          id: 6,
          user: 'Pulse AI',
          avatar: '🤖',
          content: (
            <div className="space-y-3">
              <p className="font-semibold text-purple-600">예정된 미팅 내역은 다음과 같습니다:</p>
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 animate-pulse"></div>
                  <div>
                    <p className="font-medium text-gray-800">8월 18일 오전 10시</p>
                    <p className="text-sm text-gray-600">전체 팀 스프린트 미팅</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 animate-pulse"></div>
                  <div>
                    <p className="font-medium text-gray-800">8월 18일 오전 11시</p>
                    <p className="text-sm text-gray-600">개발 팀 미팅</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 animate-pulse"></div>
                  <div>
                    <p className="font-medium text-gray-800">8월 18일 오후 2시</p>
                    <p className="text-sm text-gray-600">대표님 면담 <span className="text-blue-500 font-medium">@Hannah @이희성</span></p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 animate-pulse"></div>
                  <div>
                    <p className="font-medium text-gray-800">8월 19일 오전 10시</p>
                    <p className="text-sm text-gray-600">마케팅팀 외주 미팅</p>
                  </div>
                </div>
              </div>
            </div>
          ),
          time: '10:03',
          isAI: true
        },
        {
          id: 7,
          user: 'Licky',
          avatar: 'L',
          content: '이번 스프린트 목표 달성률이 85%네요. 잘하고 있습니다 👏',
          time: '10:05',
          attachment: { type: 'pdf', name: 'sprint_report.pdf' },
          reactions: [
            { emoji: '👍', count: 3 },
            { emoji: '💪', count: 1 },
            { emoji: '🎉', count: 20 }
          ]
        }
      ]
    },
    {
      name: 'dev-team',
      members: 11,
      icon: <Code className="w-4 h-4" />,
      messages: [
        {
          id: 1,
          user: 'Licky',
          avatar: 'L',
          content: '@Hayden 지금 개발 진척도 체크해주세요',
          time: '11:30'
        },
        {
          id: 2,
          user: 'System',
          avatar: '',
          content: 'Hayden이 Pulse AI를 초대했습니다',
          time: '11:31',
          isSystem: true
        },
        {
          id: 3,
          user: 'Pulse AI',
          avatar: '🤖',
          content: (
            <div>
              <p className="font-medium"># dev-team 대화방에 초대되었습니다</p>
              <span className="text-xs text-blue-600 font-semibold">(Model: GPT-5)</span>
            </div>
          ),
          time: '11:31',
          isAI: true
        },
        {
          id: 4,
          user: 'Hayden',
          avatar: 'H',
          content: '@AI 개발 진척도와 코드 커밋 내역 알려줘',
          time: '11:32'
        },
        {
          id: 5,
          user: 'Pulse AI',
          avatar: '🤖',
          content: (
            <div className="space-y-3">
              <p className="font-semibold text-blue-600">지난 주까지 진행된 진척도 그래프와 커밋 내역입니다:</p>
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-green-400 p-4 rounded-xl font-mono text-sm shadow-lg">
                <div className="flex justify-between mb-3">
                  <span className="text-green-400">+ 추가: 245 줄</span>
                  <span className="text-red-400">- 삭제: 89 줄</span>
                </div>
                <div className="text-blue-400 mb-3">✦ 수정: 156 줄 | 총 코드: 12,456 줄</div>
                <div className="border-t border-gray-700 pt-3">
                  <div className="text-white font-bold mb-2">최근 커밋 로그:</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span>feat: 사용자 인증 모듈 추가</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400">✓</span>
                      <span>fix: 메모리 누수 문제 해결</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400">✓</span>
                      <span>refactor: API 엔드포인트 최적화</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ),
          time: '11:33',
          isAI: true
        },
        {
          id: 6,
          user: 'Linda',
          avatar: 'L',
          content: '이 코드가 반영이 안되어있어요. 추가해서 커밋해주세요',
          time: '11:35',
          attachment: { 
            type: 'code', 
            name: 'AITools.tsx',
            preview: 'const handleAIRequest = async () => { ... }'
          },
          reactions: [
            { emoji: '👍', count: 3 },
            { emoji: '💪', count: 1 },
            { emoji: '🎉', count: 80 }
          ]
        },
        {
          id: 7,
          user: 'Pulse AI',
          avatar: '🤖',
          content: (
            <div className="space-y-3">
              <p className="font-medium">AITools.tsx 코드가 정상적으로 반영되었습니다.</p>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                  <GitBranch className="w-4 h-4" />
                  브랜치 보기
                </button>
                <button className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
                  <GitCommit className="w-4 h-4" />
                  커밋하기
                </button>
              </div>
            </div>
          ),
          time: '11:36',
          isAI: true
        }
      ]
    },
    {
      name: 'marketing',
      members: 8,
      icon: <BarChart className="w-4 h-4" />,
      messages: [
        {
          id: 1,
          user: 'James',
          avatar: 'J',
          content: '@Hannah 마케팅에 사용할 이미지들 확정되었나요?',
          time: '14:00'
        },
        {
          id: 2,
          user: 'Hannah',
          avatar: 'H',
          content: (
            <div className="grid grid-cols-3 gap-2">
              <div 
                className="relative group cursor-pointer overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all"
                onClick={() => setSelectedImage('/image/chatting/generated_1757306711692.png')}
              >
                <img 
                  src="/image/chatting/generated_1757306711692.png" 
                  alt="마케팅 이미지 1"
                  className="w-full h-32 object-cover transition-transform group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white/90 backdrop-blur-sm rounded-full p-2">
                      <Image className="w-5 h-5 text-gray-700" />
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                  1번
                </div>
              </div>
              <div 
                className="relative group cursor-pointer overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all"
                onClick={() => setSelectedImage('/image/chatting/generated_1757306728142.png')}
              >
                <img 
                  src="/image/chatting/generated_1757306728142.png" 
                  alt="마케팅 이미지 2"
                  className="w-full h-32 object-cover transition-transform group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white/90 backdrop-blur-sm rounded-full p-2">
                      <Image className="w-5 h-5 text-gray-700" />
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                  2번
                </div>
              </div>
              <div 
                className="relative group cursor-pointer overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all"
                onClick={() => setSelectedImage('/image/chatting/generated_1757306745558.png')}
              >
                <img 
                  src="/image/chatting/generated_1757306745558.png" 
                  alt="마케팅 이미지 3"
                  className="w-full h-32 object-cover transition-transform group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white/90 backdrop-blur-sm rounded-full p-2">
                      <Image className="w-5 h-5 text-gray-700" />
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 bg-cyan-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                  3번
                </div>
              </div>
            </div>
          ),
          time: '14:02'
        },
        {
          id: 3,
          user: 'Hannah',
          avatar: 'H',
          content: '이 중에서 선택해주시겠어요?',
          time: '14:02'
        },
        {
          id: 4,
          user: 'Jandi',
          avatar: 'J',
          content: '저는 1번이요',
          time: '14:05'
        },
        {
          id: 5,
          user: 'Hometax',
          avatar: 'H',
          content: '저는 3번이 좋습니다',
          time: '14:06'
        },
        {
          id: 6,
          user: 'System',
          avatar: '',
          content: 'James가 Pulse AI를 초대했습니다',
          time: '14:07',
          isSystem: true
        },
        {
          id: 7,
          user: 'Pulse AI',
          avatar: '🤖',
          content: (
            <div>
              <p className="font-medium"># marketing 대화방에 초대되었습니다</p>
              <span className="text-xs text-green-600 font-semibold">(Model: GPT-4.1)</span>
            </div>
          ),
          time: '14:07',
          isAI: true
        },
        {
          id: 8,
          user: 'James',
          avatar: 'J',
          content: '@AI 1,2,3 번 투표 만들어줘',
          time: '14:08'
        },
        {
          id: 9,
          user: 'Pulse AI',
          avatar: '🤖',
          content: (
            <div className="space-y-3">
              <p className="font-semibold text-green-600">투표창을 생성하겠습니다:</p>
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Vote className="w-5 h-5 text-purple-600" />
                  <span className="font-bold text-gray-800">마케팅 이미지 선택</span>
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">1번 이미지</span>
                      <span className="text-sm font-bold text-purple-600">5표 (55%)</span>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" style={{ width: '55%' }}></div>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">2번 이미지</span>
                      <span className="text-sm font-bold text-gray-600">2표 (22%)</span>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-gray-400 to-gray-500 rounded-full" style={{ width: '22%' }}></div>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">3번 이미지</span>
                      <span className="text-sm font-bold text-gray-600">2표 (22%)</span>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-gray-400 to-gray-500 rounded-full" style={{ width: '22%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ),
          time: '14:09',
          isAI: true
        },
        {
          id: 10,
          user: 'Hannah',
          avatar: 'H',
          content: '1번으로 확정할게요. @AI 투표 종료해줘',
          time: '14:15'
        },
        {
          id: 11,
          user: 'Pulse AI',
          avatar: '🤖',
          content: (
            <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <span className="font-bold text-green-700">[투표 결과] 1번</span>
              <span className="text-2xl">🎉</span>
            </div>
          ),
          time: '14:15',
          isAI: true
        }
      ]
    }
  ];

  const currentChannel = channels[currentChannelIndex];

  // 채널 변경 시 메시지 초기화
  useEffect(() => {
    setDisplayedMessages([]);
    setCurrentMessageIndex(0);
  }, [currentChannelIndex]);

  // 메시지 애니메이션 처리
  useEffect(() => {
    if (currentMessageIndex < currentChannel.messages.length) {
      const message = currentChannel.messages[currentMessageIndex];
      
      // 타이핑 애니메이션 표시
      if (!message.isSystem) {
        setIsTyping(true);
        setTypingUser(message.isAI ? 'Pulse AI' : message.user);
      }

      const timer = setTimeout(() => {
        // 메시지 추가
        setIsTyping(false);
        setDisplayedMessages(prev => [...prev, message]);
        setCurrentMessageIndex(prev => prev + 1);
      }, message.isSystem ? 100 : 1000);

      return () => clearTimeout(timer);
    }
  }, [currentMessageIndex, currentChannel.messages]);

  // 스크롤 처리
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [displayedMessages]);

  return (
    <section className="py-24 bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 overflow-hidden relative">
      {/* 배경 애니메이션 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-300/30 to-blue-300/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-cyan-300/30 to-purple-300/30 rounded-full blur-3xl animate-pulse" />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* 헤더 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-white text-sm font-medium mb-6 shadow-lg"
          >
            <Sparkles className="w-4 h-4" />
            AI 기반 실시간 팀 협업
            <Sparkles className="w-4 h-4" />
          </motion.div>
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
              AI와 함께하는 스마트 채팅
            </span>
          </h2>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
            <span className="font-semibold text-purple-600">@AI 멘션</span>만으로 언제든지 AI를 대화에 초대하세요.
            <br className="hidden sm:block" />
            회의 일정, 코드 리뷰, 투표 생성까지 모든 업무를 채팅으로 해결합니다.
          </p>
        </motion.div>

        {/* 채팅 인터페이스 */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative"
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-white/50">
            <div className="flex h-[700px] relative">
              {/* 사이드바 */}
              <div className="w-72 bg-gradient-to-b from-purple-900/95 to-blue-900/95 backdrop-blur-md text-white p-5">
                <div className="mb-6">
                  <h3 className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-3">채널명</h3>
                  <div className="space-y-1">
                    {channels.map((channel, index) => (
                      <button
                        key={channel.name}
                        onClick={() => setCurrentChannelIndex(index)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all hover:bg-white/10 ${
                          currentChannelIndex === index 
                            ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white' 
                            : 'text-purple-200 hover:text-white'
                        }`}
                      >
                        {channel.icon}
                        <span className="font-medium"># {channel.name}</span>
                      </button>
                    ))}
                    <div className="flex items-center gap-2 px-3 py-2.5 text-purple-200/50 opacity-60 cursor-not-allowed">
                      <Lock className="w-4 h-4" />
                      <span className="font-medium"># project-secret</span>
                      <Lock className="w-3 h-3 ml-auto" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-3">Direct Messages</h3>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-3 py-2 text-purple-200">
                      <span>@Licky</span>
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">5</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 text-purple-200">
                      <span>@Mina</span>
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">3</span>
                    </div>
                    <div className="px-3 py-2 text-purple-200">@Hayden</div>
                    <div className="flex items-center justify-between px-3 py-2 text-purple-200">
                      <span>@Hannah</span>
                      <span className="text-xs text-purple-300">2days ago</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 text-purple-200">
                      <span>@이희성</span>
                      <span className="text-xs text-purple-300">6days ago</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 채팅 영역 */}
              <div className="flex-1 flex flex-col">
                {/* 채널 헤더 */}
                <div className="bg-white/70 backdrop-blur-sm border-b border-gray-200/50 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900"># {currentChannel.name}</h2>
                      <span className="text-xs text-gray-600">{currentChannel.members}명이 활동 중</span>
                    </div>
                    <button className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-sm font-bold flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      Pulse AI 초대하기
                    </button>
                  </div>
                </div>

                {/* 메시지 영역 */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  <AnimatePresence>
                    {displayedMessages.map((message) => (
                      <motion.div
                        key={`${currentChannelIndex}-${message.id}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`flex items-start gap-3 ${message.isSystem ? 'justify-center' : ''}`}
                      >
                        {message.isSystem ? (
                          <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm">
                            {message.content}
                          </div>
                        ) : (
                          <>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
                              message.isAI ? 'bg-gradient-to-br from-purple-600 to-blue-600' : 'bg-gradient-to-br from-gray-600 to-gray-700'
                            }`}>
                              {message.isAI ? '🤖' : message.avatar}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="font-bold text-gray-900">{message.user}</span>
                                <span className="text-xs text-gray-500">{message.time}</span>
                              </div>
                              <div className="text-gray-700">{message.content}</div>
                              {message.attachment && (
                                <div className="mt-2">
                                  {message.attachment.type === 'pdf' && (
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl">
                                      <FileText className="w-4 h-4 text-red-500" />
                                      <span className="text-sm font-medium text-red-700">{message.attachment.name}</span>
                                    </div>
                                  )}
                                  {message.attachment.type === 'code' && (
                                    <div className="mt-2 p-4 bg-gray-900 text-green-400 rounded-xl font-mono text-sm">
                                      <div className="text-purple-400 text-xs mb-2">{message.attachment.name}</div>
                                      <div>{message.attachment.preview}</div>
                                    </div>
                                  )}
                                </div>
                              )}
                              {message.reactions && (
                                <div className="flex gap-2 mt-2">
                                  {message.reactions.map((reaction, idx) => (
                                    <div key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm">
                                      <span>{reaction.emoji}</span>
                                      <span className="font-medium text-gray-600">{reaction.count}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* 타이핑 인디케이터 */}
                  <AnimatePresence>
                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2 text-gray-500 text-sm"
                      >
                        <span className="font-medium">{typingUser}</span>
                        <span>님이 입력 중</span>
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 입력 영역 */}
                <div className="border-t border-gray-200/50 px-6 py-4 bg-white/50">
                  <div className="flex items-center gap-3">
                    <button className="p-2 text-gray-500 hover:text-purple-600">
                      <Plus className="w-5 h-5" />
                    </button>
                    <input
                      type="text"
                      placeholder="메시지를 입력하세요... (@AI로 AI 호출)"
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      readOnly
                    />
                    <button className="p-2 text-gray-500 hover:text-blue-600">
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-yellow-500">
                      <Smile className="w-5 h-5" />
                    </button>
                    <button className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl">
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 기능 하이라이트 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center mb-4">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">AI 즉시 호출</h3>
            <p className="text-gray-600">@AI 멘션만으로 언제든지 AI 어시스턴트를 대화에 초대할 수 있습니다.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">맥락 이해</h3>
            <p className="text-gray-600">이전 대화 내용을 모두 이해하고 적절한 답변과 액션을 제공합니다.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-green-500 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">즉각 실행</h3>
            <p className="text-gray-600">투표 생성, 일정 확인, 코드 리뷰 등을 채팅에서 바로 처리합니다.</p>
          </motion.div>
        </div>
      </div>

      {/* 이미지 모달 */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all"
              >
                <X className="w-6 h-6 text-gray-700" />
              </button>
              <img 
                src={selectedImage} 
                alt="확대된 이미지"
                className="w-full h-full object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default TeamChatShowcase;