const express = require('express');
const router = express.Router();
const capacityService = require('../services/capacityService');
const auth = require('../middleware/auth');
const { body, param, query } = require('express-validator');

// Validation middleware
const validateDateRange = [
  query('startDate').isISO8601().withMessage('Valid start date is required'),
  query('endDate').isISO8601().withMessage('Valid end date is required')
];

const validateCapacityUpdate = [
  body('available_hours').isFloat({ min: 0, max: 24 }).withMessage('Available hours must be between 0 and 24'),
  body('leave_type').optional().isIn(['none', 'vacation', 'sick', 'holiday', 'other'])
];

// All routes require authentication
router.use(auth);

// Get user capacity
router.get('/users/:userId',
  param('userId').optional().isInt(),
  validateDateRange,
  async (req, res) => {
    try {
      const userId = req.params.userId || req.user.id;
      const { startDate, endDate } = req.query;

      const capacity = await capacityService.calculateUserCapacity(
        userId,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: capacity
      });
    } catch (error) {
      console.error('Get user capacity error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Get team capacity
router.get('/teams/:teamId',
  param('teamId').isInt(),
  validateDateRange,
  async (req, res) => {
    try {
      const { teamId } = req.params;
      const { startDate, endDate } = req.query;

      const capacity = await capacityService.getTeamCapacity(
        teamId,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: capacity
      });
    } catch (error) {
      console.error('Get team capacity error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Update user capacity
router.put('/users/:userId/:date',
  param('userId').optional().isInt(),
  param('date').isISO8601(),
  validateCapacityUpdate,
  async (req, res) => {
    try {
      const userId = req.params.userId || req.user.id;
      const { date } = req.params;
      const capacityData = req.body;

      await capacityService.updateUserCapacity(userId, date, capacityData);

      res.json({
        success: true,
        message: 'Capacity updated successfully'
      });
    } catch (error) {
      console.error('Update capacity error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Get workload balance suggestions
router.get('/teams/:teamId/balance',
  param('teamId').isInt(),
  query('date').isISO8601(),
  async (req, res) => {
    try {
      const { teamId } = req.params;
      const { date } = req.query;

      const suggestions = await capacityService.getWorkloadBalanceSuggestions(
        teamId,
        date
      );

      res.json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      console.error('Get balance suggestions error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Forecast capacity needs
router.get('/teams/:teamId/forecast',
  param('teamId').isInt(),
  query('weeks').optional().isInt({ min: 1, max: 12 }),
  async (req, res) => {
    try {
      const { teamId } = req.params;
      const weeks = parseInt(req.query.weeks) || 4;

      const forecast = await capacityService.forecastCapacityNeeds(teamId, weeks);

      res.json({
        success: true,
        data: forecast
      });
    } catch (error) {
      console.error('Forecast capacity error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;