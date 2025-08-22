const Task = require('../models/Task');
const { validationResult } = require('express-validator');

class TaskController {
  // Create a new task
  async createTask(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const taskData = {
        ...req.body,
        created_by: req.user.id
      };

      const task = await Task.create(taskData);

      // Emit real-time update
      if (req.io) {
        req.io.to(`user_${task.owner_id}`).emit('task:created', task);
        if (task.assignee_id && task.assignee_id !== task.owner_id) {
          req.io.to(`user_${task.assignee_id}`).emit('task:assigned', task);
        }
        if (task.team_id) {
          req.io.to(`team_${task.team_id}`).emit('task:created', task);
        }
      }

      res.status(201).json({
        success: true,
        data: task,
        message: 'Task created successfully'
      });
    } catch (error) {
      console.error('Create task error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get task by ID
  async getTask(req, res) {
    try {
      const taskId = req.params.id;
      const task = await Task.findById(taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      // Get comments and time logs
      const [comments, timeLogs] = await Promise.all([
        Task.getComments(taskId),
        Task.getTimeLogs(taskId)
      ]);

      res.json({
        success: true,
        data: {
          ...task,
          comments,
          timeLogs
        }
      });
    } catch (error) {
      console.error('Get task error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get tasks for current user
  async getUserTasks(req, res) {
    try {
      const userId = req.user.id;
      const filters = {
        status: req.query.status,
        priority: req.query.priority,
        due_date_start: req.query.due_date_start,
        due_date_end: req.query.due_date_end,
        search: req.query.search
      };

      const tasks = await Task.findByAssignee(userId, filters);

      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      console.error('Get user tasks error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get tasks by team
  async getTeamTasks(req, res) {
    try {
      const teamId = req.params.teamId;
      const filters = {
        status: req.query.status ? req.query.status.split(',') : null
      };

      const tasks = await Task.findByTeam(teamId, filters);

      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      console.error('Get team tasks error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Update task
  async updateTask(req, res) {
    try {
      const taskId = req.params.id;
      const updates = req.body;

      const success = await Task.update(taskId, updates);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Task not found or no changes made'
        });
      }

      // Emit real-time update
      if (req.io) {
        req.io.to(`task_${taskId}`).emit('task:updated', {
          taskId,
          updates
        });
      }

      res.json({
        success: true,
        message: 'Task updated successfully'
      });
    } catch (error) {
      console.error('Update task error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Add task dependency
  async addDependency(req, res) {
    try {
      const taskId = req.params.id;
      const { dependsOnTaskId, dependencyType, lagTime } = req.body;

      const dependency = await Task.addDependency(
        taskId,
        dependsOnTaskId,
        dependencyType,
        lagTime
      );

      res.json({
        success: true,
        data: dependency,
        message: 'Dependency added successfully'
      });
    } catch (error) {
      console.error('Add dependency error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Remove task dependency
  async removeDependency(req, res) {
    try {
      const { taskId, dependsOnTaskId } = req.params;

      const success = await Task.removeDependency(taskId, dependsOnTaskId);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Dependency not found'
        });
      }

      res.json({
        success: true,
        message: 'Dependency removed successfully'
      });
    } catch (error) {
      console.error('Remove dependency error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Add comment to task
  async addComment(req, res) {
    try {
      const taskId = req.params.id;
      const commentData = {
        task_id: taskId,
        user_id: req.user.id,
        ...req.body
      };

      const comment = await Task.addComment(commentData);

      // Emit real-time update
      if (req.io) {
        req.io.to(`task_${taskId}`).emit('comment:added', comment);
      }

      res.json({
        success: true,
        data: comment,
        message: 'Comment added successfully'
      });
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Log time for task
  async logTime(req, res) {
    try {
      const taskId = req.params.id;
      const { hoursLogged, description, logDate } = req.body;

      const timeLog = await Task.logTime(
        taskId,
        req.user.id,
        hoursLogged,
        description,
        logDate || new Date()
      );

      // Emit real-time update
      if (req.io) {
        req.io.to(`task_${taskId}`).emit('time:logged', timeLog);
      }

      res.json({
        success: true,
        data: timeLog,
        message: 'Time logged successfully'
      });
    } catch (error) {
      console.error('Log time error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Search tasks
  async searchTasks(req, res) {
    try {
      const { q, limit } = req.query;
      
      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Search query must be at least 2 characters'
        });
      }

      const tasks = await Task.searchTasks(
        q.trim(),
        req.user.id,
        parseInt(limit) || 20
      );

      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      console.error('Search tasks error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Delete task
  async deleteTask(req, res) {
    try {
      const taskId = req.params.id;
      const success = await Task.delete(taskId);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      // Emit real-time update
      if (req.io) {
        req.io.emit('task:deleted', taskId);
      }

      res.json({
        success: true,
        message: 'Task deleted successfully'
      });
    } catch (error) {
      console.error('Delete task error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get task dependencies graph
  async getDependencyGraph(req, res) {
    try {
      const taskId = req.params.id;
      const task = await Task.findById(taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      // Build dependency graph
      const graph = {
        nodes: [{ id: task.id, label: task.title, status: task.status }],
        edges: []
      };

      // Add dependencies
      task.dependencies.forEach(dep => {
        graph.nodes.push({
          id: dep.depends_on_task_id,
          label: dep.title,
          status: dep.status
        });
        graph.edges.push({
          from: dep.depends_on_task_id,
          to: task.id,
          type: dep.dependency_type
        });
      });

      // Add dependents
      task.dependents.forEach(dep => {
        graph.nodes.push({
          id: dep.task_id,
          label: dep.title,
          status: dep.status
        });
        graph.edges.push({
          from: task.id,
          to: dep.task_id,
          type: dep.dependency_type
        });
      });

      res.json({
        success: true,
        data: graph
      });
    } catch (error) {
      console.error('Get dependency graph error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new TaskController();