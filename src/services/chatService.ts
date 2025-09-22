import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp,
  addDoc,
  onSnapshot,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { v4 as uuidv4 } from 'uuid';
import { AIConfig } from './langchainService';

export interface ChatMessage {
  id: string;
  channel_id: string;
  workspace_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  content: string;
  type: 'text' | 'system' | 'ai' | 'image' | 'file' | 'code' | 'user';
  ai_model?: string;
  attachments?: {
    type: string;
    url: string;
    name: string;
    preview?: string;
    size?: number;
    mime_type?: string;
  }[];
  reactions?: {
    emoji: string;
    users: string[];
  }[];
  thread_id?: string;
  is_edited?: boolean;
  edited?: boolean;
  edited_at?: Timestamp;
  deleted?: boolean;
  deleted_at?: Timestamp;
  created_at: Timestamp;
  updated_at?: Timestamp;
}

export interface ChatChannel {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  members: string[];
  owner_id: string;
  ai_enabled: boolean;
  ai_models?: string[];
  ai_config?: AIConfig;
  created_at: Timestamp;
  updated_at: Timestamp;
  last_message?: {
    content: string;
    user_name: string;
    timestamp: Timestamp;
  };
  unread_count?: Record<string, number>;
}

export interface AIBot {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic';
  model: string;
  avatar: string;
  description: string;
  capabilities: string[];
}

class ChatService {
  private messagesCollection = collection(db, 'chat_messages');
  // Note: channelsCollection is now workspace-specific, not used as a single collection

  // Available AI Models - 모든 최신 모델 포함
  private aiModels = {
    openai: {
      'gpt-4.1-mini': { name: 'gpt-4.1-mini', displayName: 'GPT-4.1 Mini', multimodal: true, webSearch: true },
      'gpt-4.1': { name: 'gpt-4.1', displayName: 'GPT-4.1', multimodal: true, webSearch: true },
      'gpt-4.1-nano': { name: 'gpt-4.1-nano', displayName: 'GPT-4.1 Nano', multimodal: true, webSearch: true },
      'gpt-4o': { name: 'gpt-4o', displayName: 'GPT-4o Vision', multimodal: true, webSearch: true },
      'gpt-4-turbo': { name: 'gpt-4-turbo-preview', displayName: 'GPT-4 Turbo', multimodal: true, webSearch: true },
      'gpt-4': { name: 'gpt-4', displayName: 'GPT-4', multimodal: true, webSearch: true },
      'gpt-3.5-turbo': { name: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo', multimodal: false, webSearch: true },
      'gpt-image-1': { name: 'dall-e-3', displayName: 'DALL-E 3 (Image Gen)', multimodal: false, webSearch: false }
    },
    anthropic: {
      'claude-opus-4.1': { name: 'claude-opus-4-1-20250805', displayName: 'Claude Opus 4.1', multimodal: true, webSearch: true },
      'claude-opus-4': { name: 'claude-opus-4-20250514', displayName: 'Claude Opus 4', multimodal: true, webSearch: true },
      'claude-sonnet-4': { name: 'claude-sonnet-4-20250514', displayName: 'Claude Sonnet 4', multimodal: true, webSearch: true },
      'claude-sonnet-3.7': { name: 'claude-3-7-sonnet-20250219', displayName: 'Claude Sonnet 3.7', multimodal: true, webSearch: true },
      'claude-haiku-3.5': { name: 'claude-3-5-haiku-20241022', displayName: 'Claude Haiku 3.5', multimodal: true, webSearch: true },
      'claude-3-haiku': { name: 'claude-3-haiku-20240307', displayName: 'Claude 3 Haiku', multimodal: true, webSearch: true }
    }
  };

  // Create or get channel
  async createChannel(data: {
    workspace_id: string;
    name: string;
    description?: string;
    type: 'public' | 'private' | 'direct';
    members: string[];
    owner_id: string;
  }): Promise<string> {
    const channelData: any = {
      workspace_id: data.workspace_id,
      name: data.name,
      type: data.type,
      members: data.members,
      owner_id: data.owner_id,
      ai_enabled: false,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };

    // Only add description if it has a value
    if (data.description) {
      channelData.description = data.description;
    }

    // Use the correct collection path: workspaces/{workspaceId}/channels
    const channelsRef = collection(db, 'workspaces', data.workspace_id, 'channels');
    const docRef = await addDoc(channelsRef, channelData);
    return docRef.id;
  }

  // Get workspace channels
  async getWorkspaceChannels(workspaceId: string, userId: string): Promise<ChatChannel[]> {
    try {
      console.log('Getting channels for workspace:', workspaceId, 'user:', userId);
      
      // Use the correct collection path: workspaces/{workspaceId}/channels
      const channelsRef = collection(db, 'workspaces', workspaceId, 'channels');
      const q = query(channelsRef);
      
      const snapshot = await getDocs(q);
      console.log('Found', snapshot.size, 'channels in Firestore');
      
      // Filter channels where user is a member or it's a public channel
      const channels = snapshot.docs
        .map(doc => {
          const data = doc.data();
          console.log('Channel data:', doc.id, data);
          return {
            id: doc.id,
            ...data
          } as ChatChannel;
        })
        .filter(channel => {
          const isPublic = channel.type === 'public';
          const isMember = channel.members && channel.members.includes(userId);
          console.log('Channel filter:', channel.name, 'public:', isPublic, 'member:', isMember);
          return isPublic || isMember;
        });
      
      console.log('Returning', channels.length, 'filtered channels');
      return channels;
    } catch (error) {
      console.error('Error getting channels:', error);
      return [];
    }
  }

  // Send message
  async sendMessage(data: {
    channel_id: string;
    workspace_id: string;
    user_id: string;
    user_name: string;
    user_avatar?: string;
    content: string;
    type?: 'text' | 'system' | 'ai' | 'image' | 'file' | 'code';
    ai_model?: string;
    attachments?: {
      type: string;
      url: string;
      name: string;
      preview?: string;
      size?: number;
      mime_type?: string;
    }[];
  }): Promise<string> {
    const messageData: any = {
      user_id: data.user_id,
      user_name: data.user_name,
      content: data.content,
      type: data.type || 'text',
      created_at: serverTimestamp(),
      is_ai: data.type === 'ai'
    };

    // Only add optional fields if they have values
    if (data.user_avatar) {
      messageData.user_avatar = data.user_avatar;
    }
    if (data.ai_model) {
      messageData.ai_model = data.ai_model;
    }
    if (data.attachments && data.attachments.length > 0) {
      messageData.attachments = data.attachments;
    }

    // Store message in the workspace/channel/messages subcollection
    const messagesRef = collection(db, 'workspaces', data.workspace_id, 'channels', data.channel_id, 'messages');
    const docRef = await addDoc(messagesRef, messageData);
    
    // Update channel's last message
    await this.updateChannelLastMessage(data.workspace_id, data.channel_id, {
      content: data.content,
      user_name: data.user_name,
      timestamp: serverTimestamp()
    });

    return docRef.id;
  }

  // Get channel messages
  async getChannelMessages(workspaceId: string, channelId: string, limitCount: number = 50): Promise<ChatMessage[]> {
    try {
      const messagesRef = collection(db, 'workspaces', workspaceId, 'channels', channelId, 'messages');
      const q = query(
        messagesRef,
        orderBy('created_at', 'asc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  // Subscribe to channel messages (real-time)
  subscribeToChannelMessages(
    workspaceId: string,
    channelId: string,
    callback: (messages: ChatMessage[]) => void
  ): () => void {
    const messagesRef = collection(db, 'workspaces', workspaceId, 'channels', channelId, 'messages');
    const q = query(
      messagesRef,
      orderBy('created_at', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      
      callback(messages);
    });

    return unsubscribe;
  }

  // Update message
  async updateMessage(workspaceId: string, channelId: string, messageId: string, updates: Partial<ChatMessage>): Promise<void> {
    try {
      const messageRef = doc(db, 'workspaces', workspaceId, 'channels', channelId, 'messages', messageId);
      await updateDoc(messageRef, {
        ...updates,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  }

  // Add reaction to message
  async addReaction(workspaceId: string, channelId: string, messageId: string, emoji: string, userId: string): Promise<void> {
    const messageRef = doc(db, 'workspaces', workspaceId, 'channels', channelId, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }

    const messageData = messageDoc.data();
    const reactions = messageData.reactions || [];
    
    const existingReaction = reactions.find((r: any) => r.emoji === emoji);
    
    if (existingReaction) {
      if (!existingReaction.users.includes(userId)) {
        existingReaction.users.push(userId);
      }
    } else {
      reactions.push({
        emoji,
        users: [userId]
      });
    }

    await updateDoc(messageRef, {
      reactions,
      updated_at: serverTimestamp()
    });
  }

  // Enable AI in channel
  async enableAIInChannel(workspaceId: string, channelId: string, aiModels: string[]): Promise<void> {
    const channelRef = doc(db, 'workspaces', workspaceId, 'channels', channelId);
    
    await updateDoc(channelRef, {
      ai_enabled: true,
      ai_models: aiModels,
      updated_at: serverTimestamp()
    });
  }

  // Enable AI with config
  async enableAI(workspaceId: string, channelId: string, config: AIConfig): Promise<void> {
    const channelRef = doc(db, 'workspaces', workspaceId, 'channels', channelId);
    
    await updateDoc(channelRef, {
      ai_enabled: true,
      ai_config: config,
      updated_at: serverTimestamp()
    });
  }

  // Update channel last message
  private async updateChannelLastMessage(
    workspaceId: string,
    channelId: string,
    lastMessage: any
  ): Promise<void> {
    const channelRef = doc(db, 'workspaces', workspaceId, 'channels', channelId);
    
    await updateDoc(channelRef, {
      last_message: lastMessage,
      updated_at: serverTimestamp()
    });
  }

  // Get available AI models
  getAvailableAIModels() {
    return this.aiModels;
  }

  // Create direct message channel
  async createDirectMessageChannel(
    workspaceId: string,
    user1Id: string,
    user2Id: string,
    user1Name: string,
    user2Name: string
  ): Promise<string> {
    // Check if DM channel already exists
    const existingChannels = await this.getDirectMessageChannel(workspaceId, user1Id, user2Id);
    
    if (existingChannels.length > 0) {
      return existingChannels[0].id;
    }

    // Create new DM channel
    return await this.createChannel({
      workspace_id: workspaceId,
      name: `DM: ${user1Name} & ${user2Name}`,
      type: 'direct',
      members: [user1Id, user2Id],
      owner_id: user1Id
    });
  }

  // Get direct message channel between two users
  private async getDirectMessageChannel(
    workspaceId: string,
    user1Id: string,
    user2Id: string
  ): Promise<ChatChannel[]> {
    const channelsRef = collection(db, 'workspaces', workspaceId, 'channels');
    const q = query(
      channelsRef,
      where('type', '==', 'direct'),
      where('members', 'array-contains', user1Id)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as ChatChannel)
      .filter(channel => channel.members.includes(user2Id));
  }

  // Mark messages as read
  async markMessagesAsRead(workspaceId: string, channelId: string, userId: string): Promise<void> {
    const channelRef = doc(db, 'workspaces', workspaceId, 'channels', channelId);
    const channelDoc = await getDoc(channelRef);
    
    if (!channelDoc.exists()) {
      return;
    }

    const channelData = channelDoc.data();
    const unreadCount = channelData.unread_count || {};
    
    if (unreadCount[userId]) {
      unreadCount[userId] = 0;
      
      await updateDoc(channelRef, {
        unread_count: unreadCount,
        updated_at: serverTimestamp()
      });
    }
  }

  // Add member to channel
  async addMemberToChannel(workspaceId: string, channelId: string, userId: string): Promise<void> {
    const channelRef = doc(db, 'workspaces', workspaceId, 'channels', channelId);
    const channelDoc = await getDoc(channelRef);
    
    if (!channelDoc.exists()) {
      throw new Error('Channel not found');
    }

    const channelData = channelDoc.data();
    const members = channelData.members || [];
    
    if (!members.includes(userId)) {
      members.push(userId);
      
      await updateDoc(channelRef, {
        members,
        updated_at: serverTimestamp()
      });
    }
  }

  // Remove member from channel
  async removeMemberFromChannel(workspaceId: string, channelId: string, userId: string): Promise<void> {
    const channelRef = doc(db, 'workspaces', workspaceId, 'channels', channelId);
    const channelDoc = await getDoc(channelRef);
    
    if (!channelDoc.exists()) {
      throw new Error('Channel not found');
    }

    const channelData = channelDoc.data();
    const members = channelData.members || [];
    const updatedMembers = members.filter((id: string) => id !== userId);
    
    await updateDoc(channelRef, {
      members: updatedMembers,
      updated_at: serverTimestamp()
    });
  }

  // Get channel by ID
  async getChannel(workspaceId: string, channelId: string): Promise<ChatChannel | null> {
    try {
      const channelRef = doc(db, 'workspaces', workspaceId, 'channels', channelId);
      const channelDoc = await getDoc(channelRef);
      
      if (!channelDoc.exists()) {
        return null;
      }
      
      return {
        id: channelDoc.id,
        ...channelDoc.data()
      } as ChatChannel;
    } catch (error) {
      console.error('Error getting channel:', error);
      return null;
    }
  }
}

const chatService = new ChatService();
export default chatService;