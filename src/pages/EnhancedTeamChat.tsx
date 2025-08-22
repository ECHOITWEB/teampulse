import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Paperclip, Smile, Hash, Lock, Users, Search, Plus,
  MoreVertical, X, FileText, Bot, Menu, Code, Download,
  ChevronLeft, Shield, UserCheck, Globe, Video, Phone,
  Star, Pin, Archive, Bell, BellOff, Image as ImageIcon,
  File, Play, Pause, Settings, LogOut, ChevronDown, Check,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { cn } from '../utils/cn';
import { 
  collection, doc, addDoc, updateDoc, onSnapshot, 
  query, where, orderBy, limit, serverTimestamp,
  getDoc, getDocs, increment, setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { Channel, Message, Attachment, AI_MODELS } from '../types/chat';
import SlashCommands from '../components/chat/SlashCommands';
import apiService from '../services/api';

interface EnhancedMessage extends Message {
  isTyping?: boolean;
  readBy?: string[];
  editedAt?: Date;
  threadCount?: number;
}

const EnhancedTeamChat: React.FC = () => {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  // State Management
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [messages, setMessages] = useState<EnhancedMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showChannelInfo, setShowChannelInfo] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [showThread, setShowThread] = useState<string | null>(null);
  const [slashCommandOpen, setSlashCommandOpen] = useState(false);
  const [slashCommandQuery, setSlashCommandQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [commandPosition, setCommandPosition] = useState<{ x: number; y: number } | undefined>();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load channels
  useEffect(() => {
    if (!currentWorkspace || !user) return;

    const channelsQuery = query(
      collection(db, 'channels'),
      where('workspaceId', '==', currentWorkspace.id),
      orderBy('lastActivity', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(channelsQuery, (snapshot) => {
      const channelsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Channel));
      
      setChannels(channelsList);
      
      if (!selectedChannelId && channelsList.length > 0) {
        setSelectedChannelId(channelsList[0].id);
      }
    });

    return () => unsubscribe();
  }, [currentWorkspace, user, selectedChannelId]);

  // Load messages
  useEffect(() => {
    if (!selectedChannelId) return;

    const messagesQuery = query(
      collection(db, 'messages'),
      where('channelId', '==', selectedChannelId),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      } as EnhancedMessage));
      
      setMessages(messagesList);
    });

    return () => unsubscribe();
  }, [selectedChannelId]);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (file.size > maxSize) {
      alert('파일 크기는 50MB를 초과할 수 없습니다.');
      return;
    }

    addPendingFile(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addPendingFile = (file: File) => {
    let fileType: 'image' | 'video' | 'code' | 'file' = 'file';
    let preview = '';
    let language = '';

    if (file.type.startsWith('image/')) {
      fileType = 'image';
      preview = URL.createObjectURL(file);
    } else if (file.type.startsWith('video/')) {
      fileType = 'video';
      preview = URL.createObjectURL(file);
    } else if (file.name.match(/\.(js|jsx|ts|tsx|py|java|cpp|c|go|rs|html|css|json|xml|yaml|yml|md)$/i)) {
      fileType = 'code';
      const ext = file.name.split('.').pop()?.toLowerCase();
      language = ext || 'text';
    }

    const pendingAttachment: Attachment = {
      id: Date.now().toString(),
      type: fileType,
      name: file.name,
      url: '',
      size: file.size,
      mimeType: file.type,
      preview,
      language,
      content: ''
    };

    setPendingAttachments(prev => [...prev, pendingAttachment]);
    setPendingFiles(prev => [...prev, file]);
  };

  const removePendingAttachment = (id: string) => {
    const index = pendingAttachments.findIndex(att => att.id === id);
    if (index !== -1) {
      const attachment = pendingAttachments[index];
      if (attachment.preview && attachment.preview.startsWith('blob:')) {
        URL.revokeObjectURL(attachment.preview);
      }
      
      setPendingAttachments(prev => prev.filter(att => att.id !== id));
      setPendingFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Send message with AI integration
  const sendMessage = async () => {
    if ((!messageInput.trim() && pendingAttachments.length === 0) || !user || !selectedChannelId) return;

    try {
      setUploadingFile(true);
      
      // Check for AI commands
      const isAICommand = messageInput.startsWith('/ai ') || 
                         messageInput.startsWith('/analyze ') ||
                         messageInput.startsWith('/search ') ||
                         messageInput.startsWith('/code ') ||
                         messageInput.startsWith('/generate ');
      
      // Upload pending files
      const uploadedAttachments: Attachment[] = [];
      let fileContents: any[] = [];
      
      if (pendingFiles.length > 0 && currentWorkspace) {
        for (let i = 0; i < pendingFiles.length; i++) {
          const file = pendingFiles[i];
          const attachment = pendingAttachments[i];
          
          const timestamp = Date.now();
          const fileName = `${timestamp}_${file.name}`;
          const storageRef = ref(storage, `workspaces/${currentWorkspace.id}/channels/${selectedChannelId}/${fileName}`);
          const snapshot = await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(snapshot.ref);
          
          const uploadedAttachment: Attachment = {
            ...attachment,
            url: downloadURL,
            preview: attachment.type === 'image' || attachment.type === 'video' ? downloadURL : attachment.preview
          };
          
          // Prepare file content for AI analysis
          if (isAICommand || messageInput.includes('분석') || messageInput.includes('analyze')) {
            if (attachment.type === 'image') {
              // Convert image to base64 for multimodal analysis
              const reader = new FileReader();
              const base64 = await new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
              });
              fileContents.push({
                type: 'image',
                data: base64,
                name: file.name
              });
            } else if (attachment.type === 'code' || file.type.includes('text')) {
              const text = await file.text();
              uploadedAttachment.content = text;
              fileContents.push({
                type: 'text',
                data: text,
                name: file.name
              });
            } else if (file.type === 'application/pdf') {
              // PDF files need special handling
              fileContents.push({
                type: 'pdf',
                url: downloadURL,
                name: file.name
              });
            }
          }
          
          uploadedAttachments.push(uploadedAttachment);
        }
      }
      
      // Create user message
      const userMessage: any = {
        channelId: selectedChannelId,
        content: messageInput || (uploadedAttachments.length > 0 ? '파일을 공유했습니다' : ''),
        author: user.id,
        authorName: user.displayName || user.name || user.email,
        authorAvatar: user.avatar_url,
        timestamp: serverTimestamp(),
        isAI: false,
        status: 'sent',
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : null
      };

      const userMsgRef = await addDoc(collection(db, 'messages'), userMessage);
      
      // Process AI commands
      if (isAICommand) {
        const command = messageInput.split(' ')[0];
        const prompt = messageInput.substring(command.length + 1);
        
        // Create AI thinking message
        const aiThinkingMsg: any = {
          channelId: selectedChannelId,
          content: 'AI가 응답을 생성하고 있습니다...',
          author: 'ai',
          authorName: 'Pulse AI',
          authorAvatar: null,
          timestamp: serverTimestamp(),
          isAI: true,
          isTyping: true,
          status: 'thinking'
        };
        
        const aiMsgRef = await addDoc(collection(db, 'messages'), aiThinkingMsg);
        
        try {
          // Call AI API with multimodal support
          const response = await apiService.post('/chat/ai', {
            command: command.replace('/', ''),
            prompt: prompt,
            model: selectedModel,
            attachments: fileContents,
            context: messages.slice(-10).map(m => ({
              role: m.isAI ? 'assistant' : 'user',
              content: m.content
            }))
          });
          
          // Update AI message with response
          await updateDoc(doc(db, 'messages', aiMsgRef.id), {
            content: response.data.content,
            isTyping: false,
            status: 'sent',
            model: selectedModel,
            tokensUsed: response.data.tokensUsed
          });
        } catch (error) {
          console.error('AI API error:', error);
          await updateDoc(doc(db, 'messages', aiMsgRef.id), {
            content: 'AI 응답 생성 중 오류가 발생했습니다. 다시 시도해주세요.',
            isTyping: false,
            status: 'error'
          });
        }
      }

      // Clear input
      setMessageInput('');
      setPendingAttachments([]);
      setPendingFiles([]);
      
      // Clean up object URLs
      pendingAttachments.forEach(att => {
        if (att.preview && att.preview.startsWith('blob:')) {
          URL.revokeObjectURL(att.preview);
        }
      });
      
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setUploadingFile(false);
    }
  };

  // Handle typing indicator
  const handleTyping = () => {
    // Implement typing indicator logic here
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      // Stop showing typing indicator
    }, 2000);
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Format time
  const formatTime = (date: Date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (days === 1) {
      return '어제';
    } else if (days < 7) {
      return `${days}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR');
    }
  };

  const currentChannel = channels.find(ch => ch.id === selectedChannelId);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Skip to content for accessibility */}
      <a href="#main-content" className="skip-to-content">
        메인 콘텐츠로 건너뛰기
      </a>

      {/* Enhanced Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: mobileSidebarOpen ? 0 : -300 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          "fixed lg:relative lg:translate-x-0 w-72 h-full bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col z-40",
          "lg:border-r lg:border-gray-700"
        )}
      >
        {/* Workspace Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">{currentWorkspace?.name || 'Workspace'}</h3>
                <p className="text-xs text-gray-400">온라인 12명</p>
              </div>
            </div>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-gray-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase">채널</span>
              <button className="text-gray-400 hover:text-white">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-1">
              {channels.map(channel => (
                <motion.button
                  key={channel.id}
                  onClick={() => setSelectedChannelId(channel.id)}
                  className={cn(
                    "w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors",
                    selectedChannelId === channel.id
                      ? "bg-blue-600 text-white"
                      : "hover:bg-gray-700 text-gray-300"
                  )}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {channel.type === 'public' ? (
                    <Hash className="w-4 h-4 flex-shrink-0" />
                  ) : channel.type === 'private' ? (
                    <Lock className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <Shield className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span className="flex-1 truncate">{channel.name}</span>
                  {unreadCounts[channel.id] > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {unreadCounts[channel.id]}
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Direct Messages */}
          <div className="px-3 py-2 mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase">다이렉트 메시지</span>
              <button className="text-gray-400 hover:text-white">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-1">
              <button className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left hover:bg-gray-700 text-gray-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="flex-1 truncate">김지원</span>
              </button>
              <button className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left hover:bg-gray-700 text-gray-300">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                <span className="flex-1 truncate">박서연</span>
              </button>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="p-3 border-t border-gray-700">
          <div className="flex items-center space-x-3">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium">
                  {user?.displayName?.[0] || user?.email?.[0]}
                </span>
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">{user?.displayName || user?.email}</p>
              <p className="text-xs text-gray-400">온라인</p>
            </div>
            <button className="p-1 hover:bg-gray-700 rounded">
              <Settings className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Channel Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="flex items-center space-x-2">
                {currentChannel?.type === 'public' ? (
                  <Hash className="w-5 h-5 text-gray-500" />
                ) : (
                  <Lock className="w-5 h-5 text-gray-500" />
                )}
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {currentChannel?.name}
                </h2>
              </div>
              
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {currentChannel?.description}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <Phone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <Video className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <Pin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button 
                onClick={() => setShowChannelInfo(!showChannelInfo)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div id="main-content" className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageSquare className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium">대화를 시작해보세요</p>
              <p className="text-sm">첫 메시지를 보내 대화를 시작하세요</p>
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((msg) => {
                const isMyMessage = msg.author === user?.id;
                
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={cn(
                      "flex gap-3 group",
                      isMyMessage && "flex-row-reverse"
                    )}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {msg.authorAvatar ? (
                        <img 
                          src={msg.authorAvatar} 
                          alt="" 
                          className="w-10 h-10 rounded-full ring-2 ring-white dark:ring-gray-800"
                        />
                      ) : msg.isAI ? (
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                          <Bot className="w-6 h-6 text-white" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white font-medium">
                          {msg.authorName?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    {/* Message Content */}
                    <div className={cn(
                      "max-w-[70%] space-y-1",
                      isMyMessage && "items-end"
                    )}>
                      {/* Name and Time */}
                      <div className={cn(
                        "flex items-baseline gap-2",
                        isMyMessage && "flex-row-reverse"
                      )}>
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                          {msg.authorName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      
                      {/* Message Bubble */}
                      <div className={cn(
                        "inline-block px-4 py-2 rounded-2xl",
                        isMyMessage 
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm" 
                          : msg.isAI 
                            ? "bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 text-purple-900 dark:text-purple-100 rounded-bl-sm"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm"
                      )}>
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                      
                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {msg.attachments.map((att) => (
                            <div key={att.id} className={cn(
                              "inline-block",
                              isMyMessage && "ml-auto"
                            )}>
                              {att.type === 'image' && (
                                <div className="relative group cursor-pointer">
                                  <img 
                                    src={att.preview || att.url} 
                                    alt={att.name} 
                                    className="max-w-sm rounded-lg shadow-md hover:shadow-xl transition-shadow"
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                    <Download className="w-8 h-8 text-white" />
                                  </div>
                                </div>
                              )}
                              
                              {att.type === 'video' && (
                                <video 
                                  src={att.preview || att.url} 
                                  controls 
                                  className="max-w-sm rounded-lg shadow-md"
                                />
                              )}
                              
                              {att.type === 'code' && (
                                <Card variant="bordered" className="max-w-lg">
                                  <div className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Code className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm font-medium">{att.name}</span>
                                      </div>
                                      <a
                                        href={att.url}
                                        download={att.name}
                                        className="text-blue-600 hover:text-blue-700"
                                      >
                                        <Download className="w-4 h-4" />
                                      </a>
                                    </div>
                                    {att.content && (
                                      <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
                                        <code>{att.content}</code>
                                      </pre>
                                    )}
                                  </div>
                                </Card>
                              )}
                              
                              {att.type === 'file' && (
                                <a 
                                  href={att.url} 
                                  download={att.name}
                                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                >
                                  <FileText className="w-5 h-5 text-blue-600" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {att.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {formatFileSize(att.size || 0)}
                                    </p>
                                  </div>
                                  <Download className="w-4 h-4 text-gray-400" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Message Actions (shown on hover) */}
                      <div className={cn(
                        "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                        isMyMessage && "flex-row-reverse"
                      )}>
                        <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                          <Smile className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                          <MessageSquare className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
          
          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="flex gap-1">
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                  className="w-2 h-2 bg-gray-400 rounded-full"
                />
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                  className="w-2 h-2 bg-gray-400 rounded-full"
                />
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                  className="w-2 h-2 bg-gray-400 rounded-full"
                />
              </div>
              <span>{typingUsers.join(', ')}님이 입력 중...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Enhanced Message Input */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          {/* Pending Attachments */}
          <AnimatePresence>
            {pendingAttachments.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3"
              >
                <div className="flex flex-wrap gap-2">
                  {pendingAttachments.map((attachment) => (
                    <motion.div
                      key={attachment.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative group"
                    >
                      <Card variant="bordered" className="p-2">
                        <div className="flex items-center gap-2">
                          {attachment.type === 'image' && attachment.preview ? (
                            <img 
                              src={attachment.preview} 
                              alt={attachment.name} 
                              className="h-16 w-16 object-cover rounded"
                            />
                          ) : attachment.type === 'code' ? (
                            <div className="h-16 w-16 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                              <Code className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                            </div>
                          ) : (
                            <div className="h-16 w-16 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                              <FileText className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                            </div>
                          )}
                          <div className="pr-8">
                            <p className="text-sm font-medium truncate max-w-[150px]">
                              {attachment.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(attachment.size || 0)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removePendingAttachment(attachment.id)}
                          className="absolute top-1 right-1 p-1 bg-gray-900 bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Area */}
          <div className="flex items-end gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,video/*,.pdf,.doc,.docx,.txt,.js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.go,.rs,.html,.css,.json,.xml,.yaml,.yml,.md"
            />
            
            <div className="flex gap-1">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="파일 첨부"
              >
                <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="이모지"
              >
                <Smile className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="flex-1 relative">
              <textarea
                ref={messageInputRef}
                value={messageInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setMessageInput(value);
                  handleTyping();
                  
                  // Check for slash command
                  if (value.startsWith('/')) {
                    setSlashCommandOpen(true);
                    setSlashCommandQuery(value.slice(1));
                    
                    // Calculate position for command menu
                    if (messageInputRef.current) {
                      const rect = messageInputRef.current.getBoundingClientRect();
                      setCommandPosition({ x: 0, y: rect.height });
                    }
                  } else {
                    setSlashCommandOpen(false);
                    setSlashCommandQuery('');
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !slashCommandOpen) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                onKeyDown={(e) => {
                  // Prevent default arrow key behavior when slash command is open
                  if (slashCommandOpen && ['ArrowUp', 'ArrowDown', 'Tab'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                placeholder="메시지를 입력하거나 '/'로 명령어를 시작하세요..."
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-gray-500"
                rows={1}
                style={{ minHeight: '40px', maxHeight: '120px' }}
                aria-label="메시지 입력"
              />
              
              {/* Slash Commands Dropdown */}
              <SlashCommands
                isOpen={slashCommandOpen}
                onClose={() => {
                  setSlashCommandOpen(false);
                  setSlashCommandQuery('');
                }}
                onSelect={async (command) => {
                  // Clear the slash command from input
                  setMessageInput('');
                  setSlashCommandOpen(false);
                  setSlashCommandQuery('');
                  
                  // Handle different commands
                  switch (command.id) {
                    case 'ask-ai':
                      // Open AI assistant mode
                      setMessageInput('/ai ');
                      messageInputRef.current?.focus();
                      break;
                    case 'analyze-file':
                      // Trigger file upload for analysis
                      fileInputRef.current?.click();
                      break;
                    case 'web-search':
                      setMessageInput('/search ');
                      messageInputRef.current?.focus();
                      break;
                    case 'code-execute':
                      setMessageInput('/code ');
                      messageInputRef.current?.focus();
                      break;
                    case 'generate':
                      setMessageInput('/generate ');
                      messageInputRef.current?.focus();
                      break;
                  }
                }}
                searchQuery={slashCommandQuery}
                position={commandPosition}
                currentModel={selectedModel}
              />
              
              {/* Legacy Command Menu - Remove this */}
              <AnimatePresence>
                {false && showCommandMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full mb-2 left-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2"
                  >
                    <button className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      <span>AI 호출</span>
                    </button>
                    <button className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      <span>코드 블록</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <Button
              variant="primary"
              size="sm"
              onClick={sendMessage}
              disabled={!messageInput.trim() && pendingAttachments.length === 0}
              loading={uploadingFile}
              icon={<Send className="w-4 h-4" />}
              aria-label="메시지 전송"
            >
              전송
            </Button>
          </div>
        </div>
      </div>

      {/* Channel Info Sidebar */}
      <AnimatePresence>
        {showChannelInfo && (
          <motion.aside
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            exit={{ x: 300 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                채널 정보
              </h3>
              <button
                onClick={() => setShowChannelInfo(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  설명
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentChannel?.description || '설명이 없습니다.'}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  멤버 ({currentChannel?.members?.length || 0})
                </h4>
                <div className="space-y-2">
                  {/* Member list would go here */}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  고정된 메시지
                </h4>
                <p className="text-sm text-gray-500">고정된 메시지가 없습니다.</p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedTeamChat;