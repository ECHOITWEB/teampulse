import React, { useState, useRef, useEffect } from 'react';
import { createChatCompletion, analyzeFile } from '../../utils/openai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../../services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  file?: {
    name: string;
    type: string;
    content?: string;
  };
}

interface Session {
  id: string;
  session_name: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_at: string | null;
}

const TeamPulseAI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [loadingSession, setLoadingSession] = useState(false);

  useEffect(() => {
    initializeSession();
    loadSessions();
  }, []);

  const initializeSession = async () => {
    try {
      await api.demoLogin();
      // Don't create a new session automatically
    } catch (error) {
      console.error('Failed to initialize:', error);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await api.getChatSessions('teampulse_ai');
      setSessions(response.sessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const sessionName = `대화 ${new Date().toLocaleDateString('ko-KR')} ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
      const session = await api.createChatSession('teampulse_ai', sessionName);
      setSessionId(session.id);
      setMessages([]);
      await loadSessions();
      return session.id;
    } catch (error) {
      console.error('Failed to create session:', error);
      return null;
    }
  };

  const loadSession = async (session: Session) => {
    try {
      setLoadingSession(true);
      const response = await api.getSessionMessages(session.id);
      setSessionId(session.id);
      setMessages(response.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        file: msg.file_info ? JSON.parse(msg.file_info) : undefined
      })));
    } catch (error) {
      console.error('Failed to load session messages:', error);
    } finally {
      setLoadingSession(false);
    }
  };

  const deleteSession = async (sessionIdToDelete: string) => {
    try {
      await api.deleteSession(sessionIdToDelete);
      if (sessionId === sessionIdToDelete) {
        setSessionId(null);
        setMessages([]);
      }
      await loadSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };



  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !attachedFile) return;

    // Create a new session if none exists
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = await createNewSession();
      if (!currentSessionId) return;
    }

    let fileInfo = null;

    if (attachedFile) {
      fileInfo = {
        name: attachedFile.name,
        type: attachedFile.type
      };
    }

    const userMessage: Message = { 
      role: 'user', 
      content: input || '파일을 분석해주세요.',
      file: fileInfo || undefined
    };
    
    setMessages([...messages, userMessage]);
    setInput('');
    const currentFile = attachedFile;
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setLoading(true);

    // Save user message to database
    try {
      await api.sendMessage(currentSessionId, {
        role: 'user',
        content: userMessage.content,
        file_info: fileInfo || undefined
      });
    } catch (error) {
      console.error('Failed to save user message:', error);
    }

    try {
      let response: string = '';

      if (currentFile) {
        // 파일이 있으면 analyzeFile 함수 사용
        response = await analyzeFile(currentFile, input || '이 파일을 분석해주세요.');
      } else {
        // 파일이 없으면 일반 챗 완성
        const chatResponse = await createChatCompletion([
          { role: 'system', content: 'You are TeamPulse AI, a helpful assistant for workplace tasks. Respond in Korean.' },
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: input }
        ]);
        response = chatResponse || '응답을 생성할 수 없습니다.';
      }

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      
      // Save assistant response to database
      try {
        await api.sendMessage(currentSessionId, {
          role: 'assistant',
          content: response,
          tokens_used: response.length // Rough estimate
        });
      } catch (error) {
        console.error('Failed to save assistant message:', error);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* History Sidebar */}
      <div className={`${showHistory ? 'w-64' : 'w-0'} transition-all duration-300 bg-gray-50 border-r overflow-hidden flex flex-col`}>
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">대화 기록</h3>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <button
            onClick={createNewSession}
            className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            + 새 대화 시작
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                sessionId === session.id ? 'bg-blue-100 border-blue-300 border' : 'bg-white hover:bg-gray-100'
              }`}
              onClick={() => loadSession(session)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800 truncate">{session.session_name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(session.updated_at).toLocaleDateString('ko-KR')} {new Date(session.updated_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-gray-400">{session.message_count || 0}개 메시지</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('이 대화를 삭제하시겠습니까?')) {
                      deleteSession(session.id);
                    }
                  }}
                  className="ml-2 text-red-500 hover:text-red-700 text-sm"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b bg-white flex items-center justify-between">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-gray-500 hover:text-gray-700"
          >
            ☰
          </button>
          <h2 className="font-semibold text-gray-800">
            {sessionId ? (sessions.find(s => s.id === sessionId)?.session_name || 'TeamPulse AI') : 'TeamPulse AI'}
          </h2>
          <div className="w-8" />
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!sessionId && messages.length === 0 && (
            <div className="text-center text-gray-500 mt-20">
              <p className="text-lg mb-4">👋 안녕하세요! TeamPulse AI입니다.</p>
              <p>새 대화를 시작하려면 메시지를 입력하거나</p>
              <p>왼쪽 사이드바에서 이전 대화를 선택하세요.</p>
            </div>
          )}
          {loadingSession ? (
            <div className="text-center text-gray-500 mt-20">
              <p>대화를 불러오는 중...</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <div>
                      {message.file && (
                        <div className="mb-2 text-sm text-blue-200">
                          📎 {message.file.name}
                        </div>
                      )}
                      <p>{message.content}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
          {attachedFile && (
            <div className="mb-2 p-2 bg-gray-100 rounded flex items-center justify-between">
              <span className="text-sm text-gray-600">
                📎 {attachedFile.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setAttachedFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                삭제
              </button>
            </div>
          )}
          <div className="flex space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.csv,.xls,.xlsx,image/*"
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer flex items-center"
            >
              📁
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="메시지를 입력하세요..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || (!input.trim() && !attachedFile)}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              전송
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamPulseAI;