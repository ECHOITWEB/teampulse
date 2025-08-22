const Objective = require('../models/Objective');
const KeyResult = require('../models/KeyResult');
const notificationService = require('../services/notificationService');
const { validationResult } = require('express-validator');

class ObjectiveController {
  // Create a new objective
  async createObjective(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const objectiveData = {
        ...req.body,
        owner_id: req.user.id
      };

      const objective = await Objective.create(objectiveData);

      // Send notification for objective assignment if assigned to someone else
      if (objective.owner_id !== req.user.id) {
        await notificationService.createNotification(
          objective.owner_id,
          'objective_assigned',
          'objective',
          objective.id,
          {
            objectiveTitle: objective.title,
            actionUrl: `/goals/objectives/${objective.id}`
          }
        );
      }

      // Emit real-time update
      if (req.io) {
        req.io.to(`user_${objective.owner_id}`).emit('objective:created', objective);
        if (objective.team_id) {
          req.io.to(`team_${objective.team_id}`).emit('objective:created', objective);
        }
      }

      res.status(201).json({
        success: true,
        data: objective,
        message: 'Objective created successfully'
      });
    } catch (error) {
      console.error('Create objective error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get objective by ID
  async getObjective(req, res) {
    try {
      const objectiveId = req.params.id;
      const objective = await Objective.findById(objectiveId);

      if (!objective) {
        return res.status(404).json({
          success: false,
          error: 'Objective not found'
        });
      }

      res.json({
        success: true,
        data: objective
      });
    } catch (error) {
      console.error('Get objective error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get objectives for current user
  async getUserObjectives(req, res) {
    try {
      const userId = req.user.id;
      const filters = {
        quarter: req.query.quarter,
        year: req.query.year,
        type: req.query.type,
        status: req.query.status
      };

      const objectives = await Objective.findByOwner(userId, filters);

      res.json({
        success: true,
        data: objectives
      });
    } catch (error) {
      console.error('Get user objectives error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get objectives by team
  async getTeamObjectives(req, res) {
    try {
      const teamId = req.params.teamId;
      const filters = {
        quarter: req.query.quarter,
        year: req.query.year,
        status: req.query.status
      };

      const objectives = await Objective.findByTeam(teamId, filters);

      res.json({
        success: true,
        data: objectives
      });
    } catch (error) {
      console.error('Get team objectives error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update objective
  async updateObjective(req, res) {
    try {
      const objectiveId = req.params.id;
      const updates = req.body;

      // Get current objective to compare status changes
      const currentObjective = await Objective.findById(objectiveId);
      if (!currentObjective) {
        return res.status(404).json({
          success: false,
          error: 'Objective not found'
        });
      }

      const success = await Objective.update(objectiveId, updates);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Objective not found or no changes made'
        });
      }

      // Send notification for status changes
      if (updates.status && updates.status !== currentObjective.status) {
        if (updates.status === 'completed') {
          await notificationService.createNotification(
            currentObjective.owner_id,
            'objective_completed',
            'objective',
            objectiveId,
            {
              objectiveTitle: currentObjective.title,
              actionUrl: `/goals/objectives/${objectiveId}`
            }
          );
        } else {
          await notificationService.createNotification(
            currentObjective.owner_id,
            'goal_status_change',
            'objective',
            objectiveId,
            {
              goalTitle: currentObjective.title,
              oldStatus: currentObjective.status,
              newStatus: updates.status,
              actionUrl: `/goals/objectives/${objectiveId}`
            }
          );
        }
      }

      // Emit real-time update
      if (req.io) {
        req.io.to(`objective_${objectiveId}`).emit('objective:updated', {
          objectiveId,
          updates
        });
      }

      res.json({
        success: true,
        message: 'Objective updated successfully'
      });
    } catch (error) {
      console.error('Update objective error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Delete objective
  async deleteObjective(req, res) {
    try {
      const objectiveId = req.params.id;
      const success = await Objective.delete(objectiveId);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Objective not found'
        });
      }

      // Emit real-time update
      if (req.io) {
        req.io.emit('objective:deleted', objectiveId);
      }

      res.json({
        success: true,
        message: 'Objective deleted successfully'
      });
    } catch (error) {
      console.error('Delete objective error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Add key result to objective
  async addKeyResult(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const objectiveId = req.params.id;
      const keyResultData = {
        objective_id: objectiveId,
        owner_id: req.body.owner_id || req.user.id,
        ...req.body
      };

      const keyResult = await KeyResult.create(keyResultData);

      // Emit real-time update
      if (req.io) {
        req.io.to(`objective_${objectiveId}`).emit('keyResult:created', keyResult);
      }

      res.status(201).json({
        success: true,
        data: keyResult,
        message: 'Key result added successfully'
      });
    } catch (error) {
      console.error('Add key result error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update key result progress
  async updateKeyResultProgress(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { keyResultId } = req.params;
      const { currentValue, comment } = req.body;

      // Get current key result for notifications
      const keyResult = await KeyResult.findById(keyResultId);
      if (!keyResult) {
        return res.status(404).json({
          success: false,
          error: 'Key result not found'
        });
      }

      const result = await KeyResult.updateProgress(
        keyResultId,
        currentValue,
        comment,
        req.user.id
      );

      // Send notification for key result update if owner is different
      if (keyResult.owner_id !== req.user.id) {
        await notificationService.createNotification(
          keyResult.owner_id,
          'key_result_updated',
          'key_result',
          keyResultId,
          {
            keyResultTitle: keyResult.title,
            progress: Math.round(result.progress),
            actionUrl: `/goals/objectives/${keyResult.objective_id}#key-result-${keyResultId}`
          }
        );
      }

      // Emit real-time update
      if (req.io) {
        req.io.to(`keyResult_${keyResultId}`).emit('keyResult:progressUpdated', result);
      }

      res.json({
        success: true,
        data: result,
        message: 'Key result progress updated successfully'
      });
    } catch (error) {
      console.error('Update key result progress error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get objective hierarchy
  async getObjectiveHierarchy(req, res) {
    try {
      const userId = req.user.id;
      const teamId = req.query.teamId || null;

      const hierarchy = await Objective.getHierarchy(userId, teamId);

      res.json({
        success: true,
        data: hierarchy
      });
    } catch (error) {
      console.error('Get objective hierarchy error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get OKR dashboard data
  async getOKRDashboard(req, res) {
    try {
      const filters = {
        quarter: req.query.quarter,
        year: req.query.year || new Date().getFullYear(),
        type: req.query.type,
        teamId: req.query.teamId
      };

      const dashboardData = await Objective.getDashboardData(filters);

      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      console.error('Get OKR dashboard error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update key result
  async updateKeyResult(req, res) {
    try {
      const { keyResultId } = req.params;
      const updates = req.body;

      const success = await KeyResult.update(keyResultId, updates);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Key result not found or no changes made'
        });
      }

      // Emit real-time update
      if (req.io) {
        req.io.to(`keyResult_${keyResultId}`).emit('keyResult:updated', {
          keyResultId,
          updates
        });
      }

      res.json({
        success: true,
        message: 'Key result updated successfully'
      });
    } catch (error) {
      console.error('Update key result error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Delete key result
  async deleteKeyResult(req, res) {
    try {
      const { keyResultId } = req.params;
      const success = await KeyResult.delete(keyResultId);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Key result not found'
        });
      }

      // Emit real-time update
      if (req.io) {
        req.io.emit('keyResult:deleted', keyResultId);
      }

      res.json({
        success: true,
        message: 'Key result deleted successfully'
      });
    } catch (error) {
      console.error('Delete key result error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get key results by owner
  async getUserKeyResults(req, res) {
    try {
      const userId = req.user.id;
      const filters = {
        status: req.query.status,
        quarter: req.query.quarter,
        year: req.query.year
      };

      const keyResults = await KeyResult.getByOwner(userId, filters);

      res.json({
        success: true,
        data: keyResults
      });
    } catch (error) {
      console.error('Get user key results error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Bulk update key results progress
  async bulkUpdateKeyResults(req, res) {
    try {
      const { updates } = req.body;

      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Updates array is required'
        });
      }

      const results = await KeyResult.bulkUpdateProgress(updates, req.user.id);

      // Emit real-time updates
      if (req.io) {
        results.forEach(result => {
          req.io.to(`keyResult_${result.keyResultId}`).emit('keyResult:progressUpdated', result);
        });
      }

      res.json({
        success: true,
        data: results,
        message: 'Key results updated successfully'
      });
    } catch (error) {
      console.error('Bulk update key results error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new ObjectiveController();