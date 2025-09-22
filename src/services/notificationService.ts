import { db } from '../config/firebase';
import { doc, setDoc, getDoc, getDocs, updateDoc, onSnapshot, collection, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';

export interface NotificationSettings {
  enabled: boolean;
  chat_messages: boolean;
  direct_messages: boolean;
  goal_updates: boolean;
  meeting_reminders: boolean;
  meeting_5min_reminder: boolean;
  meeting_15min_reminder: boolean;
  task_assignments: boolean;
  mentions: boolean;
  sound_enabled: boolean;
}

export interface NotificationLog {
  id?: string;
  user_id: string;
  workspace_id: string;
  type: 'chat' | 'dm' | 'goal' | 'meeting' | 'task' | 'mention';
  title: string;
  message: string;
  timestamp: Timestamp;
  read: boolean;
  action_url?: string;
}

class NotificationService {
  private permission: NotificationPermission = 'default';
  private activeSubscriptions: Map<string, () => void> = new Map();
  private notificationSound: HTMLAudioElement;
  private settings: NotificationSettings | null = null;
  private userId: string | null = null;

  constructor() {
    // Initialize notification sound with a simple beep sound (data URL)
    // This is a simple sine wave beep sound
    this.notificationSound = new Audio('data:audio/wav;base64,UklGRiQBAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQABAADw/wAA8P8AAPz/AAD8/wAA/P8AAAD/AAAA/wAABP8AAAT/AAAE/wAACP8AAAj/AAAI/wAACP8AAAz/AAAM/wAADP8AABD/AAAQ/wAAEP8AABD/AAAU/wAAFP8AABT/AAAY/wAAGP8AABj/AAAY/wAAHP8AABz/AAAc/wAAIP8AACD/AAAg/wAAIP8AACD/AAAk/wAAJP8AACT/AAAk/wAAJP8AACj/AAAo/wAAKP8AACz/AAAs/wAALP8AADAgADA/wAAMP8AADD/AAAw/wAALP8AACz/AAAs/wAAKP8AACj/AAAo/wAAJP8AACT/AAAk/wAAJP8AACD/AAAg/wAAIP8AABz/AAAc/wAAHP8AABz/AAAY/wAAGP8AABj/AAAU/wAAFP8AABT/AAAU/wAAEP8AABD/AAAQ/wAADP8AAAz/AAAM/wAADP8AAAj/AAAI/wAACP8AAAT/AAAE/wAABP8AAAD/AAAA/wAA/P8AAPz/AAD8/wAA8P8AAPD/AAA=');
    this.notificationSound.volume = 0.5;
    
    // Check current permission status
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  // Request notification permission
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    }

    return false;
  }

  // Get user's notification settings
  async getUserSettings(userId: string): Promise<NotificationSettings> {
    try {
      const settingsDoc = await getDoc(doc(db, 'user_notification_settings', userId));
      
      if (settingsDoc.exists()) {
        this.settings = settingsDoc.data() as NotificationSettings;
        return this.settings;
      }

      // Default settings if none exist
      const defaultSettings: NotificationSettings = {
        enabled: true,
        chat_messages: true,
        direct_messages: true,
        goal_updates: true,
        meeting_reminders: true,
        meeting_5min_reminder: true,
        meeting_15min_reminder: false,
        task_assignments: true,
        mentions: true,
        sound_enabled: true
      };

      // Save default settings
      await this.saveUserSettings(userId, defaultSettings);
      this.settings = defaultSettings;
      return defaultSettings;
    } catch (error) {
      console.error('Error getting notification settings:', error);
      throw error;
    }
  }

  // Save user's notification settings
  async saveUserSettings(userId: string, settings: NotificationSettings): Promise<void> {
    try {
      await setDoc(doc(db, 'user_notification_settings', userId), settings);
      this.settings = settings;
    } catch (error) {
      console.error('Error saving notification settings:', error);
      throw error;
    }
  }

  // Update specific notification setting
  async updateSetting(userId: string, setting: keyof NotificationSettings, value: boolean): Promise<void> {
    try {
      await updateDoc(doc(db, 'user_notification_settings', userId), {
        [setting]: value
      });
      
      if (this.settings) {
        this.settings[setting] = value;
      }
    } catch (error) {
      console.error('Error updating notification setting:', error);
      throw error;
    }
  }

  // Initialize notification service for a user
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    
    // Get user settings
    await this.getUserSettings(userId);
    
    // Request permission if enabled
    if (this.settings?.enabled) {
      await this.requestPermission();
    }
  }

  // Show browser notification
  private async showNotification(title: string, options: NotificationOptions & { type?: string }): Promise<void> {
    if (!this.settings?.enabled || this.permission !== 'granted') {
      return;
    }

    // Check if this type of notification is enabled
    const typeEnabled = this.checkNotificationType(options.type || 'chat');
    if (!typeEnabled) {
      return;
    }

    // Play sound if enabled
    if (this.settings.sound_enabled) {
      this.notificationSound.play().catch(e => console.log('Could not play notification sound:', e));
    }

    // Create and show notification
    const notification = new Notification(title, {
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      ...options
    });

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      if (options.data?.url) {
        window.location.href = options.data.url;
      }
      notification.close();
    };

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  }

  // Check if a specific notification type is enabled
  private checkNotificationType(type: string): boolean {
    if (!this.settings) return false;

    switch (type) {
      case 'chat':
        return this.settings.chat_messages;
      case 'dm':
        return this.settings.direct_messages;
      case 'goal':
        return this.settings.goal_updates;
      case 'meeting':
        return this.settings.meeting_reminders;
      case 'task':
        return this.settings.task_assignments;
      case 'mention':
        return this.settings.mentions;
      default:
        return true;
    }
  }

  // Subscribe to chat messages
  subscribeToChatMessages(workspaceId: string, channelId: string, userId: string): void {
    const key = `chat_${channelId}`;
    
    // Unsubscribe if already subscribed
    if (this.activeSubscriptions.has(key)) {
      this.activeSubscriptions.get(key)?.();
    }

    const q = query(
      collection(db, 'workspaces', workspaceId, 'channels', channelId, 'messages'),
      orderBy('created_at', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const message = change.doc.data();
          
          // Don't notify for own messages
          if (message.user_id === userId) return;
          
          // Check if it's a mention
          const isMention = message.content?.includes(`@${userId}`) || 
                           message.mentions?.includes(userId);

          this.showNotification(
            isMention ? `${message.user_name} mentioned you` : `New message from ${message.user_name}`,
            {
              body: message.content,
              tag: `chat_${channelId}`,
              type: isMention ? 'mention' : 'chat',
              data: {
                url: `/workspaces/${workspaceId}/chat`
              }
            }
          );
        }
      });
    });

    this.activeSubscriptions.set(key, unsubscribe);
  }

  // Subscribe to direct messages
  subscribeToDirectMessages(workspaceId: string, userId: string): void {
    const key = `dm_${userId}`;
    
    if (this.activeSubscriptions.has(key)) {
      this.activeSubscriptions.get(key)?.();
    }

    const q = query(
      collection(db, 'workspaces', workspaceId, 'direct_messages'),
      where('recipient_id', '==', userId),
      where('read', '==', false),
      orderBy('created_at', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const dm = change.doc.data();
          
          this.showNotification(
            `Direct message from ${dm.sender_name}`,
            {
              body: dm.content,
              tag: `dm_${dm.sender_id}`,
              type: 'dm',
              data: {
                url: `/workspaces/${workspaceId}/chat`
              }
            }
          );
        }
      });
    });

    this.activeSubscriptions.set(key, unsubscribe);
  }

  // Subscribe to goal updates
  subscribeToGoalUpdates(workspaceId: string): void {
    const key = `goals_${workspaceId}`;
    
    if (this.activeSubscriptions.has(key)) {
      this.activeSubscriptions.get(key)?.();
    }

    const q = query(
      collection(db, 'workspaces', workspaceId, 'goals'),
      orderBy('updated_at', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const goal = change.doc.data();
          
          // Check if progress significantly changed
          const oldProgress = change.doc.data().progress || 0;
          if (Math.abs(goal.progress - oldProgress) >= 10) {
            this.showNotification(
              'Goal Progress Update',
              {
                body: `${goal.name} is now ${goal.progress}% complete`,
                tag: `goal_${goal.id}`,
                type: 'goal',
                data: {
                  url: `/workspaces/${workspaceId}/goals`
                }
              }
            );
          }
        }
      });
    });

    this.activeSubscriptions.set(key, unsubscribe);
  }

  // Subscribe to meeting reminders
  subscribeToMeetingReminders(workspaceId: string, userId: string): void {
    const key = `meetings_${workspaceId}`;
    
    if (this.activeSubscriptions.has(key)) {
      this.activeSubscriptions.get(key)?.();
    }

    // Check for upcoming meetings every minute
    const checkMeetings = setInterval(async () => {
      if (!this.settings?.meeting_reminders) return;

      const now = new Date();
      const in5Minutes = new Date(now.getTime() + 5 * 60000);
      const in15Minutes = new Date(now.getTime() + 15 * 60000);

      try {
        const q = query(
          collection(db, 'workspaces', workspaceId, 'meetings'),
          where('status', '==', 'scheduled'),
          orderBy('start_time', 'asc')
        );

        const snapshot = await getDocs(q);
      
      snapshot.docs.forEach((doc) => {
        const meeting = doc.data() as any;
        
        // Check if user is an attendee
        const isAttendee = meeting.attendees?.some((attendee: any) => 
          attendee.user_id === userId || attendee.id === userId
        );
        
        if (!isAttendee) return;
        
        const startTime = meeting.start_time.toDate();
        
        // 15 minute reminder
        if (this.settings?.meeting_15min_reminder && 
            startTime > in15Minutes && 
            startTime <= new Date(in15Minutes.getTime() + 60000)) {
          this.showNotification(
            'Meeting in 15 minutes',
            {
              body: meeting.title,
              tag: `meeting_15_${meeting.id}`,
              type: 'meeting',
              data: {
                url: `/workspaces/${workspaceId}/meetings`
              }
            }
          );
        }
        
        // 5 minute reminder
        if (this.settings?.meeting_5min_reminder && 
            startTime > in5Minutes && 
            startTime <= new Date(in5Minutes.getTime() + 60000)) {
          this.showNotification(
            'Meeting starting soon!',
            {
              body: `${meeting.title} starts in 5 minutes`,
              tag: `meeting_5_${meeting.id}`,
              type: 'meeting',
              requireInteraction: true,
              data: {
                url: `/workspaces/${workspaceId}/meetings`
              }
            }
          );
        }
      });
      } catch (error) {
        console.error('Error checking meeting reminders:', error);
      }
    }, 60000); // Check every minute

    this.activeSubscriptions.set(key, () => clearInterval(checkMeetings));
  }

  // Unsubscribe from all notifications
  unsubscribeAll(): void {
    this.activeSubscriptions.forEach((unsubscribe) => unsubscribe());
    this.activeSubscriptions.clear();
  }

  // Log notification for history
  async logNotification(notification: Omit<NotificationLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      await setDoc(doc(collection(db, 'notification_logs')), {
        ...notification,
        timestamp: Timestamp.now()
      });
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  }

  // Get notification history
  async getNotificationHistory(userId: string, maxResults: number = 50): Promise<NotificationLog[]> {
    try {
      const q = query(
        collection(db, 'notification_logs'),
        where('user_id', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(maxResults)
      );

      const snapshot = await getDocs(q as any);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      } as NotificationLog));
    } catch (error) {
      console.error('Error getting notification history:', error);
      return [];
    }
  }
}

export default new NotificationService();