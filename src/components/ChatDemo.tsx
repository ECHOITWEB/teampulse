import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: number;
  type: 'team' | 'ai';
  user?: string;
  avatar?: string;
  content: string;
  timestamp: string;
  typing?: boolean;
}

const ChatDemo: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const demoConversation: Message[] = [
    {
      id: 1,
      type: 'team',
      user: '김지훈',
      avatar: '👨‍💼',
      content: '다음 분기 마케팅 전략에 대해 논의해야 할 것 같은데요. AI에게 시장 분석을 요청해볼까요?',
      timestamp: '오전 10:23'
    },
    {
      id: 2,
      type: 'ai',
      content: '네, 도와드리겠습니다! 최신 시장 트렌드를 분석해드리겠습니다. 🔍\n\n📊 **2024 Q2 시장 분석 요약:**\n• 모바일 커머스 성장률 32% ↑\n• Z세대 구매력 전년 대비 45% 증가\n• 지속가능성 중시 소비자 78%\n\n어떤 부분을 더 자세히 알아보시겠어요?',
      timestamp: '오전 10:24'
    },
    {
      id: 3,
      type: 'team',
      user: '이서연',
      avatar: '👩‍💻',
      content: 'Z세대 타겟 마케팅 전략에 대해 더 자세히 알려주세요. 특히 SNS 채널별 전략이 궁금해요.',
      timestamp: '오전 10:25'
    },
    {
      id: 4,
      type: 'ai',
      content: '📱 **Z세대 SNS 채널별 마케팅 전략:**\n\n**Instagram** (사용률 89%)\n• 스토리/릴스 중심 콘텐츠\n• 인플루언서 협업\n• AR 필터 활용\n\n**TikTok** (사용률 76%)\n• 챌린지 캠페인\n• UGC 콘텐츠 활성화\n• 트렌드 즉각 반영\n\n**YouTube Shorts** (급성장 중)\n• 교육적 콘텐츠\n• 브랜드 스토리텔링\n\n💡 **핵심 전략:** 진정성 있는 소통, 사회적 가치 강조, 인터랙티브 콘텐츠',
      timestamp: '오전 10:26'
    },
    {
      id: 5,
      type: 'team',
      user: '박민수',
      avatar: '👨‍🎨',
      content: '좋은 인사이트네요! 이 내용을 바탕으로 다음 주 프레젠테이션 자료를 준비하겠습니다. 감사합니다! 👍',
      timestamp: '오전 10:28'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      if (currentIndex < demoConversation.length) {
        setMessages(prev => [...prev, demoConversation[currentIndex]]);
        setCurrentIndex(prev => prev + 1);
      } else {
        // Reset and loop
        setTimeout(() => {
          setMessages([]);
          setCurrentIndex(0);
        }, 3000);
      }
    }, 2500);

    return () => clearInterval(timer);
  }, [currentIndex]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-lg">마케팅팀 채널</h3>
              <p className="text-blue-100 text-sm">TeamPulse AI와 함께하는 스마트 협업</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-sm">👨‍💼</div>
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-sm">👩‍💻</div>
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-sm">👨‍🎨</div>
              </div>
              <span className="text-white/80 text-sm">+5</span>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="h-[500px] overflow-y-auto p-6 bg-gray-50/50 space-y-4">
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`flex ${message.type === 'team' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[70%] ${message.type === 'team' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg
                      ${message.type === 'ai' 
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg' 
                        : 'bg-gray-100'
                      }`}
                    >
                      {message.type === 'ai' ? '🤖' : message.avatar}
                    </div>
                  </div>

                  {/* Message Bubble */}
                  <div className="flex flex-col gap-1">
                    {message.user && (
                      <span className={`text-xs font-medium ${message.type === 'team' ? 'text-right' : ''} text-gray-600`}>
                        {message.user}
                      </span>
                    )}
                    <div
                      className={`relative px-4 py-3 rounded-2xl shadow-sm
                        ${message.type === 'team'
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-tr-sm'
                          : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
                        }`}
                    >
                      <p className={`text-sm leading-relaxed whitespace-pre-line ${
                        message.type === 'team' ? 'text-white font-medium' : ''
                      }`}>
                        {message.content}
                      </p>
                    </div>
                    <span className={`text-xs text-gray-500 ${message.type === 'team' ? 'text-right' : ''}`}>
                      {message.timestamp}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          {currentIndex < demoConversation.length && currentIndex > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                  🤖
                </div>
                <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100">
                  <div className="flex gap-1">
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      className="w-2 h-2 bg-gray-400 rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                      className="w-2 h-2 bg-gray-400 rounded-full"
                    />
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                      className="w-2 h-2 bg-gray-400 rounded-full"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input Area (Visual Only) */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="메시지를 입력하세요..."
                className="w-full px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled
              />
            </div>
            <button className="text-blue-600 hover:text-blue-700 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="bg-white/80 backdrop-blur rounded-xl p-4 text-center shadow-sm border border-gray-100"
        >
          <div className="text-2xl mb-2">🚀</div>
          <h4 className="font-semibold text-sm text-gray-900">즉각적인 AI 응답</h4>
          <p className="text-xs text-gray-600 mt-1">팀 질문에 실시간 답변</p>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="bg-white/80 backdrop-blur rounded-xl p-4 text-center shadow-sm border border-gray-100"
        >
          <div className="text-2xl mb-2">📊</div>
          <h4 className="font-semibold text-sm text-gray-900">데이터 기반 인사이트</h4>
          <p className="text-xs text-gray-600 mt-1">정확한 분석과 제안</p>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="bg-white/80 backdrop-blur rounded-xl p-4 text-center shadow-sm border border-gray-100"
        >
          <div className="text-2xl mb-2">🤝</div>
          <h4 className="font-semibold text-sm text-gray-900">팀 협업 강화</h4>
          <p className="text-xs text-gray-600 mt-1">AI와 함께하는 스마트워크</p>
        </motion.div>
      </div>
    </div>
  );
};

export default ChatDemo;