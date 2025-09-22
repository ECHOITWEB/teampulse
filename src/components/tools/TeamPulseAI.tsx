import React, { useState, useEffect } from 'react';
import { Send, Bot, User, Loader, AlertCircle } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatLimit {
  count: number;
  timestamp: number;
}

const TeamPulseAI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '안녕하세요! TeamPulse AI입니다. 무엇을 도와드릴까요? 💬'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  // Check and load chat limit from localStorage on component mount
  useEffect(() => {
    const checkChatLimit = () => {
      const limitKey = 'teampulse_chat_limit';
      const storedLimit = localStorage.getItem(limitKey);
      
      if (storedLimit) {
        const limit: ChatLimit = JSON.parse(storedLimit);
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        // Check if 24 hours have passed
        if (now - limit.timestamp > twentyFourHours) {
          // Reset the limit
          localStorage.removeItem(limitKey);
          setMessageCount(0);
          setIsBlocked(false);
        } else {
          // Still within 24 hours
          setMessageCount(limit.count);
          if (limit.count >= 3) {
            setIsBlocked(true);
          }
        }
      }
    };
    
    checkChatLimit();
  }, []);

  // Save chat limit to localStorage
  const saveChatLimit = (count: number) => {
    const limitKey = 'teampulse_chat_limit';
    const limit: ChatLimit = {
      count: count,
      timestamp: Date.now()
    };
    localStorage.setItem(limitKey, JSON.stringify(limit));
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    // Check if blocked
    if (isBlocked || messageCount >= 3) {
      alert('24시간 동안 3개의 메시지 한도를 초과했습니다. 내일 다시 시도해주세요!');
      return;
    }

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    const newCount = messageCount + 1;
    setMessageCount(newCount);
    saveChatLimit(newCount);
    
    if (newCount >= 3) {
      setIsBlocked(true);
    }

    try {
      // Simulate API call with mock responses
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const responses = [
        '좋은 질문이네요! TeamPulse는 팀 협업을 위한 최고의 도구입니다. OKR 관리, 실시간 채팅, AI 기반 분석 등 다양한 기능을 제공합니다.',
        '그것에 대해 더 자세히 설명드리겠습니다. TeamPulse의 AI 기능은 회의록 자동 생성, 데이터 분석, 문서 번역 등을 포함합니다. 생산성을 크게 향상시킬 수 있죠!',
        'TeamPulse Pro를 사용하시면 더 많은 고급 기능을 이용하실 수 있습니다. 무제한 메시지, 팀 협업 도구, 고급 분석 기능 등이 포함되어 있습니다. 지금 바로 업그레이드해보세요!'
      ];

      const assistantMessage: Message = {
        role: 'assistant',
        content: responses[newCount - 1] || '더 많은 기능을 원하시면 TeamPulse Pro를 이용해주세요!'
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Don't send message if Korean/IME composition is in progress
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  // Calculate remaining time
  const getRemainingTime = () => {
    const limitKey = 'teampulse_chat_limit';
    const storedLimit = localStorage.getItem(limitKey);
    
    if (storedLimit) {
      const limit: ChatLimit = JSON.parse(storedLimit);
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      const elapsed = now - limit.timestamp;
      const remaining = twentyFourHours - elapsed;
      
      if (remaining > 0) {
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        return `${hours}시간 ${minutes}분`;
      }
    }
    return null;
  };

  const remainingTime = getRemainingTime();

  return (
    <div className="flex flex-col h-[600px] max-w-4xl mx-auto">
      {/* Chat Messages - removed overflow-y-auto to prevent auto-scrolling */}
      <div className="flex-1 p-4 space-y-4 bg-gray-50 rounded-t-xl" style={{ overflowY: 'auto' }}>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex items-start gap-3 max-w-[80%] ${
                message.role === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-blue-500'
                    : 'bg-gradient-to-br from-purple-500 to-pink-500'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>
              <div
                className={`px-4 py-2 rounded-xl ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-800 shadow-sm'
                }`}
              >
                {message.content}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-start gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="px-4 py-2 bg-white rounded-xl shadow-sm">
                <Loader className="w-5 h-5 animate-spin text-gray-500" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message Counter */}
      {(messageCount > 0 || isBlocked) && (
        <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-200">
          <div className="flex items-center gap-2 text-sm text-yellow-800">
            <AlertCircle className="w-4 h-4" />
            {isBlocked ? (
              <span className="font-semibold">
                메시지 한도에 도달했습니다. {remainingTime && `${remainingTime} 후에 다시 사용 가능합니다.`}
              </span>
            ) : (
              <span>데모 메시지 {messageCount}/3 사용</span>
            )}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200 rounded-b-xl">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={isBlocked ? "24시간 후에 다시 사용 가능합니다" : "메시지를 입력하세요..."}
            disabled={loading || isBlocked}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || !input.trim() || isBlocked}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeamPulseAI;