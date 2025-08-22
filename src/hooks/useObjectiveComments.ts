import { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import commentsApi, { Comment } from '../services/commentsApi';

interface UseObjectiveCommentsProps {
  objectiveId: number;
  socket: Socket | null;
}

interface TypingUser {
  userId: number;
  userName: string;
}

const useObjectiveComments = ({ objectiveId, socket }: UseObjectiveCommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load comments
  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await commentsApi.getObjectiveComments(objectiveId, {
        includeReplies: true
      });
      setComments(response.comments);
      setCommentCount(response.totalCount);
    } catch (err) {
      console.error('Error loading comments:', err);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [objectiveId]);

  // Load comment count
  const loadCommentCount = useCallback(async () => {
    try {
      const count = await commentsApi.getCommentCount(objectiveId);
      setCommentCount(count);
    } catch (err) {
      console.error('Error loading comment count:', err);
    }
  }, [objectiveId]);

  // Add comment to list
  const addComment = useCallback((comment: Comment) => {
    if (comment.parent_comment_id) {
      // Add as reply
      setComments(prevComments => 
        addReplyToComments(prevComments, comment.parent_comment_id!, comment)
      );
    } else {
      // Add as new top-level comment
      setComments(prev => [...prev, comment]);
    }
    setCommentCount(prev => prev + 1);
  }, []);

  // Update comment in list
  const updateComment = useCallback((updatedComment: Comment) => {
    setComments(prevComments => 
      updateCommentInList(prevComments, updatedComment.id, updatedComment)
    );
  }, []);

  // Remove comment from list
  const removeComment = useCallback((commentId: number) => {
    setComments(prevComments => 
      removeCommentFromList(prevComments, commentId)
    );
    setCommentCount(prev => prev - 1);
  }, []);

  // Helper functions for managing comment hierarchy
  const addReplyToComments = (comments: Comment[], parentId: number, reply: Comment): Comment[] => {
    return comments.map(comment => {
      if (comment.id === parentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), reply]
        };
      }
      if (comment.replies) {
        return {
          ...comment,
          replies: addReplyToComments(comment.replies, parentId, reply)
        };
      }
      return comment;
    });
  };

  const updateCommentInList = (comments: Comment[], commentId: number, updatedComment: Comment): Comment[] => {
    return comments.map(comment => {
      if (comment.id === commentId) {
        return updatedComment;
      }
      if (comment.replies) {
        return {
          ...comment,
          replies: updateCommentInList(comment.replies, commentId, updatedComment)
        };
      }
      return comment;
    });
  };

  const removeCommentFromList = (comments: Comment[], commentId: number): Comment[] => {
    return comments.filter(comment => {
      if (comment.id === commentId) {
        return false;
      }
      if (comment.replies) {
        comment.replies = removeCommentFromList(comment.replies, commentId);
      }
      return true;
    });
  };

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    // Join objective room
    socket.emit('objective:join', objectiveId);

    // Listen for comment events
    const handleCommentCreated = (comment: Comment) => {
      if (comment.objective_id === objectiveId) {
        addComment(comment);
      }
    };

    const handleCommentUpdated = (comment: Comment) => {
      if (comment.objective_id === objectiveId) {
        updateComment(comment);
      }
    };

    const handleCommentDeleted = ({ commentId }: { commentId: number }) => {
      removeComment(commentId);
    };

    const handleTyping = ({ userId, userName }: { userId: number; userName: string }) => {
      setTypingUsers(prev => {
        if (prev.find(user => user.userId === userId)) return prev;
        return [...prev, { userId, userName }];
      });
    };

    const handleStopTyping = ({ userId }: { userId: number }) => {
      setTypingUsers(prev => prev.filter(user => user.userId !== userId));
    };

    socket.on('comment:created', handleCommentCreated);
    socket.on('comment:updated', handleCommentUpdated);
    socket.on('comment:deleted', handleCommentDeleted);
    socket.on('comment:typing', handleTyping);
    socket.on('comment:stopTyping', handleStopTyping);

    // Cleanup
    return () => {
      socket.emit('objective:leave', objectiveId);
      socket.off('comment:created', handleCommentCreated);
      socket.off('comment:updated', handleCommentUpdated);
      socket.off('comment:deleted', handleCommentDeleted);
      socket.off('comment:typing', handleTyping);
      socket.off('comment:stopTyping', handleStopTyping);
    };
  }, [socket, objectiveId, addComment, updateComment, removeComment]);

  // Typing indicator functions
  const sendTyping = useCallback(() => {
    if (socket) {
      socket.emit('comment:typing', { objectiveId });
    }
  }, [socket, objectiveId]);

  const sendStopTyping = useCallback(() => {
    if (socket) {
      socket.emit('comment:stopTyping', { objectiveId });
    }
  }, [socket, objectiveId]);

  return {
    comments,
    loading,
    commentCount,
    typingUsers,
    error,
    loadComments,
    loadCommentCount,
    addComment,
    updateComment,
    removeComment,
    sendTyping,
    sendStopTyping
  };
};

export default useObjectiveComments;