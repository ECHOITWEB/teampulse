import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import chatService, { ChatMessage, ChatChannel } from '../services/chatService';
import langchainService, { AIConfig } from '../services/langchainService';
import memberService from '../services/memberService';
import storageService from '../services/storageService';
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp, updateDoc, deleteDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DirectMessage, WorkspaceUser, UserRole, ChannelType, AIProvider, FilePreview } from '../types/chat.types';
import { getDMChannelId } from '../utils/chatUtils';
import errorLogger from '../utils/errorLogger';
import { toastManager } from '../components/common/Toast';

export const useTeamChat = () => {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  // State
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [workspaceUsers, setWorkspaceUsers] = useState<WorkspaceUser[]>([]);
  const [currentChannel, setCurrentChannel] = useState<ChatChannel | null>(null);
  const [currentDM, setCurrentDM] = useState<DirectMessage | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('member');
  const [channelMembers, setChannelMembers] = useState<WorkspaceUser[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [filePreview, setFilePreview] = useState<FilePreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Load user role
  useEffect(() => {
    const getUserRole = async () => {
      if (currentWorkspace && user) {
        try {
          errorLogger.debug('Loading user role', {
            component: 'useTeamChat',
            action: 'getUserRole',
            userId: user.firebase_uid,
            workspaceId: currentWorkspace.id
          });
          
          const member = await memberService.getMemberByUserAndWorkspace(
            user.firebase_uid,
            currentWorkspace.id
          );
          if (member) {
            setUserRole(member.workspace_role as UserRole);
            errorLogger.success('User role loaded successfully', {
              component: 'useTeamChat',
              metadata: { role: member.workspace_role }
            });
          }
        } catch (error) {
          errorLogger.error('Failed to load user role', error as Error, {
            component: 'useTeamChat',
            action: 'getUserRole'
          });
          toastManager.error('역할 로드 실패', '사용자 권한을 확인할 수 없습니다.');
        }
      }
    };
    getUserRole();
  }, [currentWorkspace, user]);

  // Load channels function
  const loadChannels = useCallback(async () => {
    if (!currentWorkspace || !user) return;
    
    try {
      errorLogger.debug('Loading channels', {
        component: 'useTeamChat',
        workspaceId: currentWorkspace.id,
        userId: user.firebase_uid
      });
      
      const channelList = await chatService.getWorkspaceChannels(currentWorkspace.id, user.firebase_uid);
      
      // If no channels exist, create the default 'general' channel
      if (channelList.length === 0) {
        console.log('No channels found, creating general channel');
        const generalChannelId = await chatService.createChannel({
          workspace_id: currentWorkspace.id,
          name: 'general',
          description: '모든 멤버를 위한 일반 채널',
          type: 'public',
          members: [user.firebase_uid],
          owner_id: user.firebase_uid
        });
        
        // Reload channels after creating general
        const updatedChannelList = await chatService.getWorkspaceChannels(currentWorkspace.id, user.firebase_uid);
        setChannels(updatedChannelList);
        
        // Select the general channel
        const generalChannel = updatedChannelList.find(ch => ch.id === generalChannelId);
        if (generalChannel) {
          setCurrentChannel(generalChannel);
        }
      } else {
        setChannels(channelList);
        
        // 기본 채널 선택
        if (!currentChannel && !currentDM) {
          const generalChannel = channelList.find(ch => ch.name === 'general') || channelList[0];
          setCurrentChannel(generalChannel);
        }
      }
      
      errorLogger.success('Channels loaded', {
        component: 'useTeamChat',
        metadata: { channelCount: channels.length }
      });
    } catch (error) {
      errorLogger.error('Failed to load channels', error as Error, {
        component: 'useTeamChat'
      });
      toastManager.error('채널 로드 실패', '채널 목록을 불러올 수 없습니다.');
    }
  }, [currentWorkspace, user, currentChannel, currentDM, channels.length]);

  // Load channels on workspace change
  useEffect(() => {
    if (currentWorkspace && user) {
      loadChannels();
    }
  }, [currentWorkspace, user, loadChannels]);

  // Load workspace users
  useEffect(() => {
    const loadWorkspaceUsers = async () => {
      if (!currentWorkspace || !user) return;
      
      try {
        const members = await memberService.getWorkspaceMembers(currentWorkspace.id);
        const users: WorkspaceUser[] = members
          .filter(member => member.user_id !== user.firebase_uid)
          .map(member => ({
            id: member.user_id,
            name: member.workspace_profile?.display_name || member.user_id,
            email: member.user_id, // Email needs to be fetched separately
            avatar_url: undefined, // Avatar needs to be fetched separately
            is_online: false,
            position: member.workspace_profile?.position,
            department: member.workspace_profile?.department,
            joined_at: member.joined_at?.toDate?.() || new Date()
          }));
        
        setWorkspaceUsers(users);
      } catch (error) {
        console.error('Error loading workspace users:', error);
      }
    };
    
    loadWorkspaceUsers();
  }, [currentWorkspace, user]);

  // Load direct messages
  useEffect(() => {
    const loadDirectMessages = async () => {
      if (!currentWorkspace || !user) return;
      
      try {
        const dms: DirectMessage[] = [];
        
        for (const workspaceUser of workspaceUsers) {
          const dmChannelId = getDMChannelId(user.firebase_uid, workspaceUser.id);
          const dmChannelRef = doc(db, 'direct_messages', dmChannelId);
          const dmChannelDoc = await getDoc(dmChannelRef);
          
          if (dmChannelDoc.exists()) {
            const data = dmChannelDoc.data();
            dms.push({
              id: dmChannelId,
              user_id: workspaceUser.id,
              user_name: workspaceUser.name,
              user_email: workspaceUser.email,
              avatar_url: workspaceUser.avatar_url,
              last_message: data.last_message,
              last_message_time: data.last_message_time?.toDate(),
              unread_count: data[`unread_${user.firebase_uid}`] || 0,
              is_online: workspaceUser.is_online
            });
          }
        }
        
        setDirectMessages(dms.sort((a, b) => {
          if (!a.last_message_time) return 1;
          if (!b.last_message_time) return -1;
          return b.last_message_time.getTime() - a.last_message_time.getTime();
        }));
      } catch (error) {
        console.error('Error loading direct messages:', error);
      }
    };
    
    loadDirectMessages();
  }, [workspaceUsers, currentWorkspace, user]);

  // Load messages with real-time updates
  useEffect(() => {
    if (currentChannel && currentWorkspace) {
      // Set up real-time listener for channel messages
      const messagesRef = collection(db, 'workspaces', currentWorkspace.id, 'channels', currentChannel.id, 'messages');
      const q = query(messagesRef);
      
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const messageList: ChatMessage[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            messageList.push({
              id: doc.id,
              channel_id: currentChannel.id,
              workspace_id: currentWorkspace.id,
              user_id: data.user_id,
              user_name: data.user_name,
              user_avatar: data.user_avatar,
              content: data.content,
              type: data.type || 'text',
              attachments: data.attachments,
              created_at: data.created_at,
              edited_at: data.edited_at,
              is_ai: data.is_ai || false,
              ai_model: data.ai_model
            } as ChatMessage);
          });
          
          setMessages(messageList.sort((a, b) => {
            const aTime = a.created_at?.toDate?.() || new Date(0);
            const bTime = b.created_at?.toDate?.() || new Date(0);
            return aTime.getTime() - bTime.getTime();
          }));
        },
        (error) => {
          errorLogger.error('Failed to load messages', error as Error, {
            component: 'useTeamChat',
            action: 'loadMessages'
          });
          toastManager.error('메시지 로드 실패', '실시간 메시지 업데이트에 문제가 발생했습니다.');
        }
      );
      
      return () => unsubscribe();
    } else if (currentDM && user) {
      // Set up real-time listener for DM messages
      const messagesRef = collection(db, 'direct_messages', currentDM.id, 'messages');
      const q = query(messagesRef);
      
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const messageList: ChatMessage[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            messageList.push({
              id: doc.id,
              channel_id: currentDM.id,
              workspace_id: '',
              user_id: data.user_id,
              user_name: data.user_name,
              user_avatar: data.user_avatar,
              content: data.content,
              type: data.type || 'text',
              attachments: data.attachments,
              created_at: data.created_at,
              edited_at: data.edited_at,
              is_ai: data.is_ai || false
            } as ChatMessage);
          });
          
          setMessages(messageList.sort((a, b) => {
            const aTime = a.created_at?.toDate?.() || new Date(0);
            const bTime = b.created_at?.toDate?.() || new Date(0);
            return aTime.getTime() - bTime.getTime();
          }));
        },
        (error) => {
          console.error('Error loading DM messages:', error);
        }
      );
      
      return () => unsubscribe();
    } else {
      // Clear messages when no channel or DM is selected
      setMessages([]);
    }
  }, [currentChannel, currentDM, currentWorkspace, user]);

  // Channel operations
  const createChannel = useCallback(async (
    name: string,
    description: string,
    type: ChannelType,
    memberIds: string[]
  ) => {
    if (!currentWorkspace || !user) return;
    
    await chatService.createChannel({
      workspace_id: currentWorkspace.id,
      name,
      description,
      type,
      members: [user.firebase_uid, ...memberIds],
      owner_id: user.firebase_uid
    });
    
    const updatedChannels = await chatService.getWorkspaceChannels(currentWorkspace.id, user.firebase_uid);
    setChannels(updatedChannels);
  }, [currentWorkspace, user]);

  const deleteChannel = useCallback(async (channelId: string) => {
    if (!currentWorkspace) return;
    
    await deleteDoc(doc(db, 'workspaces', currentWorkspace.id, 'channels', channelId));
    
    const updatedChannels = await chatService.getWorkspaceChannels(currentWorkspace.id, user?.firebase_uid || '');
    setChannels(updatedChannels);
    
    if (currentChannel?.id === channelId) {
      setCurrentChannel(updatedChannels[0] || null);
    }
  }, [currentWorkspace, currentChannel, user]);

  // Message operations
  const sendMessage = useCallback(async (content: string, attachments: Array<{url: string; name: string}> = []) => {
    if (!user || !currentWorkspace) return;
    
    if (currentChannel) {
      await chatService.sendMessage({
        channel_id: currentChannel.id,
        workspace_id: currentWorkspace.id,
        user_id: user.firebase_uid,
        user_name: user.displayName || user.name || 'Unknown User',
        user_avatar: user.avatar_url,
        content,
        type: 'text',
        attachments: attachments.length > 0 ? attachments.map(att => ({ 
          url: att.url, 
          type: 'file',
          name: att.name,
          preview: att.url
        })) : undefined
      });
    } else if (currentDM) {
      const dmRef = doc(db, 'direct_messages', currentDM.id);
      const messagesRef = collection(dmRef, 'messages');
      
      await setDoc(doc(messagesRef), {
        user_id: user.firebase_uid,
        user_name: user.displayName || 'Unknown User',
        user_avatar: user.avatar_url,
        content,
        attachments: attachments.length > 0 ? attachments.map(att => ({ 
          url: att.url, 
          type: 'file',
          name: att.name 
        })) : [],
        created_at: serverTimestamp(),
        is_ai: false
      });
      
      await updateDoc(dmRef, {
        last_message: content,
        last_message_time: serverTimestamp(),
        [`unread_${currentDM.user_id}`]: (currentDM.unread_count || 0) + 1
      });
    }
  }, [user, currentWorkspace, currentChannel, currentDM]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!currentWorkspace || !currentChannel) return;
    
    await deleteDoc(
      doc(db, 'workspaces', currentWorkspace.id, 'channels', currentChannel.id, 'messages', messageId)
    );
  }, [currentWorkspace, currentChannel]);

  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!currentWorkspace || !currentChannel) return;
    
    await updateDoc(
      doc(db, 'workspaces', currentWorkspace.id, 'channels', currentChannel.id, 'messages', messageId),
      {
        content: newContent,
        edited_at: serverTimestamp()
      }
    );
  }, [currentWorkspace, currentChannel]);

  // File operations
  const handleFileUpload = useCallback(async (files: FileList) => {
    const newFiles = Array.from(files);
    setUploadedFiles(prev => [...prev, ...newFiles]);
    
    const previews: FilePreview[] = [];
    for (const file of newFiles) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          previews.push({ url: e.target?.result as string, type: 'image' });
          setFilePreview(prev => [...prev, { url: e.target?.result as string, type: 'image' }]);
        };
        reader.readAsDataURL(file);
      }
    }
  }, []);

  const uploadFiles = useCallback(async (): Promise<Array<{url: string; name: string; file: File; type: string}>> => {
    if (uploadedFiles.length === 0) return [];
    
    setIsUploading(true);
    const uploadResults: Array<{url: string; name: string; file: File; type: string}> = [];
    
    try {
      for (const file of uploadedFiles) {
        const result = await storageService.uploadFile(file, 'chat-attachments');
        uploadResults.push({
          url: result.url,
          name: result.originalName,
          file: file,  // Include the original File object
          type: file.type
        });
      }
      
      setUploadedFiles([]);
      setFilePreview([]);
    } finally {
      setIsUploading(false);
    }
    
    return uploadResults;
  }, [uploadedFiles]);

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreview(prev => prev.filter((_, i) => i !== index));
  }, []);

  // AI operations
  const sendAIMessage = useCallback(async (
    message: string,
    provider: AIProvider,
    model: string,
    attachments?: Array<{ url: string; type: string; name?: string; file?: File }>
  ) => {
    if (!user || !currentWorkspace || !currentChannel) return;
    
    // Check if user is asking about meetings
    const messageLower = message.toLowerCase();
    const isMeetingQuery = messageLower.includes('회의') || 
                          messageLower.includes('미팅') || 
                          messageLower.includes('meeting') || 
                          messageLower.includes('오늘') ||
                          messageLower.includes('예정') ||
                          messageLower.includes('일정') ||
                          messageLower.includes('액션') ||
                          messageLower.includes('action');
    
    let aiResponse = '';
    
    // If it's a meeting query, get meeting data first
    if (isMeetingQuery) {
      const meetingInfo = await langchainService.getMeetingData(currentWorkspace.id, message);
      
      // If we have meeting data, use it as the response
      if (meetingInfo && !meetingInfo.includes('오류')) {
        aiResponse = meetingInfo;
      }
    }
    
    // If we don't have a meeting response, use normal AI processing
    if (!aiResponse) {
      const config: AIConfig = {
        provider,
        model,
        apiKey: provider === 'openai' 
          ? process.env.REACT_APP_OPENAI_API_KEY || ''
          : process.env.REACT_APP_ANTHROPIC_API_KEY || ''
      };
      
      // Get recent messages for context
      const recentMessages = messages.slice(-10);
      
      const response = await langchainService.processMessage(
        message, 
        recentMessages, 
        config,
        { 
          attachments,
          workspaceId: currentWorkspace.id,
          channelId: currentChannel.id,
          conversationId: `${currentChannel.id}_${Date.now()}`
        }
      );
      
      aiResponse = response.content;
    }
    
    await chatService.sendMessage({
      channel_id: currentChannel.id,
      workspace_id: currentWorkspace.id,
      user_id: 'ai-assistant',
      user_name: `AI (${model})`,
      content: aiResponse,
      type: 'ai',
      ai_model: model
    });
  }, [user, currentWorkspace, currentChannel, messages]);

  return {
    // State
    channels,
    directMessages,
    workspaceUsers,
    currentChannel,
    currentDM,
    messages,
    userRole,
    channelMembers,
    uploadedFiles,
    filePreview,
    isUploading,
    
    // Setters
    setCurrentChannel,
    setCurrentDM,
    setChannelMembers,
    
    // Operations
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
  };
};