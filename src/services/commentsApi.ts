import apiService from './api';

export interface Comment {
  id: number;
  objective_id: number;
  user_id: number;
  content: string;
  parent_comment_id?: number;
  mentions?: Mention[];
  user_name: string;
  user_email: string;
  parent_user_name?: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  replies?: Comment[];
}

export interface Mention {
  userId: number;
  userName: string;
  startIndex: number;
  endIndex: number;
}

export interface CreateCommentDto {
  objective_id: number;
  content: string;
  parent_comment_id?: number;
  mentions?: Mention[];
}

export interface UpdateCommentDto {
  content: string;
}

export interface CommentSearchUser {
  id: number;
  name: string;
  email: string;
}

export interface CommentsResponse {
  comments: Comment[];
  totalCount: number;
  hasMore: boolean;
}

class CommentsApi {
  private getAuthHeader() {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Create a new comment
  async createComment(data: CreateCommentDto): Promise<Comment> {
    try {
      const response = await apiService.post('/comments', data);
      return response.data;
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  }

  // Get comments for an objective
  async getObjectiveComments(
    objectiveId: number,
    options: {
      limit?: number;
      offset?: number;
      includeReplies?: boolean;
    } = {}
  ): Promise<CommentsResponse> {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.includeReplies !== undefined) {
        params.append('includeReplies', options.includeReplies.toString());
      }

      const response = await apiService.get(
        `/comments/objective/${objectiveId}?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching objective comments:', error);
      throw error;
    }
  }

  // Get a single comment
  async getComment(commentId: number): Promise<Comment> {
    try {
      const response = await apiService.get(`/comments/${commentId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching comment:', error);
      throw error;
    }
  }

  // Update a comment
  async updateComment(commentId: number, data: UpdateCommentDto): Promise<Comment> {
    try {
      const response = await apiService.put(`/comments/${commentId}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  }

  // Delete a comment
  async deleteComment(commentId: number): Promise<void> {
    try {
      await apiService.delete(`/comments/${commentId}`);
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }

  // Get comment count for an objective
  async getCommentCount(objectiveId: number): Promise<number> {
    try {
      const response = await apiService.get(`/comments/objective/${objectiveId}/count`);
      return response.data.count;
    } catch (error) {
      console.error('Error fetching comment count:', error);
      throw error;
    }
  }

  // Search users for mentions
  async searchUsersForMention(query: string, objectiveId?: number): Promise<CommentSearchUser[]> {
    try {
      const params = new URLSearchParams({ q: query });
      if (objectiveId) {
        params.append('objectiveId', objectiveId.toString());
      }

      const response = await apiService.get(`/comments/users/search?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error searching users for mention:', error);
      throw error;
    }
  }

  // Get user's recent comments
  async getUserRecentComments(limit: number = 10): Promise<Comment[]> {
    try {
      const response = await apiService.get(`/comments/user/recent?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user recent comments:', error);
      throw error;
    }
  }

  // Parse mentions from text content
  parseMentions(content: string): { content: string; mentions: Mention[] } {
    const mentions: Mention[] = [];
    let parsedContent = content;
    const mentionRegex = /@\[([^\]]+)\]\((\d+)\)/g;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      const [fullMatch, userName, userId] = match;
      mentions.push({
        userId: parseInt(userId),
        userName: userName,
        startIndex: match.index,
        endIndex: match.index + fullMatch.length
      });
    }

    return {
      content: parsedContent,
      mentions
    };
  }

  // Format mentions for display
  formatMentions(content: string): string {
    return content.replace(
      /@\[([^\]]+)\]\(\d+\)/g,
      '<span class="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">@$1</span>'
    );
  }

  // Create mention text
  createMentionText(userName: string, userId: number): string {
    return `@[${userName}](${userId})`;
  }

  // Extract plain text from content with mentions
  extractPlainText(content: string): string {
    return content.replace(/@\[([^\]]+)\]\(\d+\)/g, '@$1');
  }
}

const commentsApi = new CommentsApi();
export default commentsApi;