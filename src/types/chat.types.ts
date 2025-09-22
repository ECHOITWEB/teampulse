export interface DirectMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_email?: string;
  avatar_url?: string;
  last_message?: string;
  last_message_time?: Date;
  unread_count: number;
  is_online?: boolean;
}

export interface WorkspaceUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  is_online?: boolean;
  position?: string;
  department?: string;
  joined_at?: Date;
}

export interface SlashCommand {
  name: string;
  description: string;
  usage: string;
  category: 'general' | 'ai' | 'admin';
}

export interface FilePreview {
  url: string;
  type: string;
}

export type UserRole = 'owner' | 'admin' | 'member';
export type ChannelType = 'public' | 'private';
export type AIProvider = 'openai' | 'anthropic';