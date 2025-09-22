// Streaming Chat Component with Enhanced Features
import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Zap, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import langchainEnhancedService from '../../services/langchainEnhancedService';
import { motion } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface StreamingChatProps {
  provider?: 'openai' | 'anthropic';
  systemPrompt?: string;
  onUsageUpdate?: (tokens: number) => void;
  className?: string;
}

const StreamingChat: React.FC<StreamingChatProps> = ({
  provider = 'openai',
  systemPrompt,
  onUsageUpdate,
  className = '',
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    const assistantMessage: Message = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      if (streamingEnabled) {
        // Streaming mode
        await langchainEnhancedService.streamChat(
          userMessage.content,
          provider,
          systemPrompt,
          sessionId,
          {
            onToken: (token) => {
              setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                  lastMsg.content += token;
                }
                return updated;
              });
            },
            onComplete: (fullText) => {
              setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                  lastMsg.isStreaming = false;
                }
                return updated;
              });
              onUsageUpdate?.(fullText.length / 4); // Rough token estimate
            },
            onError: (error) => {
              console.error('Streaming error:', error);
              setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                  lastMsg.content = `Error: ${error.message}`;
                  lastMsg.isStreaming = false;
                }
                return updated;
              });
            },
          }
        );
      } else {
        // Non-streaming mode with cache
        const response = await langchainEnhancedService.chatWithCache(
          userMessage.content,
          provider,
          systemPrompt,
          cacheEnabled
        );
        
        setMessages(prev => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.content = response;
            lastMsg.isStreaming = false;
          }
          return updated;
        });
        
        onUsageUpdate?.(response.length / 4);
      }
    } catch (error: any) {
      setMessages(prev => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.content = `Error: ${error.message}`;
          lastMsg.isStreaming = false;
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">AI Chat (Enhanced)</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStreamingEnabled(!streamingEnabled)}
              className={`px-3 py-1 text-sm rounded-full flex items-center gap-1 transition-colors ${
                streamingEnabled
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Zap className="w-3 h-3" />
              Streaming
            </button>
            <button
              onClick={() => setCacheEnabled(!cacheEnabled)}
              className={`px-3 py-1 text-sm rounded-full flex items-center gap-1 transition-colors ${
                cacheEnabled
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Clock className="w-3 h-3" />
              Cache
            </button>
            <span className="text-sm text-gray-500 px-3 py-1 bg-purple-100 rounded-full">
              {provider === 'openai' ? 'GPT-4' : 'Claude'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-lg mb-2">채팅을 시작해보세요!</p>
            <p className="text-sm">
              Streaming {streamingEnabled ? 'ON' : 'OFF'} | Cache {cacheEnabled ? 'ON' : 'OFF'}
            </p>
          </div>
        )}
        
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 bg-gray-500 animate-pulse ml-1" />
              )}
              <p className="text-xs mt-1 opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="메시지를 입력하세요..."
            disabled={isStreaming}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        {isStreaming && (
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            AI가 응답 중입니다...
          </p>
        )}
      </div>
    </div>
  );
};

export default StreamingChat;