import { 
  FirebaseCollection, 
  SubCollection,
  PresenceSystem,
  COLLECTIONS, 
  queryHelpers,
  where,
  orderBy,
  logActivity,
  db,
  serverTimestamp
} from '../firebase-utils';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

class MeetingService {
  constructor() {
    this.meetings = new FirebaseCollection(COLLECTIONS.MEETINGS);
  }

  // Create a new meeting
  async createMeeting(meetingData, userId) {
    const meeting = await this.meetings.create({
      ...meetingData,
      createdBy: userId,
      status: 'scheduled',
      participants: meetingData.participants || [userId],
      agenda: meetingData.agenda || [],
      actionItems: []
    });

    await logActivity({
      type: 'meeting_created',
      userId,
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      description: `Created meeting: ${meeting.title}`
    });

    return meeting;
  }

  // Get meeting with all details
  async getMeetingWithDetails(meetingId) {
    const meeting = await this.meetings.getById(meetingId);
    if (!meeting) return null;

    // Get notes subcollection
    const notes = new SubCollection(COLLECTIONS.MEETINGS, meetingId, COLLECTIONS.MEETING_NOTES);
    meeting.notes = await notes.getAll();

    return meeting;
  }

  // Start meeting
  async startMeeting(meetingId, userId) {
    await this.meetings.update(meetingId, {
      status: 'in_progress',
      startedAt: serverTimestamp(),
      startedBy: userId
    });

    await logActivity({
      type: 'meeting_started',
      userId,
      meetingId,
      description: 'Started the meeting'
    });
  }

  // End meeting
  async endMeeting(meetingId, userId, summary) {
    await this.meetings.update(meetingId, {
      status: 'completed',
      endedAt: serverTimestamp(),
      endedBy: userId,
      summary
    });

    await logActivity({
      type: 'meeting_ended',
      userId,
      meetingId,
      description: 'Ended the meeting'
    });
  }

  // Add participant to meeting
  async addParticipant(meetingId, participantId) {
    const meetingRef = doc(db, COLLECTIONS.MEETINGS, meetingId);
    await updateDoc(meetingRef, {
      participants: arrayUnion(participantId),
      updatedAt: serverTimestamp()
    });
  }

  // Remove participant from meeting
  async removeParticipant(meetingId, participantId) {
    const meetingRef = doc(db, COLLECTIONS.MEETINGS, meetingId);
    await updateDoc(meetingRef, {
      participants: arrayRemove(participantId),
      updatedAt: serverTimestamp()
    });
  }

  // Add meeting note
  async addNote(meetingId, noteData, userId) {
    const notes = new SubCollection(COLLECTIONS.MEETINGS, meetingId, COLLECTIONS.MEETING_NOTES);
    const note = await notes.create({
      ...noteData,
      createdBy: userId,
      content: noteData.content || '',
      isActionItem: noteData.isActionItem || false
    });

    await logActivity({
      type: 'note_added',
      userId,
      meetingId,
      noteId: note.id,
      description: 'Added a meeting note'
    });

    return note;
  }

  // Update meeting note (for collaborative editing)
  async updateNote(meetingId, noteId, updates, userId) {
    const noteRef = doc(db, COLLECTIONS.MEETINGS, meetingId, COLLECTIONS.MEETING_NOTES, noteId);
    await updateDoc(noteRef, {
      ...updates,
      lastEditedBy: userId,
      updatedAt: serverTimestamp()
    });
  }

  // Add action item
  async addActionItem(meetingId, actionItem, userId) {
    const meetingRef = doc(db, COLLECTIONS.MEETINGS, meetingId);
    const item = {
      id: Date.now().toString(),
      ...actionItem,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    await updateDoc(meetingRef, {
      actionItems: arrayUnion(item),
      updatedAt: serverTimestamp()
    });

    await logActivity({
      type: 'action_item_added',
      userId,
      meetingId,
      description: `Added action item: ${item.title}`
    });

    return item;
  }

  // Get user's meetings
  async getUserMeetings(userId, filters = {}) {
    const constraints = [
      where('participants', 'array-contains', userId)
    ];

    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }

    if (filters.startDate && filters.endDate) {
      constraints.push(...queryHelpers.byDateRange('scheduledAt', filters.startDate, filters.endDate));
    }

    constraints.push(orderBy('scheduledAt', 'desc'));

    return this.meetings.query(constraints);
  }

  // Real-time presence for meeting
  setupMeetingPresence(meetingId) {
    return new PresenceSystem(`${COLLECTIONS.MEETINGS}/${meetingId}`);
  }

  // Subscribe to meeting updates
  subscribeToMeeting(meetingId, callback) {
    return this.meetings.subscribe(meetingId, callback);
  }

  // Subscribe to meeting notes
  subscribeToNotes(meetingId, callback) {
    const notes = new SubCollection(COLLECTIONS.MEETINGS, meetingId, COLLECTIONS.MEETING_NOTES);
    return notes.subscribe(callback);
  }

  // Subscribe to user's meetings
  subscribeToUserMeetings(userId, callback) {
    const constraints = [
      where('participants', 'array-contains', userId),
      orderBy('scheduledAt', 'desc')
    ];
    return this.meetings.subscribeToQuery(constraints, callback);
  }

  // Get meeting statistics
  async getMeetingStats(userId, dateRange) {
    const meetings = await this.getUserMeetings(userId, dateRange);
    
    const stats = {
      total: meetings.length,
      byStatus: {
        scheduled: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0
      },
      totalDuration: 0,
      averageDuration: 0,
      actionItemsCreated: 0
    };

    meetings.forEach(meeting => {
      stats.byStatus[meeting.status]++;
      
      if (meeting.startedAt && meeting.endedAt) {
        const duration = meeting.endedAt.toDate() - meeting.startedAt.toDate();
        stats.totalDuration += duration;
      }
      
      stats.actionItemsCreated += (meeting.actionItems || []).length;
    });

    if (stats.byStatus.completed > 0) {
      stats.averageDuration = stats.totalDuration / stats.byStatus.completed;
    }

    return stats;
  }

  // Convert action items to tasks
  async convertActionItemsToTasks(meetingId, actionItemIds, userId) {
    const meeting = await this.meetings.getById(meetingId);
    if (!meeting) throw new Error('Meeting not found');

    const tasksCreated = [];
    const actionItems = meeting.actionItems || [];

    for (const itemId of actionItemIds) {
      const actionItem = actionItems.find(item => item.id === itemId);
      if (actionItem) {
        // This would integrate with taskService
        const taskData = {
          title: actionItem.title,
          description: `From meeting: ${meeting.title}\n\n${actionItem.description || ''}`,
          assigneeId: actionItem.assigneeId,
          dueDate: actionItem.dueDate,
          priority: 'medium',
          meetingId: meetingId,
          actionItemId: itemId
        };
        
        // In real implementation, this would call taskService.createTask
        tasksCreated.push(taskData);
      }
    }

    await logActivity({
      type: 'action_items_converted',
      userId,
      meetingId,
      count: tasksCreated.length,
      description: `Converted ${tasksCreated.length} action items to tasks`
    });

    return tasksCreated;
  }
}

// Export singleton instance
export default new MeetingService();