import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Send, Paperclip, Smile, Hash, Lock, Users,
  Search, Plus, MoreVertical, X, Eye, EyeOff,
  FileText, Bot, UserPlus, Menu,
  Code, Download, Settings, LogOut,
  ChevronLeft, Shield, UserCheck, Globe
} from 'lucide-react';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { 
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, limit, serverTimestamp,
  getDoc, getDocs, increment, setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../config/firebase';
import { Channel, Message, Attachment, AI_MODELS } from '../types/chat';
import SlashCommands from '../components/chat/SlashCommands';
import apiService from '../services/api';

const TeamChat: React.FC = () => {
  const { user, getToken } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [allChannels, setAllChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAIInvite, setShowAIInvite] = useState(false);
  const [showAIModelSelect, setShowAIModelSelect] = useState(false);
  const [selectedAIProvider, setSelectedAIProvider] = useState<'openai' | 'claude' | null>(null);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showChannelBrowser, setShowChannelBrowser] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [newChannelType, setNewChannelType] = useState<'public' | 'private' | 'secret'>('public');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [workspaceStorage, setWorkspaceStorage] = useState({ used: 0, max: 5368709120 });
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [imagePreview, setImagePreview] = useState<{ url: string; file: File } | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [slashCommandOpen, setSlashCommandOpen] = useState(false);
  const [slashCommandQuery, setSlashCommandQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [commandPosition, setCommandPosition] = useState<{ x: number; y: number } | undefined>();
  const [codeModal, setCodeModal] = useState<{ open: boolean; code: string; filename: string; language: string } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize default channels on workspace creation (only once)
  useEffect(() => {
    if (!currentWorkspace || !user || !initialLoad) return;

    const initializeDefaultChannels = async () => {
      const channelsRef = collection(db, 'channels');
      const q = query(channelsRef, where('workspaceId', '==', currentWorkspace.id), limit(1));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Create default channels
        const defaultChannels = [
          { name: 'general', displayName: 'General', description: '모든 멤버가 참여하는 기본 채널입니다.', type: 'public' },
          { name: 'random', displayName: 'Random', description: '자유로운 대화를 나누는 공간입니다.', type: 'public' },
          { name: 'announcements', displayName: '공지사항', description: '중요한 공지사항을 전달하는 채널입니다.', type: 'public' }
        ];

        const promises = defaultChannels.map(channel => 
          addDoc(channelsRef, {
            ...channel,
            workspaceId: currentWorkspace.id,
            createdBy: user.id,
            createdAt: serverTimestamp(),
            members: [],
            admins: [user.id],
            lastActivity: serverTimestamp(),
            isDefault: true
          })
        );
        
        await Promise.all(promises);
      }
      setInitialLoad(false);
    };

    initializeDefaultChannels();
  }, [currentWorkspace, user, initialLoad]);

  // Load user's channels and all public channels
  useEffect(() => {
    if (!currentWorkspace || !user) return;

    setChannelsLoading(true);
    
    // Load channels with optimized query
    const channelsQuery = query(
      collection(db, 'channels'),
      where('workspaceId', '==', currentWorkspace.id),
      orderBy('lastActivity', 'desc'),
      limit(50) // Limit initial load
    );

    const unsubscribe = onSnapshot(
      channelsQuery, 
      (snapshot) => {
        const allChannelsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Channel));
        
        // Filter channels based on visibility
        const visibleChannels = allChannelsList.filter(channel => {
          if (channel.type === 'public') return true;
          if (channel.type === 'secret' && !channel.members?.includes(user.id)) return false;
          if (channel.type === 'private' && !channel.members?.includes(user.id)) return false;
          return true;
        });
        
        setChannels(visibleChannels);
        setAllChannels(allChannelsList);
        setChannelsLoading(false);
        
        // Select first channel if none selected
        if (!selectedChannelId && visibleChannels.length > 0) {
          setSelectedChannelId(visibleChannels[0].id);
        }
      },
      async (error) => {
        console.error('Error loading channels:', error);
        
        // Fallback: Try without ordering if index is not ready
        if (error.message?.includes('index')) {
          try {
            const fallbackQuery = query(
              collection(db, 'channels'),
              where('workspaceId', '==', currentWorkspace.id),
              limit(50)
            );
            
            const snapshot = await getDocs(fallbackQuery);
            const allChannelsList = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as Channel));
            
            // Sort manually
            allChannelsList.sort((a, b) => {
              const aTime = a.lastActivity?.getTime() || 0;
              const bTime = b.lastActivity?.getTime() || 0;
              return bTime - aTime;
            });
            
            // Filter channels based on visibility
            const visibleChannels = allChannelsList.filter(channel => {
              if (channel.type === 'public') return true;
              if (channel.type === 'secret' && !channel.members?.includes(user.id)) return false;
              if (channel.type === 'private' && !channel.members?.includes(user.id)) return false;
              return true;
            });
            
            setChannels(visibleChannels);
            setAllChannels(allChannelsList);
            
            // Select first channel if none selected
            if (!selectedChannelId && visibleChannels.length > 0) {
              setSelectedChannelId(visibleChannels[0].id);
            }
          } catch (fallbackError) {
            console.error('Fallback query also failed:', fallbackError);
          }
        }
        
        setChannelsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentWorkspace, user, selectedChannelId]);

  // Load workspace members
  useEffect(() => {
    if (!currentWorkspace) return;

    const membersQuery = query(
      collection(db, 'workspace_members'),
      where('workspace_id', '==', currentWorkspace.id),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(membersQuery, (snapshot) => {
      const membersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setWorkspaceMembers(membersList);
    });

    return () => unsubscribe();
  }, [currentWorkspace]);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);

  // Load messages for selected channel
  useEffect(() => {
    if (!selectedChannelId) return;

    setMessagesLoading(true);
    setMessages([]); // Clear previous messages
    
    const messagesQuery = query(
      collection(db, 'messages'),
      where('channelId', '==', selectedChannelId),
      orderBy('timestamp', 'desc'), // Load newest first
      limit(50) // Load last 50 messages
    );

    const unsubscribe = onSnapshot(
      messagesQuery, 
      (snapshot) => {
        const messagesList = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate()
          } as Message))
          .reverse(); // Reverse to show oldest first
        
        setMessages(messagesList);
        setMessagesLoading(false);
        
        // Scroll to bottom after messages load - only for new messages, not channel switch
        if (snapshot.docChanges().some(change => change.type === 'added')) {
          setTimeout(() => scrollToBottom(), 100);
        }
      },
      (error) => {
        console.error('Error loading messages:', error);
        setMessagesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedChannelId, scrollToBottom]);

  // Load workspace storage info
  useEffect(() => {
    if (!currentWorkspace) return;

    const storageRef = doc(db, 'workspaceStorage', currentWorkspace.id);
    const unsubscribe = onSnapshot(storageRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setWorkspaceStorage({
          used: data.usedBytes || 0,
          max: data.maxBytes || 5368709120
        });
      }
    });

    return () => unsubscribe();
  }, [currentWorkspace]);

  const createChannel = async () => {
    if (!newChannelName.trim() || !currentWorkspace || !user) return;

    try {
      const channelData: Partial<Channel> = {
        name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
        displayName: newChannelName,
        description: newChannelDescription,
        type: newChannelType,
        workspaceId: currentWorkspace.id,
        createdBy: user.id,
        createdAt: new Date(),
        members: newChannelType === 'public' ? [] : [user.id, ...selectedMembers],
        admins: [user.id],
        lastActivity: new Date(),
        isDefault: false
      };

      const docRef = await addDoc(collection(db, 'channels'), channelData);
      
      // Send system message
      await addDoc(collection(db, 'messages'), {
        channelId: docRef.id,
        content: `${user.displayName || user.email}이(가) 채널을 생성했습니다.`,
        author: 'system',
        authorName: 'System',
        timestamp: serverTimestamp(),
        isAI: false
      });

      // Invite selected members
      if (selectedMembers.length > 0) {
        const memberNames = selectedMembers.map(memberId => {
          const member = workspaceMembers.find(m => m.user_id === memberId);
          return member?.display_name || member?.user_name || 'Unknown';
        }).join(', ');

        await addDoc(collection(db, 'messages'), {
          channelId: docRef.id,
          content: `${memberNames}을(를) 채널에 초대했습니다.`,
          author: 'system',
          authorName: 'System',
          timestamp: serverTimestamp(),
          isAI: false
        });
      }

      setNewChannelName('');
      setNewChannelDescription('');
      setSelectedMembers([]);
      setShowCreateChannel(false);
      setSelectedChannelId(docRef.id);
    } catch (error) {
      console.error('Error creating channel:', error);
      alert('채널 생성에 실패했습니다.');
    }
  };

  const joinChannel = async (channelId: string) => {
    if (!user) return;

    try {
      const channelRef = doc(db, 'channels', channelId);
      const channelDoc = await getDoc(channelRef);
      
      if (channelDoc.exists()) {
        const channelData = channelDoc.data();
        const updatedMembers = [...(channelData.members || []), user.id];
        
        await updateDoc(channelRef, {
          members: updatedMembers
        });

        // Send system message
        await addDoc(collection(db, 'messages'), {
          channelId,
          content: `${user.displayName || user.email}이(가) 채널에 참여했습니다.`,
          author: 'system',
          authorName: 'System',
          timestamp: serverTimestamp(),
          isAI: false
        });

        setShowChannelBrowser(false);
        setSelectedChannelId(channelId);
      }
    } catch (error) {
      console.error('Error joining channel:', error);
      alert('채널 참여에 실패했습니다.');
    }
  };

  const leaveChannel = async (channelId: string) => {
    if (!user) return;

    try {
      const channelRef = doc(db, 'channels', channelId);
      const channelDoc = await getDoc(channelRef);
      
      if (channelDoc.exists()) {
        const channelData = channelDoc.data();
        const updatedMembers = (channelData.members || []).filter((id: string) => id !== user.id);
        
        await updateDoc(channelRef, {
          members: updatedMembers
        });

        // Send system message
        await addDoc(collection(db, 'messages'), {
          channelId,
          content: `${user.displayName || user.email}이(가) 채널을 나갔습니다.`,
          author: 'system',
          authorName: 'System',
          timestamp: serverTimestamp(),
          isAI: false
        });

        // Select another channel
        if (selectedChannelId === channelId && channels.length > 0) {
          const otherChannel = channels.find(ch => ch.id !== channelId);
          if (otherChannel) {
            setSelectedChannelId(otherChannel.id);
          }
        }
      }
    } catch (error) {
      console.error('Error leaving channel:', error);
    }
  };

  const inviteAIToChannel = async (provider: 'openai' | 'claude', model: string) => {
    if (!selectedChannelId || !user) return;

    try {
      const channelRef = doc(db, 'channels', selectedChannelId);
      await updateDoc(channelRef, {
        aiBot: {
          provider,
          model,
          invitedBy: user.id,
          invitedAt: new Date()
        }
      });

      // Send system message with model info
      const modelInfo = AI_MODELS.find(m => m.model === model);
      const botName = modelInfo ? `Pulse AI (${modelInfo.displayName})` : `Pulse AI (${model})`;
      
      await addDoc(collection(db, 'messages'), {
        channelId: selectedChannelId,
        content: `${user.displayName || user.email}이(가) ${botName}를 초대했습니다.`,
        author: 'system',
        authorName: 'System',
        timestamp: serverTimestamp(),
        isAI: false
      });

      setShowAIInvite(false);
      setShowAIModelSelect(false);
      setSelectedAIProvider(null);
    } catch (error) {
      console.error('Error inviting AI:', error);
    }
  };

  const removeAIFromChannel = async () => {
    if (!selectedChannelId) return;

    try {
      const channelRef = doc(db, 'channels', selectedChannelId);
      await updateDoc(channelRef, {
        aiBot: null
      });

      // Send system message
      await addDoc(collection(db, 'messages'), {
        channelId: selectedChannelId,
        content: 'Pulse AI가 채널을 나갔습니다.',
        author: 'system',
        authorName: 'System',
        timestamp: serverTimestamp(),
        isAI: false
      });
    } catch (error) {
      console.error('Error removing AI:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user || !selectedChannelId || !currentWorkspace) return;

    const file = files[0];
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (file.size > maxSize) {
      alert('파일 크기는 50MB를 초과할 수 없습니다.');
      return;
    }

    // Check workspace storage limit
    if (workspaceStorage.used + file.size > workspaceStorage.max) {
      alert('워크스페이스 저장 공간이 부족합니다.');
      return;
    }

    // Add file to pending attachments
    await addPendingFile(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addPendingFile = async (file: File) => {
    // Determine file type
    let fileType: 'image' | 'video' | 'code' | 'file' = 'file';
    let preview = '';
    let language = '';
    let base64Data = '';

    if (file.type.startsWith('image/')) {
      fileType = 'image';
      // Create local preview URL
      preview = URL.createObjectURL(file);
      
      // Also read as base64 for AI processing
      try {
        const reader = new FileReader();
        base64Data = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result); // This includes data:image/xxx;base64,... prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } catch (error) {
        console.error('Error reading image as base64:', error);
      }
    } else if (file.type.startsWith('video/')) {
      fileType = 'video';
      preview = URL.createObjectURL(file);
    } else if (file.name.match(/\.(js|jsx|ts|tsx|py|java|cpp|c|go|rs|html|css|json|xml|yaml|yml|md)$/i)) {
      fileType = 'code';
      const ext = file.name.split('.').pop()?.toLowerCase();
      language = ext || 'text';
      
      // Read text content for code files
      try {
        const text = await file.text();
        base64Data = text; // Store raw text for code files
      } catch (error) {
        console.error('Error reading code file:', error);
      }
    } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      // For PDF files, store as file type with base64 data
      fileType = 'file';
      
      // Read PDF as base64 for AI processing
      try {
        const reader = new FileReader();
        base64Data = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result); // This includes data:application/pdf;base64,... prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } catch (error) {
        console.error('Error reading PDF as base64:', error);
      }
    }

    const pendingAttachment: Attachment = {
      id: Date.now().toString(),
      type: fileType,
      name: file.name,
      url: '', // Will be filled after upload
      size: file.size,
      mimeType: file.type,
      preview,
      language,
      content: '',
      base64Data // Store base64 data for AI processing
    };

    setPendingAttachments(prev => [...prev, pendingAttachment]);
    setPendingFiles(prev => [...prev, file]);
  };

  const removePendingAttachment = (id: string) => {
    const index = pendingAttachments.findIndex(att => att.id === id);
    if (index !== -1) {
      // Clean up object URL if it's an image/video
      const attachment = pendingAttachments[index];
      if (attachment.preview && attachment.preview.startsWith('blob:')) {
        URL.revokeObjectURL(attachment.preview);
      }
      
      setPendingAttachments(prev => prev.filter(att => att.id !== id));
      setPendingFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        // Create a proper file with name
        const renamedFile = new File([file], `pasted_image_${Date.now()}.png`, { type: file.type });
        await addPendingFile(renamedFile);
        break;
      }
    }
  };

  const sendMessage = async () => {
    if ((!messageInput.trim() && pendingAttachments.length === 0) || !user || !selectedChannelId) return;
    if (sendingMessage) return; // Prevent double sending

    const currentChannel = channels.find(ch => ch.id === selectedChannelId);
    const isAIMention = messageInput.toLowerCase().startsWith('@ai');
    
    try {
      setSendingMessage(true);
      setUploadingFile(true);
      
      // Upload all pending files if any
      const uploadedAttachments: Attachment[] = [];
      
      if (pendingFiles.length > 0 && currentWorkspace) {
        for (let i = 0; i < pendingFiles.length; i++) {
          const file = pendingFiles[i];
          const attachment = pendingAttachments[i];
          
          try {
            // Upload file to Firebase Storage
            const timestamp = Date.now();
            const fileName = `${timestamp}_${file.name}`;
            const storageRef = ref(storage, `workspaces/${currentWorkspace.id}/channels/${selectedChannelId}/${fileName}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            // Update attachment with download URL
            const uploadedAttachment: Attachment = {
              ...attachment,
              url: downloadURL,
              preview: attachment.type === 'image' || attachment.type === 'video' ? downloadURL : attachment.preview
            };
            
            // If it's a code file, read full content
            if (attachment.type === 'code') {
              const text = await file.text();
              uploadedAttachment.content = text; // Full content for display
              uploadedAttachment.base64Data = text; // Also store in base64Data for AI
            }
            
            // Preserve base64Data for images and PDFs
            if (attachment.base64Data && (attachment.type === 'image' || file.type === 'application/pdf')) {
              uploadedAttachment.base64Data = attachment.base64Data;
            }
            
            uploadedAttachments.push(uploadedAttachment);
            
            // Update workspace storage
            try {
              await updateDoc(doc(db, 'workspaceStorage', currentWorkspace.id), {
                usedBytes: increment(file.size),
                fileCount: increment(1)
              });
            } catch (error) {
              console.error('Error updating workspace storage:', error);
              await setDoc(doc(db, 'workspaceStorage', currentWorkspace.id), {
                usedBytes: file.size,
                fileCount: 1,
                maxBytes: 5368709120
              });
            }
          } catch (error) {
            console.error('Error uploading file:', error);
            alert(`파일 업로드 실패: ${file.name}`);
          }
        }
      }
      
      // Build message content
      let messageContent = messageInput;
      if (!messageContent && uploadedAttachments.length > 0) {
        // If no text but has attachments, create default message
        if (uploadedAttachments.length === 1) {
          const att = uploadedAttachments[0];
          messageContent = att.type === 'image' ? '이미지를 공유했습니다' :
                          att.type === 'video' ? '동영상을 공유했습니다' :
                          att.type === 'code' ? `코드 파일을 공유했습니다: ${att.name}` :
                          `파일을 공유했습니다: ${att.name}`;
        } else {
          messageContent = `${uploadedAttachments.length}개의 파일을 공유했습니다`;
        }
      }
      
      // Send message with attachments
      const userMessage: any = {
        channelId: selectedChannelId,
        content: messageContent,
        author: user.id,
        authorName: user.displayName || user.name || user.email,
        authorAvatar: user.avatar_url,
        timestamp: serverTimestamp(),
        isAI: false,
        status: 'sent'
      };
      
      if (uploadedAttachments.length > 0) {
        // Clean attachments to ensure no functions or invalid values
        userMessage.attachments = uploadedAttachments.map(att => ({
          id: att.id,
          type: att.type,
          name: att.name,
          url: att.url,
          size: att.size,
          mimeType: att.mimeType || '',
          language: att.language || '',
          // Don't include base64Data or content in Firestore - too large
          // These are only needed for AI processing
        }));
      }

      const docRef = await addDoc(collection(db, 'messages'), userMessage);

      // Handle AI response if mentioned and AI is in channel
      if (isAIMention && currentChannel?.aiBot) {
        setIsLoading(true);
        
        // Add AI response message that will be updated with streaming content
        const aiMessageRef = await addDoc(collection(db, 'messages'), {
          channelId: selectedChannelId,
          content: '',
          author: currentChannel.aiBot.model,
          authorName: `Pulse AI (${currentChannel.aiBot.model})`,
          isAI: true,
          aiModel: currentChannel.aiBot.model,
          timestamp: serverTimestamp(),
          isLoading: true,
          isStreaming: true
        });
        
        try {
          // Remove @AI prefix from message
          const cleanContent = messageContent.replace(/^@ai\s*/i, '');
          
          // Get auth token
          const currentUser = auth.currentUser;
          if (!currentUser) throw new Error('User not authenticated');
          const token = await currentUser.getIdToken();
          
          // Use EventSource for SSE streaming
          const enableStreaming = true; // Enable streaming for real-time responses
          
          if (enableStreaming) {
            // Create request body
            const contextMessages = messages.slice(-10).map(msg => ({
              role: msg.isAI ? 'assistant' : 'user',
              content: typeof msg.content === 'string' ? msg.content : 
                      msg.content && typeof msg.content === 'object' ? JSON.stringify(msg.content) : ''
            }));
            
            // Build messages array with context and new message
            const messagesArray = [
              ...contextMessages,
              {
                role: 'user',
                content: cleanContent
              }
            ];
            
            const requestBody = {
              messages: messagesArray,
              model: currentChannel?.aiBot?.model || 'gpt-4o',
              channelId: selectedChannelId,
              workspaceId: currentWorkspace?.id,
              streaming: true
            };
            
            // Use fetch with streaming response
            const apiUrl = process.env.NODE_ENV === 'production' 
              ? 'https://teampulse-backend.herokuapp.com/api/chat/ai'
              : 'http://localhost:5001/api/chat/ai';
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(requestBody)
            });
            
            if (response.headers.get('content-type')?.includes('text/event-stream')) {
              // Handle SSE streaming
              const reader = response.body?.getReader();
              const decoder = new TextDecoder();
              let accumulatedContent = '';
              
              if (reader) {
                try {
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');
                    
                    for (const line of lines) {
                      if (line.startsWith('data: ')) {
                        try {
                          const data = JSON.parse(line.slice(6));
                          
                          if (data.type === 'chunk') {
                            accumulatedContent += data.content;
                            // Update the message with accumulated content
                            await updateDoc(doc(db, 'messages', aiMessageRef.id), {
                              content: accumulatedContent,
                              isLoading: false,
                              isStreaming: true
                            });
                          } else if (data.type === 'done') {
                            // Final update
                            await updateDoc(doc(db, 'messages', aiMessageRef.id), {
                              content: data.content || accumulatedContent,
                              isLoading: false,
                              isStreaming: false
                            });
                          }
                        } catch (e) {
                          console.error('Error parsing SSE data:', e);
                        }
                      }
                    }
                  }
                } finally {
                  reader.releaseLock();
                }
              }
            } else {
              // Fall back to non-streaming response
              const data = await response.json();
              await updateDoc(doc(db, 'messages', aiMessageRef.id), {
                content: data.data?.content || 'AI 응답을 받지 못했습니다.',
                isLoading: false,
                isStreaming: false
              });
            }
          } else {
            // Non-streaming request (legacy)
            const apiUrl = process.env.NODE_ENV === 'production' 
              ? 'https://teampulse-backend.herokuapp.com/api/chat/ai'
              : 'http://localhost:5001/api/chat/ai';
            
            const contextMessages = messages.slice(-10).map(msg => ({
              role: msg.isAI ? 'assistant' : 'user',
              content: typeof msg.content === 'string' ? msg.content : 
                      msg.content && typeof msg.content === 'object' ? JSON.stringify(msg.content) : ''
            }));
            
            // Build messages array with context and new message
            const messagesArray = [
              ...contextMessages,
              {
                role: 'user',
                content: cleanContent
              }
            ];
            
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                messages: messagesArray,
                model: currentChannel?.aiBot?.model || 'gpt-4o',
                channelId: selectedChannelId,
                workspaceId: currentWorkspace?.id
              })
            });
          
            if (!response.ok) {
              throw new Error('Failed to get AI response');
            }
            
            const data = await response.json();
            console.log('AI response received:', data);
            
            // Update the AI message with the response
            await updateDoc(doc(db, 'messages', aiMessageRef.id), {
              content: data.data?.content || 'AI 응답을 받지 못했습니다.',
              isLoading: false,
              isStreaming: false
            });
          }
        } catch (error) {
          console.error('Error getting AI response:', error);
          
          // Update message on error - Only update the existing AI message
          try {
            await updateDoc(doc(db, 'messages', aiMessageRef.id), {
              content: '죄송합니다. AI 응답 생성 중 오류가 발생했습니다.',
              isLoading: false,
              isStreaming: false,
              isError: true
            });
          } catch (updateError) {
            console.error('Error updating message on error:', updateError);
          }
          
          // Do not add additional system message - it's redundant
        } finally {
          setIsLoading(false);
        }
      }

      // Clear input and attachments
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
      alert('메시지 전송에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setUploadingFile(false);
      setSendingMessage(false);
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (messageDoc.exists()) {
        const reactions = messageDoc.data().reactions || [];
        const existingReaction = reactions.find((r: any) => r.emoji === emoji);
        
        if (existingReaction) {
          if (existingReaction.users.includes(user.id)) {
            // Remove reaction
            existingReaction.users = existingReaction.users.filter((id: string) => id !== user.id);
            existingReaction.count = existingReaction.users.length;
            
            if (existingReaction.count === 0) {
              reactions.splice(reactions.indexOf(existingReaction), 1);
            }
          } else {
            // Add reaction
            existingReaction.users.push(user.id);
            existingReaction.count = existingReaction.users.length;
          }
        } else {
          // New reaction
          reactions.push({
            emoji,
            users: [user.id],
            count: 1
          });
        }
        
        await updateDoc(messageRef, { reactions });
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const formatTime = (date: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const currentChannel = channels.find(ch => ch.id === selectedChannelId);
  const emojis = ['👍', '❤️', '😄', '🎉', '🚀', '💡', '👏', '🔥'];
  const availableChannels = allChannels.filter(channel => {
    if (channel.type === 'secret') return false;
    if (channel.members?.includes(user?.id || '')) return false;
    if (searchQuery) {
      return channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             channel.description?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50 relative">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        className="lg:hidden fixed top-20 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
      >
        {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <div className={`${
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 fixed lg:relative w-64 h-full bg-white border-r border-gray-200 flex flex-col z-40 transition-transform duration-300`}>
        {/* Workspace Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900">{currentWorkspace?.name || 'Workspace'}</h4>
              <p className="text-xs text-gray-500">
                Storage: {formatFileSize(workspaceStorage.used)} / {formatFileSize(workspaceStorage.max)}
              </p>
            </div>
            <button className="p-1 hover:bg-gray-100 rounded">
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
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">채널</span>
              <div className="flex gap-1">
                <button 
                  onClick={() => setShowChannelBrowser(true)}
                  className="text-gray-400 hover:text-gray-600"
                  title="채널 찾아보기"
                >
                  <Search className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setShowCreateChannel(true)}
                  className="text-gray-400 hover:text-gray-600"
                  title="채널 만들기"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-1">
              {channelsLoading ? (
                // Loading skeleton for channels
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                      <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="flex-1 h-4 bg-gray-200 rounded animate-pulse" />
                    </div>
                  ))}
                </>
              ) : channels.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  채널이 없습니다
                </div>
              ) : (
                channels.map((channel) => (
                  <motion.button
                    key={channel.id}
                    whileHover={{ x: 2 }}
                    onClick={() => {
                      setSelectedChannelId(channel.id);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm text-left transition-colors ${
                      selectedChannelId === channel.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {channel.type === 'secret' ? (
                      <EyeOff className="w-4 h-4" />
                    ) : channel.type === 'private' ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <Hash className="w-4 h-4" />
                    )}
                    <span className="flex-1 truncate">{channel.displayName || channel.name}</span>
                    {channel.isDefault && <Shield className="w-3 h-3 text-green-500" />}
                    {channel.aiBot && <Bot className="w-3 h-3 text-purple-500" />}
                  </motion.button>
                ))
              )}
            </div>
          </div>

          {/* Direct Messages */}
          <div className="p-3 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">Direct Messages</span>
              <Plus className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
            </div>
            <div className="space-y-1">
              {/* DM list would go here */}
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {mobileSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel Header */}
        <div className="px-4 lg:px-6 py-3 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2 lg:gap-3 min-w-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-1"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            {currentChannel?.type === 'secret' ? (
              <EyeOff className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600 flex-shrink-0" />
            ) : currentChannel?.type === 'private' ? (
              <Lock className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600 flex-shrink-0" />
            ) : (
              <Hash className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {currentChannel?.displayName || currentChannel?.name || 'Select a channel'}
              </h3>
              {currentChannel?.description && (
                <p className="text-xs text-gray-500 truncate hidden sm:block">{currentChannel.description}</p>
              )}
            </div>
            {currentChannel?.members && (
              <span className="text-sm text-gray-500 hidden sm:inline">
                {currentChannel.members.length}명
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 lg:gap-2">
            {currentChannel && !currentChannel.aiBot && (
              <button
                onClick={() => setShowAIInvite(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
              >
                <Bot className="w-4 h-4" />
                AI 초대하기
              </button>
            )}
            {currentChannel?.aiBot && (
              <button
                onClick={removeAIFromChannel}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                AI 보내기
              </button>
            )}
            {currentChannel && !currentChannel.isDefault && (
              <button 
                onClick={() => leaveChannel(selectedChannelId)}
                className="p-2 hover:bg-gray-100 rounded"
                title="채널 나가기"
              >
                <LogOut className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* Ask Pulse Button - Only show if AI bot is invited */}
        {/* AI Tools Section Removed - Now integrated in slash commands */}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4" style={{ scrollBehavior: 'smooth' }}>
          {messagesLoading ? (
            // Loading skeleton for messages
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="w-16 h-3 bg-gray-200 rounded animate-pulse" />
                    </div>
                    <div className="w-3/4 h-12 bg-gray-200 rounded-lg animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageSquare className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-sm">대화를 시작해보세요</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {messages.map((msg) => {
                  const isMyMessage = msg.author === user?.id;
                  
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${isMyMessage ? 'flex-row-reverse' : ''}`}
                    >
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {msg.authorAvatar ? (
                          <img src={msg.authorAvatar} alt="" className="w-8 h-8 rounded-full" />
                        ) : msg.isAI ? (
                          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs">
                            AI
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs">
                            {msg.authorName?.[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      
                      {/* Message Content */}
                      <div className={`max-w-[70%] ${isMyMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                        {/* Name and Time - Above bubble for my messages, below for others */}
                        <div className={`flex items-baseline gap-2 mb-1 ${isMyMessage ? 'flex-row-reverse' : ''}`}>
                          <span className={`font-medium text-sm ${msg.isAI ? 'text-purple-600' : 'text-gray-900'}`}>
                            {msg.authorName}
                          </span>
                          <span className="text-xs text-gray-500">{formatTime(msg.timestamp)}</span>
                          {msg.aiModel && (
                            <span className="text-xs text-purple-500 bg-purple-50 px-2 py-0.5 rounded">
                              {msg.aiModel}
                            </span>
                          )}
                        </div>
                        
                        {/* Message Bubble */}
                        <div className={`px-4 py-2 rounded-2xl ${
                          isMyMessage 
                            ? 'bg-blue-600 text-white rounded-br-sm' 
                            : msg.isAI 
                              ? 'bg-purple-100 text-purple-900 rounded-bl-sm'
                              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                        }`}>
                          {msg.isLoading && !msg.content ? (
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1">
                                <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                              </div>
                              <span className="text-sm opacity-70">
                                Pulse AI가 대답을 준비 중입니다...
                              </span>
                            </div>
                          ) : (
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              {msg.isAI ? (
                                <>
                                  <ReactMarkdown 
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    pre: ({node, ...props}: any) => (
                                      <div className="bg-gray-900 rounded-lg p-3 my-2 overflow-x-auto">
                                        <pre className="text-gray-100 text-xs" {...props} />
                                      </div>
                                    ),
                                    code: ({node, className, children, ...props}: any) => {
                                      const match = /language-(\w+)/.exec(className || '');
                                      const lang = match ? match[1] : '';
                                      const isInline = !className || !match;
                                      return !isInline ? (
                                        <code className="text-gray-100" {...props}>
                                          {children}
                                        </code>
                                      ) : (
                                        <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props}>
                                          {children}
                                        </code>
                                      );
                                    },
                                    h1: ({...props}: any) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
                                    h2: ({...props}: any) => <h2 className="text-lg font-semibold mt-3 mb-2" {...props} />,
                                    h3: ({...props}: any) => <h3 className="text-base font-medium mt-2 mb-1" {...props} />,
                                    ul: ({...props}: any) => <ul className="list-disc list-inside my-2" {...props} />,
                                    ol: ({...props}: any) => <ol className="list-decimal list-inside my-2" {...props} />,
                                    li: ({...props}: any) => <li className="my-1" {...props} />,
                                    p: ({...props}: any) => <p className="my-2" {...props} />,
                                    a: ({...props}: any) => <a className="text-blue-600 hover:underline" {...props} />,
                                    blockquote: ({...props}: any) => (
                                      <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2" {...props} />
                                    ),
                                    table: ({...props}: any) => (
                                      <div className="overflow-x-auto my-2">
                                        <table className="border-collapse border border-gray-300" {...props} />
                                      </div>
                                    ),
                                    th: ({...props}: any) => (
                                      <th className="border border-gray-300 px-3 py-1 bg-gray-100 font-semibold" {...props} />
                                    ),
                                    td: ({...props}: any) => (
                                      <td className="border border-gray-300 px-3 py-1" {...props} />
                                    ),
                                    hr: ({...props}: any) => <hr className="my-4 border-gray-300" {...props} />
                                  }}
                                >
                                  {typeof msg.content === 'string' 
                                    ? msg.content 
                                    : typeof msg.content === 'object' && msg.content !== null && 'summary' in msg.content
                                      ? (msg.content as any).summary 
                                      : JSON.stringify(msg.content)}
                                </ReactMarkdown>
                                {msg.isStreaming && (
                                  <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
                                )}
                                </>
                              ) : (
                                typeof msg.content === 'string' 
                                  ? msg.content 
                                  : typeof msg.content === 'object' && msg.content !== null && 'summary' in msg.content
                                    ? (msg.content as any).summary 
                                    : JSON.stringify(msg.content)
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Attachments */}
                        {msg.attachments && msg.attachments.map((att) => (
                          <div key={att.id} className={`mt-2 ${isMyMessage ? 'ml-auto' : ''}`}>
                            {att.type === 'image' && (
                              <img src={att.preview} alt={att.name} className="max-w-sm rounded-lg" />
                            )}
                            {att.type === 'video' && (
                              <video src={att.preview} controls className="max-w-sm rounded-lg" />
                            )}
                            {att.type === 'code' && (
                              <div className="bg-gray-900 text-gray-100 rounded-lg p-3 font-mono text-xs max-w-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-green-400 flex items-center gap-1">
                                    <Code className="w-4 h-4" />
                                    {att.name}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setCodeModal({ 
                                        open: true, 
                                        code: att.content || '', 
                                        filename: att.name, 
                                        language: att.language || 'text' 
                                      })}
                                      className="text-blue-400 hover:text-blue-300 text-xs"
                                    >
                                      전체보기
                                    </button>
                                    <a
                                      href={`data:text/plain;charset=utf-8,${encodeURIComponent(att.content || '')}`}
                                      download={att.name}
                                      className="text-gray-400 hover:text-gray-300"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </div>
                                </div>
                                <pre 
                                  className="whitespace-pre-wrap overflow-hidden cursor-pointer hover:bg-gray-800 p-2 rounded transition-colors"
                                  onClick={() => setCodeModal({ 
                                    open: true, 
                                    code: att.content || '', 
                                    filename: att.name, 
                                    language: att.language || 'text' 
                                  })}
                                  style={{ maxHeight: '200px' }}
                                >
                                  {att.content ? att.content.substring(0, 500) + (att.content.length > 500 ? '\n\n... (클릭하여 전체 코드 보기)' : '') : ''}
                                </pre>
                              </div>
                            )}
                            {att.type === 'file' && (
                              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                                <FileText className="w-5 h-5 text-blue-600" />
                                <a 
                                  href={att.url} 
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 flex items-center gap-2 hover:text-blue-600"
                                >
                                  <span className="text-sm text-gray-700">{att.name}</span>
                                  <span className="text-xs text-gray-500">({formatFileSize(att.size)})</span>
                                </a>
                                <a
                                  href={att.url}
                                  download={att.name}
                                  className="p-1 hover:bg-gray-200 rounded"
                                  title="다운로드"
                                >
                                  <Download className="w-4 h-4 text-gray-600" />
                                </a>
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Reactions */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className={`flex gap-1 mt-2 ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                            {msg.reactions.map((reaction, i) => (
                              <button
                                key={i}
                                onClick={() => addReaction(msg.id, reaction.emoji)}
                                className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs hover:bg-gray-200"
                              >
                                <span>{reaction.emoji}</span>
                                <span className="text-gray-600">{reaction.count}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Add to Task button for AI messages */}
                        {msg.isAI && (
                          <button 
                            onClick={() => alert('추후 오픈 예정입니다.')}
                            className={`mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 ${isMyMessage ? 'ml-auto' : ''}`}
                          >
                            업무에 추가
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
            </AnimatePresence>
          </div>
          )}
          
          {/* Global loading indicator for user messages */}
          {sendingMessage && (
            <div className="flex items-center justify-center py-2">
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
                <span className="text-sm">메시지 전송 중...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="px-4 lg:px-6 py-3 lg:py-4 border-t border-gray-200 bg-white">
          <div className="flex items-end gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,video/*,.pdf,.doc,.docx,.txt,.js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.go,.rs,.html,.css,.json,.xml,.yaml,.yml,.md"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
            >
              <Paperclip className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1 relative">
              {/* Pending Attachments */}
              {pendingAttachments.length > 0 && (
                <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-white border border-gray-200 rounded-lg shadow-lg">
                  <div className="space-y-2">
                    {pendingAttachments.map((attachment, index) => (
                      <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          {attachment.type === 'image' && attachment.preview ? (
                            <img 
                              src={attachment.preview} 
                              alt={attachment.name} 
                              className="h-12 w-12 object-cover rounded"
                            />
                          ) : attachment.type === 'code' ? (
                            <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center">
                              <Code className="w-6 h-6 text-gray-600" />
                            </div>
                          ) : (
                            <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center">
                              <FileText className="w-6 h-6 text-gray-600" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium truncate max-w-xs">{attachment.name}</p>
                            <p className="text-xs text-gray-500">
                              {(attachment.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removePendingAttachment(attachment.id)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <X className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <textarea
                ref={messageInputRef}
                value={messageInput}
                disabled={sendingMessage || isLoading}
                onChange={(e) => {
                  const value = e.target.value;
                  setMessageInput(value);
                  
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
                onPaste={handlePaste}
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
                placeholder={currentChannel?.aiBot ? "메시지를 입력하거나 '/'로 명령어를 시작하세요..." : "메시지를 입력하세요..."}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={1}
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
                      setMessageInput('@AI ');
                      messageInputRef.current?.focus();
                      break;
                    case 'analyze-file':
                      fileInputRef.current?.click();
                      break;
                    case 'web-search':
                      setMessageInput('@AI [웹검색] ');
                      messageInputRef.current?.focus();
                      break;
                    case 'code-execute':
                      setMessageInput('@AI [코드실행] ');
                      messageInputRef.current?.focus();
                      break;
                    case 'generate':
                      setMessageInput('@AI 생성해주세요: ');
                      messageInputRef.current?.focus();
                      break;
                  }
                }}
                searchQuery={slashCommandQuery}
                position={commandPosition}
                currentModel={selectedModel}
              />
              
              {/* Legacy Command Menu - Hidden */}
              {false && showCommandMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 min-w-[300px] max-h-[400px] overflow-y-auto">
                  <div className="text-xs font-semibold text-gray-500 px-3 py-1">AI 명령어</div>
                  <button
                    onClick={() => {
                      setMessageInput('@AI ');
                      setShowCommandMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <span className="text-lg">🤖</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">/ai</div>
                      <div className="text-xs text-gray-500">AI 어시스턴트에게 질문하기</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setMessageInput('@AI [웹검색] ');
                      setShowCommandMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <span className="text-lg">🔍</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">/web</div>
                      <div className="text-xs text-gray-500">웹 검색과 함께 질문 (GPT)</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setMessageInput('@AI [코드실행] ');
                      setShowCommandMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <span className="text-lg">💻</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">/code</div>
                      <div className="text-xs text-gray-500">코드 인터프리터 실행 (GPT)</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setMessageInput('@AI [도구] ');
                      setShowCommandMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <span className="text-lg">🛠️</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">/tools</div>
                      <div className="text-xs text-gray-500">도구 사용 활성화 (Claude)</div>
                    </div>
                  </button>
                  
                  <div className="border-t border-gray-200 my-2"></div>
                  <div className="text-xs font-semibold text-gray-500 px-3 py-1">파일 분석</div>
                  
                  <button
                    onClick={() => {
                      setMessageInput('@AI 이 이미지를 분석해줘: ');
                      setShowCommandMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <span className="text-lg">🖼️</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">/image</div>
                      <div className="text-xs text-gray-500">이미지 분석 (Vision API)</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setMessageInput('@AI 이 PDF를 요약해줘: ');
                      setShowCommandMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <span className="text-lg">📄</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">/pdf</div>
                      <div className="text-xs text-gray-500">PDF 문서 분석</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setMessageInput('@AI 이 코드를 검토해줘: ');
                      setShowCommandMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <span className="text-lg">📝</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">/review</div>
                      <div className="text-xs text-gray-500">코드 리뷰 및 분석</div>
                    </div>
                  </button>
                  
                  <div className="border-t border-gray-200 my-2"></div>
                  <div className="text-xs font-semibold text-gray-500 px-3 py-1">유용한 프롬프트</div>
                  
                  <button
                    onClick={() => {
                      setMessageInput('@AI 다음 내용을 한국어로 번역해줘: ');
                      setShowCommandMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <span className="text-lg">🌐</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">/translate</div>
                      <div className="text-xs text-gray-500">텍스트 번역</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setMessageInput('@AI 다음 내용을 요약해줘: ');
                      setShowCommandMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <span className="text-lg">📋</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">/summary</div>
                      <div className="text-xs text-gray-500">텍스트 요약</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setMessageInput('@AI 다음 코드를 최적화해줘: ');
                      setShowCommandMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <span className="text-lg">⚡</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">/optimize</div>
                      <div className="text-xs text-gray-500">코드 최적화</div>
                    </div>
                  </button>
                  
                  <div className="border-t border-gray-200 my-2"></div>
                  <div className="px-3 py-2 text-xs text-gray-500">
                    <div className="font-semibold mb-1">💡 팁:</div>
                    <div>• / 입력으로 명령어 메뉴 열기</div>
                    <div>• ESC로 메뉴 닫기</div>
                    <div>• 파일을 먼저 첨부한 후 명령어 사용</div>
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 hover:bg-gray-100 rounded relative"
            >
              <Smile className="w-5 h-5 text-gray-600" />
              {showEmojiPicker && (
                <div className="absolute bottom-full right-0 mb-2 p-2 bg-white rounded-lg shadow-lg border border-gray-200">
                  <div className="grid grid-cols-4 gap-1">
                    {emojis.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setMessageInput(prev => prev + emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="p-2 hover:bg-gray-100 rounded text-xl"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </button>
            <button
              onClick={() => {
                if (!sendingMessage && !uploadingFile && messageInput.trim()) {
                  sendMessage();
                }
              }}
              disabled={sendingMessage || uploadingFile || isLoading || !messageInput.trim()}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingMessage ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* AI Invite Modal */}
      {showAIInvite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">AI 어시스턴트 선택</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button
                onClick={() => {
                  setSelectedAIProvider('openai');
                  setShowAIModelSelect(true);
                }}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
              >
                <div className="text-2xl mb-2">🤖</div>
                <div className="font-semibold">ChatGPT</div>
                <div className="text-sm text-gray-500">OpenAI</div>
              </button>
              <button
                onClick={() => {
                  setSelectedAIProvider('claude');
                  setShowAIModelSelect(true);
                }}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-colors"
              >
                <div className="text-2xl mb-2">🎭</div>
                <div className="font-semibold">Claude</div>
                <div className="text-sm text-gray-500">Anthropic</div>
              </button>
            </div>
            <button
              onClick={() => setShowAIInvite(false)}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* AI Model Select Modal */}
      {showAIModelSelect && selectedAIProvider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {selectedAIProvider === 'openai' ? 'ChatGPT' : 'Claude'} 모델 선택
            </h3>
            <div className="space-y-3">
              {AI_MODELS
                .filter(model => model.provider === selectedAIProvider)
                .map(model => (
                  <button
                    key={model.model}
                    onClick={() => inviteAIToChannel(selectedAIProvider, model.model)}
                    className={`w-full p-4 border-2 rounded-lg text-left hover:border-blue-500 transition-colors ${
                      model.recommended ? 'border-green-400 bg-green-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {model.displayName}
                          {model.recommended && (
                            <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">추천</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">{model.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">입력: ₩{model.inputPrice}/1K</div>
                        <div className="text-sm text-gray-500">출력: ₩{model.outputPrice}/1K</div>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
            <button
              onClick={() => {
                setShowAIModelSelect(false);
                setSelectedAIProvider(null);
              }}
              className="w-full mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              뒤로
            </button>
          </div>
        </div>
      )}

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white">새 채널 만들기</h3>
                  <p className="text-blue-100 text-sm mt-1">팀과 소통할 새로운 공간을 만들어보세요</p>
                </div>
                <button
                  onClick={() => {
                    setShowCreateChannel(false);
                    setNewChannelName('');
                    setNewChannelDescription('');
                    setSelectedMembers([]);
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Channel Name */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <Hash className="w-4 h-4" />
                    채널 이름 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">#</span>
                    <input
                      type="text"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      placeholder="예: 마케팅-팀"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    소문자와 하이픈(-)만 사용 가능합니다
                  </p>
                </div>

                {/* Channel Description */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <FileText className="w-4 h-4" />
                    채널 설명 <span className="text-gray-400 font-normal">(선택사항)</span>
                  </label>
                  <textarea
                    value={newChannelDescription}
                    onChange={(e) => setNewChannelDescription(e.target.value)}
                    placeholder="이 채널의 목적을 설명해주세요"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    {newChannelDescription.length}/200
                  </p>
                </div>

                {/* Channel Type */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <Shield className="w-4 h-4" />
                    채널 유형
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewChannelType('public')}
                      className={`relative p-4 rounded-xl border-2 transition-all ${
                        newChannelType === 'public' 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {newChannelType === 'public' && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      <Globe className="w-6 h-6 text-green-600 mb-2 mx-auto" />
                      <div className="text-sm font-semibold text-gray-900">공개</div>
                      <div className="text-xs text-gray-500 mt-1">모든 멤버</div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setNewChannelType('private')}
                      className={`relative p-4 rounded-xl border-2 transition-all ${
                        newChannelType === 'private' 
                          ? 'border-amber-500 bg-amber-50' 
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {newChannelType === 'private' && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      <Lock className="w-6 h-6 text-amber-600 mb-2 mx-auto" />
                      <div className="text-sm font-semibold text-gray-900">비공개</div>
                      <div className="text-xs text-gray-500 mt-1">초대 멤버</div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setNewChannelType('secret')}
                      className={`relative p-4 rounded-xl border-2 transition-all ${
                        newChannelType === 'secret' 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {newChannelType === 'secret' && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      <EyeOff className="w-6 h-6 text-red-600 mb-2 mx-auto" />
                      <div className="text-sm font-semibold text-gray-900">비밀</div>
                      <div className="text-xs text-gray-500 mt-1">완전 비공개</div>
                    </button>
                  </div>
                  
                  {/* Type Description */}
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      {newChannelType === 'public' && '✅ 워크스페이스의 모든 멤버가 자유롭게 참여할 수 있습니다'}
                      {newChannelType === 'private' && '🔒 초대받은 멤버만 참여 가능하지만 채널 목록에는 표시됩니다'}
                      {newChannelType === 'secret' && '🔐 초대받은 멤버만 접근 가능하며 채널 검색에서도 숨겨집니다'}
                    </p>
                  </div>
                </div>

                {/* Member Selection for Private/Secret Channels */}
                {(newChannelType === 'private' || newChannelType === 'secret') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <Users className="w-4 h-4" />
                      초대할 멤버
                      {selectedMembers.length > 0 && (
                        <span className="ml-auto px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          {selectedMembers.length}명 선택됨
                        </span>
                      )}
                    </label>
                    
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="max-h-48 overflow-y-auto">
                        {workspaceMembers.filter(m => m.user_id !== user?.id).map((member, index) => (
                          <label 
                            key={member.id} 
                            className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                              index !== 0 ? 'border-t border-gray-100' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedMembers.includes(member.user_id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMembers([...selectedMembers, member.user_id]);
                                } else {
                                  setSelectedMembers(selectedMembers.filter(id => id !== member.user_id));
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <div className="flex items-center gap-3 ml-3 flex-1 min-w-0">
                              {member.avatar_url ? (
                                <img src={member.avatar_url} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                              ) : (
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-sm text-white font-medium flex-shrink-0">
                                  {member.display_name?.[0]?.toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900 truncate">
                                    {member.display_name || member.user_name}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full flex-shrink-0">
                                    {member.job_title || member.role}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCreateChannel(false);
                    setNewChannelName('');
                    setNewChannelDescription('');
                    setSelectedMembers([]);
                  }}
                  className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={createChannel}
                  disabled={!newChannelName.trim()}
                  className="flex-1 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all shadow-sm hover:shadow-md disabled:shadow-none flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  채널 만들기
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Channel Browser Modal */}
      {showChannelBrowser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">채널 찾아보기</h3>
              <p className="text-sm text-gray-600 mt-1">참여할 수 있는 채널을 찾아보세요</p>
            </div>
            
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="채널 이름 또는 설명으로 검색..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {availableChannels.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">참여 가능한 채널이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableChannels.map((channel) => (
                    <div key={channel.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {channel.type === 'private' ? (
                              <Lock className="w-4 h-4 text-gray-600" />
                            ) : (
                              <Hash className="w-4 h-4 text-gray-600" />
                            )}
                            <span className="font-semibold text-gray-900">
                              {channel.displayName || channel.name}
                            </span>
                            {channel.members && (
                              <span className="text-sm text-gray-500">
                                • {channel.members.length}명
                              </span>
                            )}
                          </div>
                          {channel.description && (
                            <p className="text-sm text-gray-600 mb-3">{channel.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => joinChannel(channel.id)}
                          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium"
                        >
                          참여하기
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowChannelBrowser(false);
                  setSearchQuery('');
                }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Modal */}
      {codeModal && codeModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Code className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">{codeModal.filename}</h2>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {codeModal.language}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(codeModal.code);
                    alert('코드가 클립보드에 복사되었습니다');
                  }}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  복사
                </button>
                <a
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(codeModal.code)}`}
                  download={codeModal.filename}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  다운로드
                </a>
                <button
                  onClick={() => setCodeModal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-gray-900">
              <pre className="text-gray-100 font-mono text-sm whitespace-pre-wrap">
                {codeModal.code}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamChat;