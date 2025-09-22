import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Meeting {
  id?: string;
  workspace_id: string;
  title: string;
  description?: string;
  start_time: Timestamp;
  end_time: Timestamp;
  location?: string;
  meeting_link?: string;
  organizer_id: string;
  organizer_name: string;
  attendees: MeetingAttendee[];
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  recurring?: {
    type: 'daily' | 'weekly' | 'monthly';
    frequency: number;
    end_date?: Timestamp;
  };
  channel_id?: string; // 연동된 팀 채팅 채널
  created_at?: Timestamp;
  updated_at?: Timestamp;
}

export interface MeetingAttendee {
  user_id: string;
  name: string;
  email?: string;
  status: 'pending' | 'accepted' | 'declined' | 'tentative';
  role?: 'required' | 'optional';
}

export interface MeetingNote {
  id?: string;
  meeting_id: string;
  content: string;
  author_id: string;
  author_name: string;
  created_at?: Timestamp;
  updated_at?: Timestamp;
  is_ai_generated?: boolean;
}

export interface ActionItem {
  id?: string;
  meeting_id: string;
  workspace_id: string;
  title: string;
  description?: string;
  assignee_id: string;
  assignee_name: string;
  due_date?: Timestamp;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  created_at?: Timestamp;
  updated_at?: Timestamp;
  completed_at?: Timestamp;
}

class MeetingService {
  // Meeting CRUD operations
  async createMeeting(meeting: Omit<Meeting, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'meetings'), {
        ...meeting,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw error;
    }
  }

  async getMeeting(meetingId: string): Promise<Meeting | null> {
    try {
      const docRef = doc(db, 'meetings', meetingId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Meeting;
      }
      return null;
    } catch (error) {
      console.error('Error getting meeting:', error);
      throw error;
    }
  }

  async updateMeeting(meetingId: string, updates: Partial<Meeting>): Promise<void> {
    try {
      const docRef = doc(db, 'meetings', meetingId);
      await updateDoc(docRef, {
        ...updates,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating meeting:', error);
      throw error;
    }
  }

  async deleteMeeting(meetingId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'meetings', meetingId));
      // Also delete related notes and action items
      await this.deleteMeetingNotes(meetingId);
      await this.deleteMeetingActionItems(meetingId);
    } catch (error) {
      console.error('Error deleting meeting:', error);
      throw error;
    }
  }

  // Get meetings for a workspace
  async getWorkspaceMeetings(
    workspaceId: string, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<Meeting[]> {
    try {
      let q = query(
        collection(db, 'meetings'),
        where('workspace_id', '==', workspaceId),
        orderBy('start_time', 'asc')
      );

      if (startDate) {
        q = query(q, where('start_time', '>=', Timestamp.fromDate(startDate)));
      }
      if (endDate) {
        q = query(q, where('start_time', '<=', Timestamp.fromDate(endDate)));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Meeting));
    } catch (error) {
      console.error('Error getting workspace meetings:', error);
      throw error;
    }
  }

  // Get today's meetings
  async getTodayMeetings(workspaceId: string): Promise<Meeting[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getWorkspaceMeetings(workspaceId, today, tomorrow);
  }

  // Get upcoming meetings
  async getUpcomingMeetings(workspaceId: string, limit: number = 10): Promise<Meeting[]> {
    try {
      const now = Timestamp.now();
      const q = query(
        collection(db, 'meetings'),
        where('workspace_id', '==', workspaceId),
        where('start_time', '>', now),
        where('status', 'in', ['scheduled', 'ongoing']),
        orderBy('start_time', 'asc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs
        .slice(0, limit)
        .map(doc => ({ id: doc.id, ...doc.data() } as Meeting));
    } catch (error) {
      console.error('Error getting upcoming meetings:', error);
      throw error;
    }
  }

  // Get user's meetings
  async getUserMeetings(userId: string, workspaceId: string): Promise<Meeting[]> {
    try {
      const q = query(
        collection(db, 'meetings'),
        where('workspace_id', '==', workspaceId),
        orderBy('start_time', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Meeting))
        .filter(meeting => 
          meeting.organizer_id === userId || 
          meeting.attendees.some(a => a.user_id === userId)
        );
    } catch (error) {
      console.error('Error getting user meetings:', error);
      throw error;
    }
  }

  // Update meeting status
  async updateMeetingStatus(meetingId: string, status: Meeting['status']): Promise<void> {
    await this.updateMeeting(meetingId, { status });
  }

  // Add/Remove attendees
  async addAttendee(meetingId: string, attendee: MeetingAttendee): Promise<void> {
    try {
      const docRef = doc(db, 'meetings', meetingId);
      await updateDoc(docRef, {
        attendees: arrayUnion(attendee),
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding attendee:', error);
      throw error;
    }
  }

  async removeAttendee(meetingId: string, userId: string): Promise<void> {
    try {
      const meeting = await this.getMeeting(meetingId);
      if (!meeting) throw new Error('Meeting not found');

      const updatedAttendees = meeting.attendees.filter(a => a.user_id !== userId);
      await this.updateMeeting(meetingId, { attendees: updatedAttendees });
    } catch (error) {
      console.error('Error removing attendee:', error);
      throw error;
    }
  }

  async updateAttendeeStatus(
    meetingId: string, 
    userId: string, 
    status: MeetingAttendee['status']
  ): Promise<void> {
    try {
      const meeting = await this.getMeeting(meetingId);
      if (!meeting) throw new Error('Meeting not found');

      const updatedAttendees = meeting.attendees.map(a => 
        a.user_id === userId ? { ...a, status } : a
      );
      await this.updateMeeting(meetingId, { attendees: updatedAttendees });
    } catch (error) {
      console.error('Error updating attendee status:', error);
      throw error;
    }
  }

  // Meeting Notes operations
  async addMeetingNote(note: Omit<MeetingNote, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'meeting_notes'), {
        ...note,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding meeting note:', error);
      throw error;
    }
  }

  async getMeetingNotes(meetingId: string): Promise<MeetingNote[]> {
    try {
      const q = query(
        collection(db, 'meeting_notes'),
        where('meeting_id', '==', meetingId),
        orderBy('created_at', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as MeetingNote));
    } catch (error) {
      console.error('Error getting meeting notes:', error);
      throw error;
    }
  }

  async updateMeetingNote(noteId: string, content: string): Promise<void> {
    try {
      const docRef = doc(db, 'meeting_notes', noteId);
      await updateDoc(docRef, {
        content,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating meeting note:', error);
      throw error;
    }
  }

  async deleteMeetingNotes(meetingId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'meeting_notes'),
        where('meeting_id', '==', meetingId)
      );
      
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting meeting notes:', error);
      throw error;
    }
  }

  // Action Items operations
  async createActionItem(item: Omit<ActionItem, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'action_items'), {
        ...item,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating action item:', error);
      throw error;
    }
  }

  async getActionItems(meetingId?: string, workspaceId?: string): Promise<ActionItem[]> {
    try {
      let q = query(collection(db, 'action_items'), orderBy('created_at', 'desc'));
      
      if (meetingId) {
        q = query(q, where('meeting_id', '==', meetingId));
      }
      if (workspaceId) {
        q = query(q, where('workspace_id', '==', workspaceId));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as ActionItem));
    } catch (error) {
      console.error('Error getting action items:', error);
      throw error;
    }
  }

  async getUserActionItems(userId: string, workspaceId: string): Promise<ActionItem[]> {
    try {
      const q = query(
        collection(db, 'action_items'),
        where('assignee_id', '==', userId),
        where('workspace_id', '==', workspaceId),
        where('status', 'in', ['pending', 'in_progress']),
        orderBy('due_date', 'asc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as ActionItem));
    } catch (error) {
      console.error('Error getting user action items:', error);
      throw error;
    }
  }

  async updateActionItem(itemId: string, updates: Partial<ActionItem>): Promise<void> {
    try {
      const docRef = doc(db, 'action_items', itemId);
      const updateData: any = {
        ...updates,
        updated_at: serverTimestamp()
      };

      if (updates.status === 'completed') {
        updateData.completed_at = serverTimestamp();
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating action item:', error);
      throw error;
    }
  }

  async deleteActionItem(itemId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'action_items', itemId));
    } catch (error) {
      console.error('Error deleting action item:', error);
      throw error;
    }
  }

  async deleteMeetingActionItems(meetingId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'action_items'),
        where('meeting_id', '==', meetingId)
      );
      
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting meeting action items:', error);
      throw error;
    }
  }

  // Real-time listeners
  subscribeMeetings(
    workspaceId: string,
    callback: (meetings: Meeting[]) => void
  ): () => void {
    const q = query(
      collection(db, 'meetings'),
      where('workspace_id', '==', workspaceId),
      orderBy('start_time', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const meetings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Meeting));
      callback(meetings);
    });
  }

  subscribeMeetingNotes(
    meetingId: string,
    callback: (notes: MeetingNote[]) => void
  ): () => void {
    const q = query(
      collection(db, 'meeting_notes'),
      where('meeting_id', '==', meetingId),
      orderBy('created_at', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const notes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MeetingNote));
      callback(notes);
    });
  }

  subscribeActionItems(
    workspaceId: string,
    callback: (items: ActionItem[]) => void
  ): () => void {
    const q = query(
      collection(db, 'action_items'),
      where('workspace_id', '==', workspaceId),
      orderBy('created_at', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionItem));
      callback(items);
    });
  }

  // Check for ongoing meetings and auto-update status
  async checkAndUpdateMeetingStatuses(workspaceId: string): Promise<void> {
    try {
      const now = Timestamp.now();
      const meetings = await this.getWorkspaceMeetings(workspaceId);
      
      for (const meeting of meetings) {
        if (meeting.id) {
          // Start ongoing meetings
          if (meeting.status === 'scheduled' && 
              meeting.start_time.toMillis() <= now.toMillis() &&
              meeting.end_time.toMillis() > now.toMillis()) {
            await this.updateMeetingStatus(meeting.id, 'ongoing');
          }
          // Complete finished meetings
          else if ((meeting.status === 'scheduled' || meeting.status === 'ongoing') &&
                   meeting.end_time.toMillis() <= now.toMillis()) {
            await this.updateMeetingStatus(meeting.id, 'completed');
          }
        }
      }
    } catch (error) {
      console.error('Error checking meeting statuses:', error);
    }
  }
}

const meetingService = new MeetingService();
export default meetingService;