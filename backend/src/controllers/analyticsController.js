const db = require('../utils/database');
const analyticsService = require('../services/analyticsService');

const analyticsController = {
  // Get user metrics
  async getUserMetrics(req, res) {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;
      const targetUserId = userId || req.user?.id || 1;
      
      // Mock user metrics
      const metrics = {
        userId: targetUserId,
        period: { startDate, endDate },
        tasksCompleted: 35,
        tasksInProgress: 8,
        averageCompletionTime: 3.2,
        productivity: {
          score: 85,
          trend: 'up',
          change: 12
        },
        timeDistribution: {
          coding: 45,
          meetings: 20,
          reviews: 15,
          planning: 20
        }
      };
      
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching user metrics:', error);
      res.status(500).json({ error: 'Failed to fetch user metrics' });
    }
  },

  // Get team metrics
  async getTeamMetrics(req, res) {
    try {
      const { teamId } = req.params;
      const { startDate, endDate } = req.query;
      
      // Mock team metrics
      const metrics = {
        teamId,
        period: { startDate, endDate },
        teamSize: 5,
        velocity: 42,
        sprintProgress: 68,
        metrics: {
          tasksCompleted: 89,
          bugsClosed: 23,
          featuresDelivered: 12,
          codeReviews: 45
        },
        memberPerformance: [
          { name: 'Kim Dev', score: 92, tasksCompleted: 28 },
          { name: 'Lee Server', score: 85, tasksCompleted: 24 },
          { name: 'Park Payment', score: 88, tasksCompleted: 26 },
          { name: 'Jung QA', score: 90, tasksCompleted: 11 }
        ]
      };
      
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching team metrics:', error);
      res.status(500).json({ error: 'Failed to fetch team metrics' });
    }
  },

  // Get workload distribution
  async getWorkloadDistribution(req, res) {
    try {
      const { teamId } = req.query;
      
      // Mock workload distribution
      const distribution = {
        teamId: teamId || 'all',
        members: [
          {
            id: 1,
            name: 'Kim Dev',
            workload: 85,
            capacity: 100,
            tasks: 12,
            status: 'optimal'
          },
          {
            id: 2,
            name: 'Lee Server',
            workload: 110,
            capacity: 100,
            tasks: 15,
            status: 'overloaded'
          },
          {
            id: 3,
            name: 'Park Payment',
            workload: 65,
            capacity: 100,
            tasks: 8,
            status: 'underutilized'
          },
          {
            id: 4,
            name: 'Jung QA',
            workload: 75,
            capacity: 100,
            tasks: 10,
            status: 'optimal'
          }
        ],
        summary: {
          averageWorkload: 83.75,
          overloadedCount: 1,
          optimalCount: 2,
          underutilizedCount: 1
        }
      };
      
      res.json(distribution);
    } catch (error) {
      console.error('Error fetching workload distribution:', error);
      res.status(500).json({ error: 'Failed to fetch workload distribution' });
    }
  },

  // Get OKR progress
  async getOKRProgress(req, res) {
    try {
      const { teamId, userId } = req.query;
      
      // Mock OKR progress
      const progress = {
        filters: { teamId, userId },
        period: 'Q1 2025',
        objectives: [
          {
            id: 1,
            title: 'Improve System Performance',
            progress: 72,
            status: 'on_track',
            keyResults: [
              { title: 'Reduce API response time by 50%', progress: 85 },
              { title: 'Achieve 99.9% uptime', progress: 92 },
              { title: 'Optimize database queries', progress: 45 }
            ]
          },
          {
            id: 2,
            title: 'Enhance User Experience',
            progress: 58,
            status: 'at_risk',
            keyResults: [
              { title: 'Increase user satisfaction to 90%', progress: 65 },
              { title: 'Reduce bug reports by 40%', progress: 72 },
              { title: 'Launch mobile app', progress: 35 }
            ]
          }
        ],
        summary: {
          totalObjectives: 2,
          onTrack: 1,
          atRisk: 1,
          behind: 0,
          averageProgress: 65
        }
      };
      
      res.json(progress);
    } catch (error) {
      console.error('Error fetching OKR progress:', error);
      res.status(500).json({ error: 'Failed to fetch OKR progress' });
    }
  },

  // Get productivity insights
  async getProductivityInsights(req, res) {
    try {
      // Mock productivity insights
      const insights = {
        period: 'Last 30 days',
        insights: [
          {
            type: 'positive',
            title: 'Team velocity increased by 15%',
            description: 'Your team completed 15% more story points compared to last month',
            metric: { value: 15, unit: '%', trend: 'up' }
          },
          {
            type: 'warning',
            title: 'Code review time increasing',
            description: 'Average PR review time has increased from 1.5 to 2.8 days',
            metric: { value: 2.8, unit: 'days', trend: 'up' }
          },
          {
            type: 'info',
            title: 'Meeting time optimization opportunity',
            description: '23% of team time spent in meetings, consider async updates',
            metric: { value: 23, unit: '%', trend: 'stable' }
          }
        ],
        recommendations: [
          'Schedule focused work blocks to reduce context switching',
          'Implement automated code review tools to speed up reviews',
          'Consider daily standups via Slack instead of video calls'
        ]
      };
      
      res.json(insights);
    } catch (error) {
      console.error('Error fetching productivity insights:', error);
      res.status(500).json({ error: 'Failed to fetch productivity insights' });
    }
  },

  // Get burndown chart data
  async getBurndownChart(req, res) {
    try {
      const { objectiveId } = req.query;
      const { startDate, endDate } = req.query;
      
      // Mock burndown chart data
      const burndown = {
        objectiveId,
        period: { startDate, endDate },
        ideal: [
          { date: '2024-12-01', remaining: 100 },
          { date: '2024-12-07', remaining: 85 },
          { date: '2024-12-14', remaining: 70 },
          { date: '2024-12-21', remaining: 55 },
          { date: '2024-12-28', remaining: 40 },
          { date: '2025-01-04', remaining: 25 },
          { date: '2025-01-11', remaining: 10 },
          { date: '2025-01-18', remaining: 0 }
        ],
        actual: [
          { date: '2024-12-01', remaining: 100 },
          { date: '2024-12-07', remaining: 92 },
          { date: '2024-12-14', remaining: 78 },
          { date: '2024-12-21', remaining: 65 },
          { date: '2024-12-28', remaining: 52 }
        ],
        projection: {
          completionDate: '2025-01-25',
          daysDelay: 7,
          confidence: 0.75
        }
      };
      
      res.json(burndown);
    } catch (error) {
      console.error('Error fetching burndown chart:', error);
      res.status(500).json({ error: 'Failed to fetch burndown chart' });
    }
  },

  // Track analytics event
  async trackEvent(req, res) {
    try {
      const { eventType, entityType, entityId, properties } = req.body;
      const userId = req.user?.id || 1;
      
      // In a real implementation, this would store the event
      console.log('Analytics event tracked:', {
        userId,
        eventType,
        entityType,
        entityId,
        properties,
        timestamp: new Date().toISOString()
      });
      
      res.status(201).json({
        success: true,
        eventId: Date.now().toString(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error tracking event:', error);
      res.status(500).json({ error: 'Failed to track event' });
    }
  },

  // Goals Analytics Endpoints

  // Get goal completion trends
  async getGoalCompletionTrends(req, res) {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        teamId: req.query.teamId,
        userId: req.query.userId,
        status: req.query.status
      };

      const trends = await analyticsService.getGoalCompletionTrends(filters);
      res.json({
        success: true,
        data: trends,
        filters
      });
    } catch (error) {
      console.error('Error fetching goal completion trends:', error);
      res.status(500).json({ error: 'Failed to fetch goal completion trends' });
    }
  },

  // Get team performance metrics
  async getGoalTeamPerformance(req, res) {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        teamId: req.query.teamId
      };

      const metrics = await analyticsService.getTeamPerformanceMetrics(filters);
      res.json({
        success: true,
        data: metrics,
        filters
      });
    } catch (error) {
      console.error('Error fetching team performance metrics:', error);
      res.status(500).json({ error: 'Failed to fetch team performance metrics' });
    }
  },

  // Get individual performance metrics
  async getGoalIndividualPerformance(req, res) {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        teamId: req.query.teamId,
        userId: req.query.userId
      };

      const metrics = await analyticsService.getIndividualPerformanceMetrics(filters);
      res.json({
        success: true,
        data: metrics,
        filters
      });
    } catch (error) {
      console.error('Error fetching individual performance metrics:', error);
      res.status(500).json({ error: 'Failed to fetch individual performance metrics' });
    }
  },

  // Get progress distribution
  async getGoalProgressDistribution(req, res) {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        teamId: req.query.teamId,
        type: req.query.type
      };

      const distribution = await analyticsService.getProgressDistribution(filters);
      res.json({
        success: true,
        data: distribution,
        filters
      });
    } catch (error) {
      console.error('Error fetching progress distribution:', error);
      res.status(500).json({ error: 'Failed to fetch progress distribution' });
    }
  },

  // Get key result heat map
  async getKeyResultHeatMap(req, res) {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        teamId: req.query.teamId
      };

      const heatMapData = await analyticsService.getKeyResultHeatMap(filters);
      res.json({
        success: true,
        data: heatMapData,
        filters
      });
    } catch (error) {
      console.error('Error fetching key result heat map:', error);
      res.status(500).json({ error: 'Failed to fetch key result heat map' });
    }
  },

  // Get dashboard overview
  async getGoalDashboardOverview(req, res) {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        teamId: req.query.teamId,
        userId: req.query.userId
      };

      const overview = await analyticsService.getDashboardOverview(filters);
      res.json({
        success: true,
        data: overview,
        filters
      });
    } catch (error) {
      console.error('Error fetching dashboard overview:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard overview' });
    }
  },

  // Export goals data
  async exportGoalsData(req, res) {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        teamId: req.query.teamId,
        userId: req.query.userId
      };
      const dataType = req.query.type || 'objectives';

      const exportData = await analyticsService.exportToCSV(filters, dataType);
      
      res.setHeader('Content-Type', exportData.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
      res.send(exportData.content);
    } catch (error) {
      console.error('Error exporting goals data:', error);
      res.status(500).json({ error: 'Failed to export goals data' });
    }
  }
};

module.exports = analyticsController;