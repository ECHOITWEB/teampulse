import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  MessageCircle, 
  Send, 
  Edit2, 
  Trash2, 
  Reply, 
  MoreVertical,
  User,
  AtSign,
  Loader
} from 'lucide-react';
import commentsApi, { 
  Comment, 
  CreateCommentDto, 
  Mention,
  CommentSearchUser 
} from '../../services/commentsApi';
import useSocket from '../../hooks/useSocket';
import useObjectiveComments from '../../hooks/useObjectiveComments';

interface GoalCommentsProps {
  objectiveId: number;
  currentUserId: number;
  currentUserName: string;
  onCommentCountChange?: (count: number) => void;
}

interface MentionSuggestion extends CommentSearchUser {
  startIndex: number;
}

const GoalComments: React.FC<GoalCommentsProps> = ({
  objectiveId,
  currentUserId,
  currentUserName,
  onCommentCountChange
}) => {
  // Get token for socket connection
  const token = localStorage.getItem('authToken');
  const socket = useSocket(token);
  
  // Use real-time comments hook
  const {
    comments,
    loading,
    commentCount,
    typingUsers,
    error,
    loadComments,
    sendTyping,
    sendStopTyping
  } = useObjectiveComments({ objectiveId, socket });

  // Local state for UI
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);

  // Update comment count callback when it changes
  useEffect(() => {
    onCommentCountChange?.(commentCount);
  }, [commentCount, onCommentCountChange]);

  // Load comments when showing comments section
  useEffect(() => {
    if (showComments && comments.length === 0) {
      loadComments();
    }
  }, [showComments, loadComments, comments.length]);

  // Handle text change with mention detection and typing indicators
  const handleTextChange = useCallback(async (text: string, isEdit = false) => {
    if (isEdit) {
      setEditContent(text);
      return;
    }

    setNewComment(text);

    // Handle typing indicators
    if (text.trim() && socket) {
      sendTyping();
      
      // Clear existing timer
      if (typingTimer) {
        clearTimeout(typingTimer);
      }
      
      // Set new timer to stop typing after 1 second of inactivity
      const newTimer = setTimeout(() => {
        sendStopTyping();
      }, 1000);
      
      setTypingTimer(newTimer);
    } else if (!text.trim() && typingTimer) {
      clearTimeout(typingTimer);
      sendStopTyping();
      setTypingTimer(null);
    }

    // Detect @ mentions
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);
      setMentionStartIndex(cursorPosition - query.length - 1);

      if (query.length >= 1) {
        try {
          const users = await commentsApi.searchUsersForMention(query, objectiveId);
          setMentionSuggestions(users.map(user => ({ ...user, startIndex: mentionMatch.index! })));
          setShowMentions(true);
          setSelectedMentionIndex(0);
        } catch (error) {
          console.error('Error searching users:', error);
        }
      } else {
        setShowMentions(false);
        setMentionSuggestions([]);
      }
    } else {
      setShowMentions(false);
      setMentionSuggestions([]);
    }
  }, [objectiveId]);

  // Insert mention into text
  const insertMention = useCallback((user: CommentSearchUser) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const beforeMention = newComment.substring(0, mentionStartIndex);
    const afterCursor = newComment.substring(textarea.selectionStart);
    const mentionText = commentsApi.createMentionText(user.name, user.id);

    const newText = beforeMention + mentionText + ' ' + afterCursor;
    setNewComment(newText);
    setShowMentions(false);

    // Set cursor position after mention
    setTimeout(() => {
      const newPosition = beforeMention.length + mentionText.length + 1;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);
  }, [newComment, mentionStartIndex]);

  // Handle keyboard events for mention selection
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showMentions && mentionSuggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedMentionIndex(prev => 
            prev < mentionSuggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedMentionIndex(prev => 
            prev > 0 ? prev - 1 : mentionSuggestions.length - 1
          );
          break;
        case 'Enter':
        case 'Tab':
          if (mentionSuggestions[selectedMentionIndex]) {
            e.preventDefault();
            insertMention(mentionSuggestions[selectedMentionIndex]);
          }
          break;
        case 'Escape':
          setShowMentions(false);
          break;
      }
    }
  }, [showMentions, mentionSuggestions, selectedMentionIndex, insertMention]);

  const createComment = async (content: string, parentId?: number) => {
    if (!content.trim()) return;

    try {
      // Stop typing indicator
      if (typingTimer) {
        clearTimeout(typingTimer);
        setTypingTimer(null);
      }
      sendStopTyping();

      const { content: parsedContent, mentions } = commentsApi.parseMentions(content);
      
      const commentData: CreateCommentDto = {
        objective_id: objectiveId,
        content: parsedContent,
        mentions,
        parent_comment_id: parentId
      };

      await commentsApi.createComment(commentData);
      // Real-time update will handle adding to comments list via socket
      
      // Clear form
      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error creating comment:', error);
    }
  };

  const updateComment = async (commentId: number, content: string) => {
    if (!content.trim()) return;

    try {
      await commentsApi.updateComment(commentId, { content });
      // Real-time update will handle updating the comments list via socket
      
      setEditingComment(null);
      setEditContent('');
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const deleteComment = async (commentId: number) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await commentsApi.deleteComment(commentId);
      // Real-time update will handle removing from comments list via socket
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const formatCommentContent = (content: string) => {
    return commentsApi.formatMentions(content);
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  const CommentItem: React.FC<{ comment: Comment; depth?: number }> = ({ 
    comment, 
    depth = 0 
  }) => (
    <div className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-100 pl-4' : ''} mb-4`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-gray-900">{comment.user_name}</span>
            <span className="text-sm text-gray-500">
              {formatRelativeTime(comment.created_at)}
            </span>
            {comment.updated_at !== comment.created_at && (
              <span className="text-xs text-gray-400">(edited)</span>
            )}
          </div>
          
          {editingComment === comment.id ? (
            <div className="space-y-2">
              <textarea
                ref={editTextareaRef}
                value={editContent}
                onChange={(e) => handleTextChange(e.target.value, true)}
                className="w-full p-2 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
              <div className="flex space-x-2">
                <button
                  onClick={() => updateComment(comment.id, editContent)}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingComment(null);
                    setEditContent('');
                  }}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div 
                className="text-gray-800 mb-2"
                dangerouslySetInnerHTML={{ 
                  __html: formatCommentContent(comment.content) 
                }}
              />
              
              <div className="flex items-center space-x-4 text-sm">
                <button
                  onClick={() => setReplyingTo(comment.id)}
                  className="flex items-center space-x-1 text-gray-500 hover:text-blue-600"
                >
                  <Reply className="w-3 h-3" />
                  <span>Reply</span>
                </button>
                
                {comment.user_id === currentUserId && (
                  <>
                    <button
                      onClick={() => {
                        setEditingComment(comment.id);
                        setEditContent(comment.content);
                      }}
                      className="flex items-center space-x-1 text-gray-500 hover:text-blue-600"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    
                    <button
                      onClick={() => deleteComment(comment.id)}
                      className="flex items-center space-x-1 text-gray-500 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Reply form */}
      {replyingTo === comment.id && (
        <div className="mt-4 ml-11">
          <div className="relative">
            <textarea
              value={newComment}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Reply to ${comment.user_name}...`}
              className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
            
            {/* Mention suggestions */}
            {showMentions && mentionSuggestions.length > 0 && (
              <div 
                ref={mentionDropdownRef}
                className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-32 overflow-y-auto"
                style={{ top: '100%' }}
              >
                {mentionSuggestions.map((user, index) => (
                  <div
                    key={user.id}
                    onClick={() => insertMention(user)}
                    className={`px-3 py-2 cursor-pointer flex items-center space-x-2 ${
                      index === selectedMentionIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <AtSign className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{user.name}</span>
                    <span className="text-sm text-gray-500">{user.email}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-2 mt-2">
            <button
              onClick={() => {
                setReplyingTo(null);
                setNewComment('');
              }}
              className="px-3 py-1 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={() => createComment(newComment, comment.id)}
              disabled={!newComment.trim()}
              className="px-4 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              <Send className="w-3 h-3" />
              <span>Reply</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4">
          {comment.replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="border-t pt-4">
      {/* Comments toggle */}
      <button
        onClick={() => setShowComments(!showComments)}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4"
      >
        <MessageCircle className="w-4 h-4" />
        <span>{commentCount} {commentCount === 1 ? 'Comment' : 'Comments'}</span>
      </button>

      {showComments && (
        <div className="space-y-4">
          {/* New comment form */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment... Use @ to mention someone"
              className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
            
            {/* Mention suggestions */}
            {showMentions && mentionSuggestions.length > 0 && (
              <div 
                ref={mentionDropdownRef}
                className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-32 overflow-y-auto"
                style={{ top: '100%' }}
              >
                {mentionSuggestions.map((user, index) => (
                  <div
                    key={user.id}
                    onClick={() => insertMention(user)}
                    className={`px-3 py-2 cursor-pointer flex items-center space-x-2 ${
                      index === selectedMentionIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <AtSign className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{user.name}</span>
                    <span className="text-sm text-gray-500">{user.email}</span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-end mt-2">
              <button
                onClick={() => createComment(newComment)}
                disabled={!newComment.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Comment</span>
              </button>
            </div>
          </div>

          {/* Typing indicators */}
          {typingUsers.filter(user => user.userId !== currentUserId).length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
              <Loader className="w-4 h-4 animate-spin" />
              <span>
                {typingUsers
                  .filter(user => user.userId !== currentUserId)
                  .map(user => user.userName)
                  .join(', ')} {typingUsers.filter(user => user.userId !== currentUserId).length === 1 ? 'is' : 'are'} typing...
              </span>
            </div>
          )}

          {/* Comments list */}
          {loading ? (
            <div className="text-center py-4 text-gray-500">Loading comments...</div>
          ) : error ? (
            <div className="text-center py-4 text-red-500">
              <p>Error loading comments: {error}</p>
              <button 
                onClick={loadComments}
                className="mt-2 text-blue-500 hover:text-blue-700 underline"
              >
                Retry
              </button>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map(comment => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GoalComments;