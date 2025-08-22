import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  FirebaseCollection, 
  SubCollection,
  PresenceSystem,
  COLLECTIONS,
  queryHelpers,
  where,
  orderBy,
  limit
} from '../shared/firebase-utils';
import { useAuth } from '../contexts/AuthContext';

// Generic hook for real-time data
export function useFirebaseDocument<T>(
  collection: string, 
  documentId: string | null
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!documentId) {
      setData(null);
      setLoading(false);
      return;
    }

    const firebaseCollection = new FirebaseCollection(collection);
    
    const unsubscribe = firebaseCollection.subscribe(
      documentId,
      (doc: any) => {
        setData(doc as T);
        setLoading(false);
        setError(null);
      },
      (err: any) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collection, documentId]);

  return { data, loading, error };
}

// Hook for real-time collection/query
export function useFirebaseQuery<T>(
  collection: string,
  constraints: any[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const firebaseCollection = new FirebaseCollection(collection);
    
    const unsubscribe = firebaseCollection.subscribeToQuery(
      constraints,
      (docs: any) => {
        setData(docs as T[]);
        setLoading(false);
        setError(null);
      },
      (err: any) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collection, JSON.stringify(constraints)]);

  return { data, loading, error };
}

// Hook for user's tasks with real-time updates
export function useUserTasks(filters?: {
  status?: string;
  priority?: string;
  limit?: number;
}) {
  const { user } = useAuth();
  
  const constraints = [
    where('assigneeId', '==', user?.firebase_uid || ''),
    ...(filters?.status ? [where('status', '==', filters.status)] : []),
    ...(filters?.priority ? [where('priority', '==', filters.priority)] : []),
    orderBy('createdAt', 'desc'),
    ...(filters?.limit ? [limit(filters.limit)] : [])
  ];

  return useFirebaseQuery(COLLECTIONS.TASKS, constraints);
}

// Hook for meeting with presence
export function useMeetingWithPresence(meetingId: string | null) {
  const { user } = useAuth();
  const [meeting, setMeeting] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const presenceSystemRef = useRef<PresenceSystem | null>(null);

  useEffect(() => {
    if (!meetingId || !user) {
      setLoading(false);
      return;
    }

    const unsubscribers: (() => void)[] = [];

    // Subscribe to meeting document
    const meetingCollection = new FirebaseCollection(COLLECTIONS.MEETINGS);
    unsubscribers.push(
      meetingCollection.subscribe(meetingId, (doc: any) => {
        setMeeting(doc);
        setLoading(false);
      })
    );

    // Subscribe to meeting notes
    const notesCollection = new SubCollection(
      COLLECTIONS.MEETINGS,
      meetingId,
      COLLECTIONS.MEETING_NOTES
    );
    unsubscribers.push(
      notesCollection.subscribe((notesDocs: any) => {
        setNotes(notesDocs);
      })
    );

    // Set up presence system
    presenceSystemRef.current = new PresenceSystem(
      `${COLLECTIONS.MEETINGS}/${meetingId}`
    );
    
    // Set user presence
    presenceSystemRef.current.setPresence(user.firebase_uid, {
      name: user.name || user.email,
      email: user.email,
      status: 'active'
    });

    // Subscribe to presence updates
    unsubscribers.push(
      presenceSystemRef.current.subscribeToPresence((users: any) => {
        setActiveUsers(users);
      })
    );

    // Cleanup function
    return () => {
      unsubscribers.forEach(unsub => unsub());
      if (presenceSystemRef.current && user) {
        presenceSystemRef.current.removePresence(user.firebase_uid);
      }
    };
  }, [meetingId, user]);

  // Update user status
  const updateUserStatus = useCallback((status: string) => {
    if (presenceSystemRef.current && user) {
      presenceSystemRef.current.setPresence(user.firebase_uid, {
        name: user.name || user.email,
        email: user.email,
        status
      });
    }
  }, [user]);

  return { 
    meeting, 
    notes, 
    activeUsers, 
    loading,
    updateUserStatus
  };
}

// Hook for collaborative editing
export function useCollaborativeDocument(
  collection: string,
  documentId: string | null
) {
  const { user } = useAuth();
  const [document, setDocument] = useState<any>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const editingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data, loading, error } = useFirebaseDocument(collection, documentId);

  useEffect(() => {
    setDocument(data);
  }, [data]);

  // Handle editing state
  const startEditing = useCallback(() => {
    if (!documentId || !user) return;

    setIsEditing(true);
    
    // Clear any existing timeout
    if (editingTimeoutRef.current) {
      clearTimeout(editingTimeoutRef.current);
    }

    // Set editing state in document
    const firebaseCollection = new FirebaseCollection(collection);
    firebaseCollection.update(documentId, {
      [`editing.${user.firebase_uid}`]: {
        userId: user.firebase_uid,
        name: user.name || user.email,
        timestamp: new Date().toISOString()
      }
    });

    // Auto-stop editing after 30 seconds of inactivity
    editingTimeoutRef.current = setTimeout(() => {
      stopEditing();
    }, 30000);
  }, [collection, documentId, user]);

  const stopEditing = useCallback(() => {
    if (!documentId || !user) return;

    setIsEditing(false);
    
    if (editingTimeoutRef.current) {
      clearTimeout(editingTimeoutRef.current);
    }

    // Remove editing state
    const firebaseCollection = new FirebaseCollection(collection);
    firebaseCollection.update(documentId, {
      [`editing.${user.firebase_uid}`]: null
    });
  }, [collection, documentId, user]);

  // Update document with conflict resolution
  const updateDocument = useCallback(async (updates: any) => {
    if (!documentId) return;

    startEditing();

    const firebaseCollection = new FirebaseCollection(collection);
    await firebaseCollection.update(documentId, {
      ...updates,
      lastEditedBy: user?.firebase_uid,
      lastEditedAt: new Date().toISOString()
    });
  }, [collection, documentId, user, startEditing]);

  // Extract current collaborators
  useEffect(() => {
    if (document?.editing) {
      const activeCollaborators = Object.values(document.editing)
        .filter((editor: any) => editor.userId !== user?.firebase_uid);
      setCollaborators(activeCollaborators);
    } else {
      setCollaborators([]);
    }
  }, [document, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (editingTimeoutRef.current) {
        clearTimeout(editingTimeoutRef.current);
      }
      stopEditing();
    };
  }, [stopEditing]);

  return {
    document,
    loading,
    error,
    collaborators,
    isEditing,
    updateDocument,
    startEditing,
    stopEditing
  };
}

// Hook for real-time notifications
export function useNotifications() {
  const { user } = useAuth();
  
  const constraints = [
    where('userId', '==', user?.firebase_uid || ''),
    where('read', '==', false),
    orderBy('createdAt', 'desc'),
    limit(50)
  ];

  const { data: notifications, loading } = useFirebaseQuery(
    COLLECTIONS.NOTIFICATIONS,
    constraints
  );

  const markAsRead = useCallback(async (notificationId: string) => {
    const notificationCollection = new FirebaseCollection(COLLECTIONS.NOTIFICATIONS);
    await notificationCollection.update(notificationId, { read: true });
  }, []);

  const markAllAsRead = useCallback(async () => {
    const batch = notifications.map((notification: any) => 
      markAsRead(notification.id)
    );
    await Promise.all(batch);
  }, [notifications, markAsRead]);

  return {
    notifications,
    loading,
    unreadCount: notifications.length,
    markAsRead,
    markAllAsRead
  };
}

// Hook for real-time analytics
export function useRealtimeAnalytics(
  entityType: 'tasks' | 'meetings' | 'objectives',
  timeRange: { start: Date; end: Date }
) {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    const collection = new FirebaseCollection(COLLECTIONS[entityType.toUpperCase() as keyof typeof COLLECTIONS]);
    
    const constraints = [
      where('userId', '==', user.firebase_uid),
      ...queryHelpers.byDateRange('createdAt', timeRange.start, timeRange.end)
    ];

    const unsubscribe = collection.subscribeToQuery(
      constraints,
      (docs: any) => {
        // Calculate real-time statistics
        const newStats = {
          total: docs.length,
          byStatus: {},
          byPriority: {},
          completionRate: 0,
          averageCompletionTime: 0
        };

        let completedCount = 0;
        let totalCompletionTime = 0;

        docs.forEach((doc: any) => {
          // Count by status
          if (doc.status) {
            (newStats.byStatus as any)[doc.status] = ((newStats.byStatus as any)[doc.status] || 0) + 1;
            if (doc.status === 'completed') {
              completedCount++;
              if (doc.createdAt && doc.completedAt) {
                totalCompletionTime += doc.completedAt.toDate() - doc.createdAt.toDate();
              }
            }
          }

          // Count by priority
          if (doc.priority) {
            (newStats.byPriority as any)[doc.priority] = ((newStats.byPriority as any)[doc.priority] || 0) + 1;
          }
        });

        newStats.completionRate = docs.length > 0 ? (completedCount / docs.length) * 100 : 0;
        newStats.averageCompletionTime = completedCount > 0 ? totalCompletionTime / completedCount : 0;

        setStats(newStats);
      }
    );

    return () => unsubscribe();
  }, [entityType, timeRange, user]);

  return stats;
}