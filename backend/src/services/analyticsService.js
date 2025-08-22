const db = require('../utils/database');

class AnalyticsService {
  // Get goal completion trends over time
  async getGoalCompletionTrends(filters = {}) {
    try {
      const { startDate, endDate, teamId, userId, status } = filters;
      
      // In a real implementation, this would query the database
      // For now, returning mock data with realistic patterns
      const trends = [];
      const days = 30;
      const baseDate = new Date(startDate || '2024-12-01');
      
      for (let i = 0; i < days; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);
        
        trends.push({
          date: date.toISOString().split('T')[0],
          completed: Math.floor(Math.random() * 10) + 5,
          inProgress: Math.floor(Math.random() * 15) + 10,
          atRisk: Math.floor(Math.random() * 8) + 2,
          notStarted: Math.floor(Math.random() * 5) + 3
        });
      }
      
      return trends;
    } catch (error) {
      console.error('Error getting goal completion trends:', error);
      throw error;
    }
  }

  // Get team performance metrics
  async getTeamPerformanceMetrics(filters = {}) {
    try {
      const { startDate, endDate, teamId } = filters;
      
      const mockTeams = [
        { id: 1, name: '개발팀', color: '#3B82F6' },
        { id: 2, name: '마케팅팀', color: '#EF4444' },
        { id: 3, name: '기획팀', color: '#10B981' },
        { id: 4, name: 'QA팀', color: '#F59E0B' },
        { id: 5, name: '디자인팀', color: '#8B5CF6' }
      ];

      const metrics = mockTeams.map(team => ({
        teamId: team.id,
        teamName: team.name,
        color: team.color,
        totalObjectives: Math.floor(Math.random() * 15) + 5,
        completedObjectives: Math.floor(Math.random() * 8) + 2,
        averageProgress: Math.floor(Math.random() * 40) + 60,
        onTrackCount: Math.floor(Math.random() * 6) + 3,
        atRiskCount: Math.floor(Math.random() * 3) + 1,
        completionRate: (Math.random() * 30 + 70).toFixed(1),
        velocity: Math.floor(Math.random() * 20) + 30,
        memberCount: Math.floor(Math.random() * 8) + 4,
        keyResultsCompleted: Math.floor(Math.random() * 25) + 15
      }));

      return metrics;
    } catch (error) {
      console.error('Error getting team performance metrics:', error);
      throw error;
    }
  }

  // Get individual performance metrics
  async getIndividualPerformanceMetrics(filters = {}) {
    try {
      const { startDate, endDate, teamId, userId } = filters;
      
      const mockUsers = [
        '김개발', '이프론트', '박백엔드', '최기획', '정디자이너', 
        '장마케팅', '윤QA', '한데브옵스', '조프로덕트', '서비즈니스'
      ];

      const metrics = mockUsers.map((name, index) => ({
        userId: index + 1,
        userName: name,
        avatar: `https://ui-avatars.com/api/?name=${name}&background=random`,
        totalObjectives: Math.floor(Math.random() * 8) + 3,
        completedObjectives: Math.floor(Math.random() * 5) + 1,
        averageProgress: Math.floor(Math.random() * 40) + 55,
        completionRate: (Math.random() * 25 + 70).toFixed(1),
        keyResultsOwned: Math.floor(Math.random() * 12) + 5,
        keyResultsCompleted: Math.floor(Math.random() * 8) + 2,
        performanceScore: Math.floor(Math.random() * 20) + 75,
        streak: Math.floor(Math.random() * 15) + 1,
        lastActivity: this.generateRandomDate(new Date('2024-12-01'), new Date())
      }));

      return metrics.sort((a, b) => b.performanceScore - a.performanceScore);
    } catch (error) {
      console.error('Error getting individual performance metrics:', error);
      throw error;
    }
  }

  // Get progress distribution data
  async getProgressDistribution(filters = {}) {
    try {
      const { startDate, endDate, teamId, type } = filters;
      
      const distribution = {
        byStatus: [
          { status: 'completed', count: 24, percentage: 32, color: '#10B981' },
          { status: 'on_track', count: 31, percentage: 41, color: '#3B82F6' },
          { status: 'at_risk', count: 15, percentage: 20, color: '#F59E0B' },
          { status: 'behind', count: 5, percentage: 7, color: '#EF4444' }
        ],
        byProgress: [
          { range: '0-25%', count: 8, objectives: ['목표 A', '목표 B'] },
          { range: '26-50%', count: 12, objectives: ['목표 C', '목표 D', '목표 E'] },
          { range: '51-75%', count: 18, objectives: ['목표 F', '목표 G', '목표 H'] },
          { range: '76-100%', count: 37, objectives: ['목표 I', '목표 J', '목표 K'] }
        ],
        byType: [
          { type: 'company', count: 8, color: '#8B5CF6' },
          { type: 'team', count: 35, color: '#3B82F6' },
          { type: 'individual', count: 42, color: '#10B981' }
        ]
      };

      return distribution;
    } catch (error) {
      console.error('Error getting progress distribution:', error);
      throw error;
    }
  }

  // Get key result heat map data
  async getKeyResultHeatMap(filters = {}) {
    try {
      const { startDate, endDate, teamId } = filters;
      
      // Generate heat map data for key results performance
      const heatMapData = [];
      const teams = ['개발팀', '마케팅팀', '기획팀', 'QA팀', '디자인팀'];
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      
      teams.forEach((team, teamIndex) => {
        quarters.forEach((quarter, quarterIndex) => {
          const performance = Math.random() * 100;
          heatMapData.push({
            team: team,
            quarter: quarter,
            performance: Math.round(performance),
            keyResultsCount: Math.floor(Math.random() * 20) + 5,
            completionRate: Math.round(performance * 0.8 + 10),
            color: this.getHeatMapColor(performance)
          });
        });
      });

      return {
        data: heatMapData,
        summary: {
          totalKeyResults: heatMapData.reduce((sum, item) => sum + item.keyResultsCount, 0),
          averagePerformance: Math.round(heatMapData.reduce((sum, item) => sum + item.performance, 0) / heatMapData.length),
          topPerformingTeam: teams[Math.floor(Math.random() * teams.length)],
          improvementOpportunities: 3
        }
      };
    } catch (error) {
      console.error('Error getting key result heat map:', error);
      throw error;
    }
  }

  // Get comprehensive dashboard overview
  async getDashboardOverview(filters = {}) {
    try {
      const { startDate, endDate, teamId, userId } = filters;
      
      const overview = {
        summary: {
          totalObjectives: 85,
          completedObjectives: 24,
          totalKeyResults: 312,
          completedKeyResults: 178,
          averageProgress: 67,
          onTrackCount: 31,
          atRiskCount: 15,
          behindCount: 5,
          completionRate: 74.2
        },
        trends: {
          progressTrend: 12, // percentage change
          completionTrend: 8,
          velocityTrend: -3,
          engagementTrend: 15
        },
        topPerformers: [
          { name: '김개발', score: 92, avatar: 'https://ui-avatars.com/api/?name=김개발' },
          { name: '이기획', score: 89, avatar: 'https://ui-avatars.com/api/?name=이기획' },
          { name: '박마케팅', score: 87, avatar: 'https://ui-avatars.com/api/?name=박마케팅' }
        ],
        recentActivity: [
          {
            type: 'objective_completed',
            user: '김개발',
            objective: '케이팝데몬헌터스 글로벌 런칭 성공',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            type: 'key_result_updated',
            user: '박마케팅',
            keyResult: 'MAU 500만 달성',
            progress: 76,
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
          }
        ]
      };

      return overview;
    } catch (error) {
      console.error('Error getting dashboard overview:', error);
      throw error;
    }
  }

  // Export data to CSV format
  async exportToCSV(filters = {}, dataType = 'objectives') {
    try {
      let data;
      let headers;

      switch (dataType) {
        case 'objectives':
          data = await this.getObjectivesForExport(filters);
          headers = ['ID', 'Title', 'Type', 'Owner', 'Team', 'Progress', 'Status', 'Created Date', 'Target Date'];
          break;
        case 'keyResults':
          data = await this.getKeyResultsForExport(filters);
          headers = ['ID', 'Title', 'Objective', 'Owner', 'Current Value', 'Target Value', 'Unit', 'Progress', 'Status'];
          break;
        case 'performance':
          data = await this.getPerformanceForExport(filters);
          headers = ['User', 'Team', 'Objectives', 'Completed', 'Completion Rate', 'Performance Score'];
          break;
        default:
          throw new Error('Invalid data type for export');
      }

      // Convert to CSV format
      const csvContent = [
        headers.join(','),
        ...data.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      return {
        content: csvContent,
        filename: `goals_${dataType}_${new Date().toISOString().split('T')[0]}.csv`,
        mimeType: 'text/csv'
      };
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw error;
    }
  }

  // Helper methods
  generateRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
  }

  getHeatMapColor(performance) {
    if (performance >= 80) return '#10B981'; // Green
    if (performance >= 60) return '#3B82F6'; // Blue
    if (performance >= 40) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  }

  // Mock data methods for export
  async getObjectivesForExport(filters) {
    const mockData = [
      ['1', '케이팝데몬헌터스 글로벌 런칭 성공', 'company', '김대표', '전체', '72%', 'in_progress', '2024-10-01', '2024-12-31'],
      ['2', '개발팀 기술 역량 강화', 'team', '김개발', '개발팀', '85%', 'on_track', '2024-10-01', '2024-12-31'],
      ['3', '개인 성장 목표', 'individual', '김개발', '개발팀', '65%', 'on_track', '2024-10-01', '2024-12-31']
    ];
    return mockData;
  }

  async getKeyResultsForExport(filters) {
    const mockData = [
      ['1', '글로벌 5개국 동시 런칭', '케이팝데몬헌터스 글로벌 런칭 성공', '김개발', '3', '5', '개국', '60%', 'on_track'],
      ['2', 'MAU 500만 달성', '케이팝데몬헌터스 글로벌 런칭 성공', '박마케팅', '380', '500', '만명', '76%', 'on_track'],
      ['3', '일일 매출 10억원 달성', '케이팝데몬헌터스 글로벌 런칭 성공', '최기획', '7.5', '10', '억원', '75%', 'at_risk']
    ];
    return mockData;
  }

  async getPerformanceForExport(filters) {
    const mockData = [
      ['김개발', '개발팀', '8', '5', '62.5%', '92'],
      ['이프론트', '개발팀', '6', '4', '66.7%', '89'],
      ['박백엔드', '개발팀', '7', '3', '42.9%', '87']
    ];
    return mockData;
  }
}

module.exports = new AnalyticsService();