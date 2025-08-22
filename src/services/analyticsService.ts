const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  teamId?: number;
  userId?: number;
  status?: string;
  type?: string;
}

export interface CompletionTrendsData {
  date: string;
  completed: number;
  inProgress: number;
  atRisk: number;
  notStarted: number;
}

export interface TeamPerformanceData {
  teamId: number;
  teamName: string;
  color: string;
  totalObjectives: number;
  completedObjectives: number;
  averageProgress: number;
  onTrackCount: number;
  atRiskCount: number;
  completionRate: string;
  velocity: number;
  memberCount: number;
  keyResultsCompleted: number;
}

export interface IndividualPerformanceData {
  userId: number;
  userName: string;
  avatar: string;
  totalObjectives: number;
  completedObjectives: number;
  averageProgress: number;
  completionRate: string;
  keyResultsOwned: number;
  keyResultsCompleted: number;
  performanceScore: number;
  streak: number;
  lastActivity: string;
}

export interface ProgressDistributionData {
  byStatus: Array<{
    status: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  byProgress: Array<{
    range: string;
    count: number;
    objectives: string[];
  }>;
  byType: Array<{
    type: string;
    count: number;
    color: string;
  }>;
}

export interface KeyResultHeatMapData {
  data: Array<{
    team: string;
    quarter: string;
    performance: number;
    keyResultsCount: number;
    completionRate: number;
    color: string;
  }>;
  summary: {
    totalKeyResults: number;
    averagePerformance: number;
    topPerformingTeam: string;
    improvementOpportunities: number;
  };
}

export interface DashboardOverviewData {
  summary: {
    totalObjectives: number;
    completedObjectives: number;
    totalKeyResults: number;
    completedKeyResults: number;
    averageProgress: number;
    onTrackCount: number;
    atRiskCount: number;
    behindCount: number;
    completionRate: number;
  };
  trends: {
    progressTrend: number;
    completionTrend: number;
    velocityTrend: number;
    engagementTrend: number;
  };
  topPerformers: Array<{
    name: string;
    score: number;
    avatar: string;
  }>;
  recentActivity: Array<{
    type: string;
    user: string;
    objective?: string;
    keyResult?: string;
    progress?: number;
    timestamp: string;
  }>;
}

class AnalyticsService {
  private buildQueryParams(filters: AnalyticsFilters): string {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    return params.toString();
  }

  private async fetchWithAuth(url: string): Promise<Response> {
    const token = localStorage.getItem('authToken'); // Adjust based on your auth system
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  }

  // Get goal completion trends
  async getGoalCompletionTrends(filters: AnalyticsFilters = {}): Promise<CompletionTrendsData[]> {
    const queryParams = this.buildQueryParams(filters);
    const response = await this.fetchWithAuth(
      `${API_BASE_URL}/api/analytics/goals/completion-trends?${queryParams}`
    );
    
    const data = await response.json();
    return data.data;
  }

  // Get team performance metrics
  async getTeamPerformanceMetrics(filters: AnalyticsFilters = {}): Promise<TeamPerformanceData[]> {
    const queryParams = this.buildQueryParams(filters);
    const response = await this.fetchWithAuth(
      `${API_BASE_URL}/api/analytics/goals/team-performance?${queryParams}`
    );
    
    const data = await response.json();
    return data.data;
  }

  // Get individual performance metrics
  async getIndividualPerformanceMetrics(filters: AnalyticsFilters = {}): Promise<IndividualPerformanceData[]> {
    const queryParams = this.buildQueryParams(filters);
    const response = await this.fetchWithAuth(
      `${API_BASE_URL}/api/analytics/goals/individual-performance?${queryParams}`
    );
    
    const data = await response.json();
    return data.data;
  }

  // Get progress distribution
  async getProgressDistribution(filters: AnalyticsFilters = {}): Promise<ProgressDistributionData> {
    const queryParams = this.buildQueryParams(filters);
    const response = await this.fetchWithAuth(
      `${API_BASE_URL}/api/analytics/goals/progress-distribution?${queryParams}`
    );
    
    const data = await response.json();
    return data.data;
  }

  // Get key result heat map
  async getKeyResultHeatMap(filters: AnalyticsFilters = {}): Promise<KeyResultHeatMapData> {
    const queryParams = this.buildQueryParams(filters);
    const response = await this.fetchWithAuth(
      `${API_BASE_URL}/api/analytics/goals/key-result-heatmap?${queryParams}`
    );
    
    const data = await response.json();
    return data.data;
  }

  // Get dashboard overview
  async getDashboardOverview(filters: AnalyticsFilters = {}): Promise<DashboardOverviewData> {
    const queryParams = this.buildQueryParams(filters);
    const response = await this.fetchWithAuth(
      `${API_BASE_URL}/api/analytics/goals/dashboard-overview?${queryParams}`
    );
    
    const data = await response.json();
    return data.data;
  }

  // Export data to CSV
  async exportToCSV(filters: AnalyticsFilters = {}, dataType: 'objectives' | 'keyResults' | 'performance' = 'objectives'): Promise<void> {
    const queryParams = this.buildQueryParams({ ...filters, type: dataType });
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`${API_BASE_URL}/api/analytics/goals/export?${queryParams}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });
    
    if (!response.ok) {
      throw new Error('Export failed');
    }

    // Handle file download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `goals_${dataType}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Get comprehensive analytics data (all at once)
  async getAllAnalytics(filters: AnalyticsFilters = {}): Promise<{
    overview: DashboardOverviewData;
    completionTrends: CompletionTrendsData[];
    teamPerformance: TeamPerformanceData[];
    individualPerformance: IndividualPerformanceData[];
    progressDistribution: ProgressDistributionData;
    keyResultHeatMap: KeyResultHeatMapData;
  }> {
    try {
      // Execute all requests in parallel for better performance
      const [
        overview,
        completionTrends,
        teamPerformance,
        individualPerformance,
        progressDistribution,
        keyResultHeatMap
      ] = await Promise.all([
        this.getDashboardOverview(filters),
        this.getGoalCompletionTrends(filters),
        this.getTeamPerformanceMetrics(filters),
        this.getIndividualPerformanceMetrics(filters),
        this.getProgressDistribution(filters),
        this.getKeyResultHeatMap(filters)
      ]);

      return {
        overview,
        completionTrends,
        teamPerformance,
        individualPerformance,
        progressDistribution,
        keyResultHeatMap
      };
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      throw error;
    }
  }

  // Track analytics events
  async trackEvent(eventType: string, entityType: string, entityId?: number, properties?: any): Promise<void> {
    try {
      const token = localStorage.getItem('authToken');
      
      await fetch(`${API_BASE_URL}/api/analytics/events/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          eventType,
          entityType,
          entityId,
          properties
        })
      });
    } catch (error) {
      console.error('Error tracking analytics event:', error);
      // Don't throw error for tracking events to avoid disrupting user experience
    }
  }
}

// Export singleton instance
const analyticsService = new AnalyticsService();
export default analyticsService;