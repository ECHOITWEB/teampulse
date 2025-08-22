const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

class ApiService {
  private token: string | null = null;
  
  // Axios-like interface for compatibility
  public defaults = {
    headers: {
      common: {} as Record<string, string>
    }
  };

  constructor() {
    // Load token from localStorage
    this.token = localStorage.getItem('authToken');
    if (this.token) {
      this.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.defaults.headers.common,
      ...(options.headers as Record<string, string> || {}),
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }

    return response.json();
  }

  // Axios-like methods
  async get(endpoint: string, config?: RequestInit) {
    return this.request(endpoint, { ...config, method: 'GET' });
  }

  async post(endpoint: string, data?: any, config?: RequestInit) {
    return this.request(endpoint, { 
      ...config, 
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put(endpoint: string, data?: any, config?: RequestInit) {
    return this.request(endpoint, { 
      ...config, 
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete(endpoint: string, config?: RequestInit) {
    return this.request(endpoint, { ...config, method: 'DELETE' });
  }

  async patch(endpoint: string, data?: any, config?: RequestInit) {
    return this.request(endpoint, { 
      ...config, 
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  // Auth methods
  async demoLogin() {
    const data = await this.request('/users/demo-login', {
      method: 'POST',
    });
    this.token = data.token;
    localStorage.setItem('authToken', data.token);
    return data;
  }

  async getCurrentUser() {
    return this.request('/users/me');
  }

  // Chat session methods
  async createChatSession(toolType: string, sessionName?: string) {
    return this.request('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ tool_type: toolType, session_name: sessionName }),
    });
  }

  async getChatSessions(toolType?: string, limit = 20, offset = 0) {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    if (toolType) params.append('tool_type', toolType);
    
    return this.request(`/chat/sessions?${params}`);
  }

  async getSessionMessages(sessionId: string) {
    return this.request(`/chat/sessions/${sessionId}`);
  }

  async sendMessage(sessionId: string, message: {
    role: 'user' | 'assistant';
    content: string;
    file_info?: any;
    tokens_used?: number;
  }) {
    return this.request(`/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify(message),
    });
  }

  async deleteSession(sessionId: string) {
    return this.request(`/chat/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async updateSessionName(sessionId: string, sessionName: string) {
    return this.request(`/chat/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ session_name: sessionName }),
    });
  }

  // History methods
  async getHistorySummary() {
    return this.request('/history/summary');
  }

  async exportHistory(format = 'json', sessionId?: string) {
    const params = new URLSearchParams({ format });
    if (sessionId) params.append('sessionId', sessionId);
    
    return this.request(`/history/export?${params}`);
  }
}

const apiService = new ApiService();
export default apiService;