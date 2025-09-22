import React, { useState, useRef, useEffect } from 'react';
import { Menu, Users, Hash, Lock, Bot, X, Zap } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import chatService from '../services/chatService';
import notificationService from '../services/notificationService';
import usageTrackerService from '../services/usageTrackerService';

// Hooks
import { useTeamChat } from '../hooks/useTeamChat';
import { useAuth } from '../contexts/AuthContext';

// Components
import ChannelList from '../components/TeamChat/Sidebar/ChannelList';
import MessageItem from '../components/TeamChat/Chat/MessageItem';
import MessageInput from '../components/TeamChat/Chat/MessageInput';
import SlashCommands from '../components/TeamChat/Chat/SlashCommands';
import AIConfigModal from '../components/TeamChat/AI/AIConfigModal';
import CreateChannelModal from '../components/TeamChat/Modals/CreateChannelModal';

// Types
import { AIProvider, SlashCommand } from '../types/chat.types';

// 슬래시 명령어 목록
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
  }
];

const TeamChat: React.FC = () => {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const {
    channels,
    directMessages,
    workspaceUsers,
    currentChannel,
    currentDM,
    messages,
    userRole,
    uploadedFiles,
    filePreview,
    isUploading,
    setCurrentChannel,
    setCurrentDM,
    createChannel,
    deleteChannel,
    sendMessage,
    deleteMessage,
    editMessage,
    handleFileUpload,
    uploadFiles,
    removeFile,
    sendAIMessage,
    loadChannels
  } = useTeamChat();

  // UI State
  const [newMessage, setNewMessage] = useState('');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showChannelMenu, setShowChannelMenu] = useState<string | null>(null);
  const [showMessageMenu, setShowMessageMenu] = useState<string | null>(null);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [slashCommandSearch, setSlashCommandSearch] = useState('');
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  
  // AI State
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  
  // Usage State
  const [monthlyUsage, setMonthlyUsage] = useState<any>(null);
  
  // File State for tracking files before upload
  const [filesBeforeUpload, setFilesBeforeUpload] = useState<File[]>([]);
  
  // Message sending state for duplicate prevention
  const [isSending, setIsSending] = useState(false);
  const lastSentMessageRef = useRef<string>('');
  const lastSentTimeRef = useRef<number>(0);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null!);

  // Initialize notification service
  useEffect(() => {
    const initNotifications = async () => {
      if (user && currentWorkspace) {
        await notificationService.initialize(user.id);
        
        // Subscribe to chat messages for current channel
        if (currentChannel) {
          notificationService.subscribeToChatMessages(
            currentWorkspace.id, 
            currentChannel.id, 
            user.id
          );
        }
        
        // Subscribe to direct messages
        notificationService.subscribeToDirectMessages(
          currentWorkspace.id,
          user.id
        );
        
        // Subscribe to goal updates
        notificationService.subscribeToGoalUpdates(currentWorkspace.id);
        
        // Subscribe to meeting reminders
        notificationService.subscribeToMeetingReminders(
          currentWorkspace.id,
          user.id
        );
      }
    };
    
    initNotifications();
    
    return () => {
      // Cleanup subscriptions on unmount
      notificationService.unsubscribeAll();
    };
  }, [user, currentWorkspace, currentChannel]);
  
  // Load usage data
  useEffect(() => {
    const loadUsage = async () => {
      if (currentWorkspace) {
        try {
          const usage = await usageTrackerService.getWorkspaceMonthlyUsage(currentWorkspace.id);
          setMonthlyUsage(usage);
        } catch (error) {
          console.error('Failed to load usage data:', error);
        }
      }
    };
    
    loadUsage();
    // Refresh usage data every 5 minutes
    const interval = setInterval(loadUsage, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentWorkspace]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Track files when they are uploaded
  useEffect(() => {
    setFilesBeforeUpload([...uploadedFiles]);
  }, [uploadedFiles]);

  // Handle slash commands
  useEffect(() => {
    if (newMessage === '/') {
      setShowSlashCommands(true);
      setSlashCommandSearch('');
      setSelectedCommandIndex(0);
    } else if (newMessage.startsWith('/') && showSlashCommands) {
      setSlashCommandSearch(newMessage.substring(1));
      setSelectedCommandIndex(0);
    } else {
      setShowSlashCommands(false);
      setSelectedCommandIndex(0);
    }
  }, [newMessage, showSlashCommands]);

  // Message handlers
  const handleSendMessage = async () => {
    if (!newMessage.trim() && uploadedFiles.length === 0) return;
    
    // 중복 전송 방지 - 이미 전송 중이면 리턴
    if (isSending) {
      console.log('Message send already in progress');
      return;
    }
    
    // 동일한 메시지가 500ms 내에 다시 전송되는 것을 방지 (Mac 중복 버그 방지)
    const now = Date.now();
    const messageToSend = newMessage.trim();
    if (lastSentMessageRef.current === messageToSend && 
        now - lastSentTimeRef.current < 500) {
      console.log('Duplicate message prevented:', messageToSend);
      setNewMessage('');
      return;
    }
    
    setIsSending(true);
    lastSentMessageRef.current = messageToSend;
    lastSentTimeRef.current = now;
    
    let messageContent = newMessage;
    let attachments: Array<{url: string; name: string}> = [];
    
    // Upload files if any
    if (uploadedFiles.length > 0) {
      attachments = await uploadFiles();
    }
    
    // Handle AI mention
    if (messageContent.includes('@AI') || messageContent.startsWith('/ai ')) {
      const aiMessage = messageContent.replace('@AI', '').replace('/ai ', '').trim();
      
      // 먼저 사용자의 질문을 전송
      await sendMessage(messageContent, attachments);
      
      // Check if AI is already enabled for this channel
      if (currentChannel?.ai_enabled) {
        // AI is enabled, send AI response with attachments
        if (aiMessage) {
          // Convert attachment URLs to format expected by AI with proper file type detection
          const aiAttachments = attachments.map((att, index) => {
            // Get the file type from filesBeforeUpload array
            const file = filesBeforeUpload[index];
            let type = 'application/octet-stream';
            
            if (file) {
              type = file.type || type;
            } else {
              // Try to detect from attachment name
              const name = att.name.toLowerCase();
              if (name.endsWith('.png')) type = 'image/png';
              else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) type = 'image/jpeg';
              else if (name.endsWith('.gif')) type = 'image/gif';
              else if (name.endsWith('.pdf')) type = 'application/pdf';
              else if (name.endsWith('.xlsx')) type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
              else if (name.endsWith('.html')) type = 'text/html';
              else if (name.endsWith('.docx')) type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
              else if (name.endsWith('.csv')) type = 'text/csv';
              else if (name.endsWith('.txt')) type = 'text/plain';
            }
            
            return { url: att.url, type, name: att.name, file: file };  // Use file from filesBeforeUpload
          });
          
          // Use vision model for images automatically
          let modelToUse = selectedModel || 'gpt-4o';
          if (aiAttachments.some(att => att.type.startsWith('image/')) && selectedProvider === 'openai') {
            modelToUse = 'gpt-4o'; // Ensure vision model for images
          }
          
          await sendAIMessage(
            aiMessage, 
            selectedProvider || 'openai', 
            modelToUse,
            aiAttachments.length > 0 ? aiAttachments : undefined
          );
        }
      } else if (selectedProvider && selectedModel && aiMessage) {
        // AI config is set, send AI response with attachments
        const aiAttachments = attachments.map((att, index) => {
          // Get the file type from filesBeforeUpload array
          const file = filesBeforeUpload[index];
          let type = 'application/octet-stream';
          
          if (file) {
            type = file.type || type;
          } else {
            // Try to detect from attachment name
            const name = att.name.toLowerCase();
            if (name.endsWith('.png')) type = 'image/png';
            else if (name.endsWith('.jpg') || name.endsWith('.jpeg')) type = 'image/jpeg';
            else if (name.endsWith('.gif')) type = 'image/gif';
            else if (name.endsWith('.pdf')) type = 'application/pdf';
            else if (name.endsWith('.xlsx')) type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            else if (name.endsWith('.html')) type = 'text/html';
            else if (name.endsWith('.docx')) type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            else if (name.endsWith('.csv')) type = 'text/csv';
            else if (name.endsWith('.txt')) type = 'text/plain';
          }
          
          return { url: att.url, type, name: att.name, file: file };  // Use file from filesBeforeUpload
        });
        
        // Use vision model for images automatically
        let modelToUse = selectedModel;
        if (aiAttachments.some(att => att.type.startsWith('image/')) && selectedProvider === 'openai') {
          modelToUse = 'gpt-4o'; // Ensure vision model for images
        }
        
        await sendAIMessage(
          aiMessage, 
          selectedProvider, 
          modelToUse,
          aiAttachments.length > 0 ? aiAttachments : undefined
        );
      } else {
        // Need to configure AI
        setShowAIModal(true);
        return;
      }
    } else {
      await sendMessage(messageContent, attachments);
    }
    
    setNewMessage('');
    // Clear the files state after sending
    setFilesBeforeUpload([]);
    
    // 전송 완료 후 플래그 해제 (짧은 딜레이로 연속 클릭 방지)
    setTimeout(() => {
      setIsSending(false);
    }, 100);
  };

  const handleSlashCommand = (command: SlashCommand) => {
    if (command.name === '/ai') {
      setNewMessage('@AI ');
      inputRef.current?.focus();
    } else if (command.name === '/gpt') {
      setSelectedProvider('openai');
      setShowAIModal(true);
    } else if (command.name === '/claude') {
      setSelectedProvider('anthropic');
      setShowAIModal(true);
    } else if (command.name === '/invite') {
      // TODO: Implement invite modal
      setNewMessage('');
    } else {
      // 다른 명령어들의 기본 동작
      setNewMessage(command.name + ' ');
    }
    setShowSlashCommands(false);
  };

  const handleAIConfirm = async () => {
    if (selectedProvider && selectedModel && currentChannel && currentWorkspace) {
      setShowAIModal(false);
      
      // AI 어시스턴트가 채널에 참여했다는 시스템 메시지 전송
      await chatService.sendMessage({
        channel_id: currentChannel.id,
        workspace_id: currentWorkspace.id,
        user_id: 'system',
        user_name: 'System',
        content: `🤖 AI 어시스턴트 (${selectedModel})가 채널에 참여했습니다. @AI 또는 /ai 명령어로 대화를 시작하세요.`,
        type: 'system'
      });
      
      // 채널에 AI 활성화 표시
      await chatService.enableAI(currentWorkspace.id, currentChannel.id, {
        provider: selectedProvider,
        model: selectedModel,
        apiKey: selectedProvider === 'openai' 
          ? process.env.REACT_APP_OPENAI_API_KEY || ''
          : process.env.REACT_APP_ANTHROPIC_API_KEY || ''
      });
      
      // 채널 정보 업데이트
      const updatedChannel = { ...currentChannel, ai_enabled: true };
      setCurrentChannel(updatedChannel);
    }
  };

  const handleChannelSelect = (channel: any) => {
    setCurrentChannel(channel);
    setCurrentDM(null);
    setShowMobileSidebar(false);
  };

  const handleDMSelect = (dm: any) => {
    setCurrentDM(dm);
    setCurrentChannel(null);
    setShowMobileSidebar(false);
  };

  const handleChannelEdit = async (channelId: string, newName: string) => {
    if (!currentWorkspace) return;
    
    try {
      // Save current workspace ID to localStorage before update
      localStorage.setItem('selectedWorkspaceId', currentWorkspace.id);
      
      // Update channel name in Firestore
      const channelRef = doc(db, 'workspaces', currentWorkspace.id, 'channels', channelId);
      await updateDoc(channelRef, {
        name: newName,
        updated_at: serverTimestamp()
      });
      
      // Update current channel if it's the one being edited
      if (currentChannel?.id === channelId) {
        setCurrentChannel({ ...currentChannel, name: newName });
      }
      
      // Refresh channels list without reloading the page
      await loadChannels();
    } catch (error) {
      console.error('Error updating channel:', error);
      alert('채널 이름 변경에 실패했습니다.');
    }
  };

  const isAdmin = userRole === 'owner' || userRole === 'admin';
  const channelMembers = workspaceUsers.filter(u => 
    currentChannel?.members?.includes(u.id) || false
  );

  return (
    <div className="h-[calc(100vh-64px)] flex bg-white overflow-hidden">
      {/* 사이드바 */}
      <div className={`${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative w-64 h-full bg-slate-800 text-white transition-transform duration-300 z-50 flex flex-col`}>
        {/* 워크스페이스 헤더 */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {currentWorkspace?.name?.charAt(0).toUpperCase() || 'T'}
                </span>
              </div>
              <span className="font-semibold">{currentWorkspace?.name || 'TeamPulse'}</span>
            </div>
            <button 
              onClick={() => setShowMobileSidebar(false)}
              className="md:hidden p-1 hover:bg-slate-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <ChannelList
          channels={channels}
          directMessages={directMessages}
          currentChannel={currentChannel}
          currentDM={currentDM}
          showChannelMenu={showChannelMenu}
          onChannelSelect={handleChannelSelect}
          onDMSelect={handleDMSelect}
          onCreateChannel={() => setShowCreateChannelModal(true)}
          onChannelMenuToggle={setShowChannelMenu}
          onChannelEdit={handleChannelEdit}
          onChannelDelete={deleteChannel}
          isAdmin={isAdmin}
        />
      </div>


      {/* 메인 채팅 영역 */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* 채팅 헤더 */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowMobileSidebar(true)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            {currentChannel && (
              <div className="flex items-center gap-2">
                {currentChannel.type === 'private' ? (
                  <Lock className="w-5 h-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <Hash className="w-5 h-5 text-gray-500 flex-shrink-0" />
                )}
                <div className="flex flex-col">
                  <h2 className="font-semibold text-gray-900 leading-tight">{currentChannel.name}</h2>
                  <span className="text-xs text-gray-500">
                    {channelMembers.length}명
                  </span>
                </div>
              </div>
            )}
            {currentDM && (
              <>
                <Users className="w-5 h-5 text-gray-500" />
                <div>
                  <h2 className="font-semibold text-gray-900">@{currentDM.user_name}</h2>
                  <p className="text-xs text-gray-500">
                    {currentDM.is_online ? '온라인' : '오프라인'}
                  </p>
                </div>
              </>
            )}
          </div>
            
          <div className="flex items-center gap-2">
            {currentChannel && !currentChannel.ai_enabled && (
              <button
                onClick={() => setShowAIModal(true)}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Bot className="w-4 h-4" />
                Pulse AI 초대하기
              </button>
            )}
            {currentChannel?.ai_enabled && (
              <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center gap-2">
                <Bot className="w-4 h-4" />
                AI 활성화됨
              </span>
            )}
            {monthlyUsage && (
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <Zap className="w-4 h-4" />
                  <span className="font-medium">사용: {Math.floor(monthlyUsage.totalCostPulse || 0)} Pulse</span>
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg">
                  <Zap className="w-4 h-4" />
                  <span className="font-medium">잔액: {Math.floor(monthlyUsage.remainingPulse || 10000)} Pulse</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <p className="text-lg mb-2">아직 메시지가 없습니다</p>
                <p className="text-sm">첫 번째 메시지를 보내보세요!</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                currentUserId={user?.firebase_uid || ''}
                isAdmin={isAdmin}
                onEdit={editMessage}
                onDelete={deleteMessage}
                onMenuToggle={setShowMessageMenu}
                showMenu={showMessageMenu === message.id}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 메시지 입력 */}
        <div className="relative border-t">
          <SlashCommands
            show={showSlashCommands}
            searchTerm={slashCommandSearch}
            selectedIndex={selectedCommandIndex}
            onSelect={handleSlashCommand}
          />
          <MessageInput
            value={newMessage}
            onChange={setNewMessage}
            onSend={handleSendMessage}
            onFileSelect={handleFileUpload}
            onFileRemove={removeFile}
            onAIInvite={() => setShowAIModal(true)}
            uploadedFiles={uploadedFiles}
            filePreview={filePreview}
            isUploading={isUploading}
            placeholder={currentChannel ? `#${currentChannel.name}에 메시지 보내기` : '메시지를 입력하세요...'}
            inputRef={inputRef}
            onKeyDown={(e) => {
              const commands = slashCommands.filter(cmd =>
                cmd.name.toLowerCase().includes(slashCommandSearch.toLowerCase())
              );
              
              if (showSlashCommands && commands.length > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedCommandIndex(prev => 
                    prev < commands.length - 1 ? prev + 1 : 0
                  );
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedCommandIndex(prev => 
                    prev > 0 ? prev - 1 : commands.length - 1
                  );
                } else if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSlashCommand(commands[selectedCommandIndex]);
                } else if (e.key === 'Escape') {
                  setShowSlashCommands(false);
                  setSelectedCommandIndex(0);
                } else if (e.key === 'Tab') {
                  e.preventDefault();
                  handleSlashCommand(commands[selectedCommandIndex]);
                }
              }
            }}
          />
        </div>
      </div>

      {/* Modals */}
      <AIConfigModal
        show={showAIModal}
        selectedProvider={selectedProvider}
        selectedModel={selectedModel}
        onProviderChange={setSelectedProvider}
        onModelChange={setSelectedModel}
        onClose={() => setShowAIModal(false)}
        onConfirm={handleAIConfirm}
      />
      
      <CreateChannelModal
        show={showCreateChannelModal}
        workspaceUsers={workspaceUsers}
        onClose={() => setShowCreateChannelModal(false)}
        onCreate={createChannel}
      />
    </div>
  );
};

export default TeamChat;