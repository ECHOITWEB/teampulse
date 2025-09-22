import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Hash, Bot, Send, Paperclip, X, ChevronRight, 
  Brain, TrendingUp, Calendar, FileText, Search,
  Settings, Plus, Clock, Star, ChevronDown, MessageSquare, Wrench
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { 
  collection, addDoc, query, where, orderBy, onSnapshot, 
  doc, updateDoc, deleteDoc, serverTimestamp, getDocs, limit, increment 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import StreamingChat from '../components/ai/StreamingChat';
import StructuredOutputTools from '../components/ai/StructuredOutputTools';
import ReactMarkdown from 'react-markdown';
import langchainEnhancedService from '../services/langchainEnhancedService';

// Agent Types
interface Agent {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'planning' | 'research' | 'analysis' | 'execution' | 'support';
  systemPrompt: string;
  suggestedPrompts: string[];
  model?: string;
}

// Message Types
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  agentId?: string;
  timestamp: any;
  attachments?: Attachment[];
  status?: 'sending' | 'sent' | 'error';
  isStreaming?: boolean;
  metadata?: {
    tokens?: number;
    model?: string;
    cost?: number;
  };
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

interface Session {
  id: string;
  agentId: string;
  title: string;
  lastMessage: string;
  timestamp: any;
  messageCount: number;
  isPinned?: boolean;
}

// Available Agents
const agents: Agent[] = [
  {
    id: 'planner',
    name: '기획 에이전트',
    description: '프로젝트 계획 수립 및 작업 분해',
    icon: <Calendar className="w-5 h-5" />,
    category: 'planning',
    systemPrompt: '당신은 전문 프로젝트 기획자입니다. 목표를 세분화하고 실행 가능한 단계로 분해하며, 일정과 우선순위를 설정합니다.',
    suggestedPrompts: [
      '신제품 출시 3개월 계획 수립해줘',
      '마케팅 캠페인 실행 계획 작성해줘',
      '팀 워크샵 일정과 아젠다 만들어줘'
    ],
    model: 'gpt-4o'
  },
  {
    id: 'researcher',
    name: '리서치 에이전트',
    description: '시장 조사 및 경쟁사 분석',
    icon: <Search className="w-5 h-5" />,
    category: 'research',
    systemPrompt: '당신은 전문 리서처입니다. 시장 동향, 경쟁사 분석, 고객 니즈를 조사하고 인사이트를 제공합니다.',
    suggestedPrompts: [
      'AI 시장 트렌드 분석해줘',
      '경쟁사 제품 비교 분석해줘',
      '타겟 고객층 특성 조사해줘'
    ],
    model: 'gpt-4o'
  },
  {
    id: 'analyst',
    name: '데이터 분석가',
    description: '데이터 분석 및 인사이트 도출',
    icon: <TrendingUp className="w-5 h-5" />,
    category: 'analysis',
    systemPrompt: '당신은 데이터 분석 전문가입니다. 데이터를 분석하고 시각화하며 비즈니스 인사이트를 도출합니다.',
    suggestedPrompts: [
      '매출 데이터 분석하고 트렌드 찾아줘',
      'KPI 대시보드 구성 제안해줘',
      '고객 행동 패턴 분석해줘'
    ],
    model: 'gpt-4o'
  },
  {
    id: 'executor',
    name: '실행 도우미',
    description: '작업 실행 및 프로세스 자동화',
    icon: <Brain className="w-5 h-5" />,
    category: 'execution',
    systemPrompt: '당신은 실행 전문가입니다. 작업을 효율적으로 수행하고 프로세스를 자동화하며 체크리스트를 관리합니다.',
    suggestedPrompts: [
      '프로젝트 체크리스트 만들어줘',
      '이메일 템플릿 작성해줘',
      '미팅 액션 아이템 정리해줘'
    ],
    model: 'gpt-4o'
  },
  {
    id: 'writer',
    name: '문서 작성자',
    description: '보고서 및 문서 작성 지원',
    icon: <FileText className="w-5 h-5" />,
    category: 'support',
    systemPrompt: '당신은 전문 테크니컬 라이터입니다. 명확하고 구조적인 문서를 작성하며 다양한 형식의 보고서를 생성합니다.',
    suggestedPrompts: [
      '주간 업무 보고서 작성해줘',
      '제안서 초안 만들어줘',
      '프레젠테이션 스크립트 작성해줘'
    ],
    model: 'gpt-4o'
  }
];

const AIToolsRedesigned: React.FC = () => {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  // State
  const [activeTab, setActiveTab] = useState<'agents' | 'streaming' | 'structured'>('agents');
  const [selectedAgent, setSelectedAgent] = useState<Agent>(agents[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showAgentList, setShowAgentList] = useState(true);
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load sessions from Firestore
  useEffect(() => {
    if (!currentWorkspace || !user) return;

    const q = query(
      collection(db, 'ai_agent_sessions'),
      where('workspace_id', '==', currentWorkspace.id),
      where('user_id', '==', user.id),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionData: Session[] = [];
      snapshot.forEach((doc) => {
        sessionData.push({ id: doc.id, ...doc.data() } as Session);
      });
      setSessions(sessionData);
    });

    return () => unsubscribe();
  }, [currentWorkspace, user]);

  // Load messages for current session
  useEffect(() => {
    if (!currentSessionId || !currentWorkspace) return;

    const q = query(
      collection(db, 'ai_agent_messages'),
      where('session_id', '==', currentSessionId),
      where('workspace_id', '==', currentWorkspace.id),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageData: Message[] = [];
      snapshot.forEach((doc) => {
        messageData.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(messageData);
    });

    return () => unsubscribe();
  }, [currentSessionId, currentWorkspace]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Create new session
  const createNewSession = async (agent: Agent, firstMessage: string) => {
    if (!currentWorkspace || !user) return null;

    const sessionData = {
      workspace_id: currentWorkspace.id,
      user_id: user.id,
      agentId: agent.id,
      title: firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : ''),
      lastMessage: firstMessage,
      timestamp: serverTimestamp(),
      messageCount: 0
    };

    const docRef = await addDoc(collection(db, 'ai_agent_sessions'), sessionData);
    return docRef.id;
  };

  // Send message with streaming support
  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentWorkspace || !user) return;

    const messageContent = inputMessage.trim();
    setInputMessage('');
    setIsTyping(true);

    try {
      // Create session if needed
      let sessionId = currentSessionId;
      if (!sessionId) {
        sessionId = await createNewSession(selectedAgent, messageContent);
        setCurrentSessionId(sessionId);
      }

      // Add user message immediately to UI
      const userMessageTemp: Message = {
        id: `temp-${Date.now()}`,
        content: messageContent,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessageTemp]);

      // Add user message to Firestore
      const userMessage = {
        workspace_id: currentWorkspace.id,
        session_id: sessionId,
        content: messageContent,
        sender: 'user' as const,
        timestamp: serverTimestamp(),
        attachments: []
      };

      await addDoc(collection(db, 'ai_agent_messages'), userMessage);

      // Create temporary agent message for streaming
      const agentMessageTemp: Message = {
        id: `temp-agent-${Date.now()}`,
        content: '',
        sender: 'agent',
        agentId: selectedAgent.id,
        timestamp: new Date(),
        isStreaming: true,
      };
      setMessages(prev => [...prev, agentMessageTemp]);

      // Use enhanced streaming service
      let fullResponse = '';
      await langchainEnhancedService.streamChat(
        messageContent,
        'openai',
        selectedAgent.systemPrompt,
        sessionId || undefined,
        {
          onToken: (token) => {
            fullResponse += token;
            setMessages(prev => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.sender === 'agent') {
                lastMsg.content = fullResponse;
              }
              return updated;
            });
          },
          onComplete: async (fullText) => {
            // Calculate Pulse usage (대략적인 계산: 10원 = 1 Pulse)
            // 입력 토큰: 메시지 길이 / 4 (대략)
            // 출력 토큰: 응답 길이 / 4 (대략)
            const inputTokens = Math.ceil(messageContent.length / 4);
            const outputTokens = Math.ceil(fullText.length / 4);
            
            // GPT-4o 기준: 입력 $0.005/1K tokens, 출력 $0.015/1K tokens
            // 1 Pulse = 10원 = $0.0075 (환율 1300원 기준)
            // 입력: 0.005/1000 * inputTokens / 0.0075 = inputTokens * 0.67 / 1000
            // 출력: 0.015/1000 * outputTokens / 0.0075 = outputTokens * 2 / 1000
            const pulseUsed = Math.max(1, Math.ceil(
              (inputTokens * 0.67 + outputTokens * 2) / 100
            ));

            // Pulse 차감 (workspace 문서 업데이트)
            if (currentWorkspace?.id) {
              try {
                await updateDoc(doc(db, 'workspaces', currentWorkspace.id), {
                  pulse_balance: increment(-pulseUsed),
                  pulse_usage_this_month: increment(pulseUsed),
                  last_ai_usage: serverTimestamp()
                });
                
                // 사용 기록 저장
                await addDoc(collection(db, 'pulse_usage_logs'), {
                  workspace_id: currentWorkspace.id,
                  user_id: user?.firebase_uid,
                  user_name: user?.name || user?.email,
                  operation_type: 'ai_chat',
                  model: 'gpt-4o',
                  input_tokens: inputTokens,
                  output_tokens: outputTokens,
                  pulses_used: pulseUsed,
                  timestamp: serverTimestamp()
                });
              } catch (error) {
                console.error('Failed to update Pulse balance:', error);
              }
            }

            // Save complete response to Firestore
            const agentMessage = {
              workspace_id: currentWorkspace.id,
              session_id: sessionId,
              content: fullText,
              sender: 'agent' as const,
              agentId: selectedAgent.id,
              timestamp: serverTimestamp(),
              metadata: {
                model: 'gpt-4o',
                tokens: inputTokens + outputTokens,
                pulseUsed
              }
            };

            await addDoc(collection(db, 'ai_agent_messages'), agentMessage);

            // Update streaming status
            setMessages(prev => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.sender === 'agent') {
                lastMsg.isStreaming = false;
              }
              return updated;
            });

            // Update session
            if (sessionId) {
              await updateDoc(doc(db, 'ai_agent_sessions', sessionId), {
                lastMessage: fullText.substring(0, 100),
                timestamp: serverTimestamp(),
                messageCount: messages.length + 2
              });
            }
          },
          onError: (error) => {
            console.error('Streaming error:', error);
            setMessages(prev => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.sender === 'agent') {
                lastMsg.content = `Error: ${error.message}`;
                lastMsg.isStreaming = false;
              }
              return updated;
            });
          },
        }
      );

    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: '죄송합니다. 메시지 처리 중 오류가 발생했습니다.',
        sender: 'agent',
        agentId: selectedAgent.id,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Select session
  const selectSession = async (session: Session) => {
    setCurrentSessionId(session.id);
    const agent = agents.find(a => a.id === session.agentId);
    if (agent) {
      setSelectedAgent(agent);
    }
    setShowSessionHistory(false);
  };

  // Start new chat
  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-50">
      {/* Tab Navigation */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('agents')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'agents'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Bot className="w-5 h-5" />
            AI 에이전트
          </button>
          <button
            onClick={() => setActiveTab('streaming')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'streaming'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            스트리밍 채팅
          </button>
          <button
            onClick={() => setActiveTab('structured')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'structured'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Wrench className="w-5 h-5" />
            구조화 도구
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'agents' && (
          <div className="h-full flex bg-white">
            {/* 왼쪽 사이드바 - 에이전트 목록 */}
            <div className={`${showAgentList ? 'w-64' : 'w-16'} transition-all duration-300 bg-slate-800 text-white flex flex-col`}>
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className={`text-base font-semibold text-white ${showAgentList ? 'block' : 'hidden'}`}>
              AI 도구
            </h2>
            <button
              onClick={() => setShowAgentList(!showAgentList)}
              className="p-1 hover:bg-slate-700 rounded"
            >
              <ChevronRight className={`w-5 h-5 transform transition-transform ${showAgentList ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* New Chat Button */}
          <div className="p-3">
            <button
              onClick={startNewChat}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors ${
                !showAgentList ? 'justify-center' : ''
              }`}
            >
              <Plus className="w-5 h-5" />
              {showAgentList && <span>새 대화 시작</span>}
            </button>
          </div>

          {/* Agent List */}
          <div className="px-3 pb-3">
            <div className={`text-xs text-slate-400 uppercase tracking-wide mb-2 ${showAgentList ? 'block' : 'hidden'}`}>
              에이전트 선택
            </div>
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => {
                  setSelectedAgent(agent);
                  startNewChat();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 ${
                  selectedAgent.id === agent.id
                    ? 'bg-slate-700 text-white'
                    : 'hover:bg-slate-700/50 text-slate-300'
                } ${!showAgentList ? 'justify-center' : ''}`}
              >
                <div className="flex-shrink-0">{agent.icon}</div>
                {showAgentList && (
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-medium truncate">{agent.name}</div>
                    <div className="text-xs text-slate-400 truncate">{agent.description}</div>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Recent Sessions */}
          {showAgentList && sessions.length > 0 && (
            <div className="px-3 pb-3 border-t border-slate-700 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 uppercase tracking-wide">최근 대화</span>
                <button
                  onClick={() => setShowSessionHistory(!showSessionHistory)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  {showSessionHistory ? '접기' : '모두 보기'}
                </button>
              </div>
              <div className="space-y-1">
                {sessions.slice(0, showSessionHistory ? 10 : 3).map((session) => {
                  const agent = agents.find(a => a.id === session.agentId);
                  return (
                    <button
                      key={session.id}
                      onClick={() => selectSession(session)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-slate-700/50 transition-colors ${
                        currentSessionId === session.id ? 'bg-slate-700' : ''
                      }`}
                    >
                      <div className="flex-shrink-0 text-slate-400">
                        {agent?.icon || <Bot className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate text-slate-200">{session.title}</div>
                        <div className="text-xs text-slate-500 truncate">{session.lastMessage}</div>
                      </div>
                      {session.isPinned && <Star className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* User info */}
        <div className="p-3 border-t border-slate-700">
          <div className={`flex items-center gap-3 ${!showAgentList ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">
                {user?.displayName?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            {showAgentList && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{user?.displayName}</div>
                <div className="text-xs text-slate-400 truncate">{currentWorkspace?.name}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 메인 채팅 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 채팅 헤더 */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg">
              {selectedAgent.icon}
            </div>
            <div className="flex flex-col justify-center">
              <h2 className="text-sm font-semibold text-gray-900 leading-tight">{selectedAgent.name}</h2>
              <p className="text-xs text-gray-500">{selectedAgent.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              온라인
            </span>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Settings className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl mb-4">
                {selectedAgent.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {selectedAgent.name}와 대화를 시작하세요
              </h3>
              <p className="text-gray-500 mb-6 max-w-md">
                {selectedAgent.description}
              </p>
              
              {/* Suggested Prompts */}
              <div className="space-y-2 w-full max-w-md">
                <p className="text-sm text-gray-500 mb-2">추천 질문:</p>
                {selectedAgent.suggestedPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => setInputMessage(prompt)}
                    className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <p className="text-sm text-gray-700">{prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 mb-4 ${
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.sender === 'agent' && (
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                      {selectedAgent.icon}
                    </div>
                  )}
                  
                  <div className={`max-w-2xl ${message.sender === 'user' ? 'order-1' : ''}`}>
                    <div className={`px-4 py-3 rounded-2xl ${
                      message.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {message.sender === 'user' ? (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      ) : (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                          {message.isStreaming && (
                            <span className="inline-block w-2 h-4 bg-gray-500 animate-pulse ml-1" />
                          )}
                        </div>
                      )}
                    </div>
                    
                    {message.metadata && (
                      <div className="mt-1 text-xs text-gray-500 px-2">
                        {message.metadata.model && <span>{message.metadata.model}</span>}
                        {message.metadata.tokens && <span> • {message.metadata.tokens} 토큰</span>}
                        {message.metadata.cost && <span> • ${message.metadata.cost.toFixed(4)}</span>}
                      </div>
                    )}
                  </div>
                  
                  {message.sender === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center order-2">
                      <span className="text-white font-bold text-sm">
                        {user?.displayName?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
              
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 메시지 입력 */}
        <div className="border-t px-6 py-4">
          {/* File upload preview */}
          {uploadedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg">
                  <Paperclip className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{file.name}</span>
                  <button
                    onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={`${selectedAgent.name}에게 메시지 보내기...`}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Paperclip className="w-5 h-5 text-gray-500" />
              </button>
              
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
          </div>
        )}

        {activeTab === 'streaming' && (
          <div className="h-full p-6">
            <div className="max-w-6xl mx-auto h-full">
              <StreamingChat 
                provider="openai"
                systemPrompt="You are a helpful AI assistant for TeamPulse."
                className="h-full"
              />
            </div>
          </div>
        )}

        {activeTab === 'structured' && (
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <StructuredOutputTools 
                provider="openai"
                onExport={(data, type) => {
                  console.log(`Exported ${type} data:`, data);
                  // Here you can integrate with your existing data storage
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIToolsRedesigned;