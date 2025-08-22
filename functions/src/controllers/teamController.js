const db = require('../utils/database');

const teamController = {
  // Get all teams
  async getAllTeams(req, res) {
    try {
      const [teams] = await db.execute(
        'SELECT * FROM departments ORDER BY name'
      );
      res.json(teams);
    } catch (error) {
      console.error('Error fetching teams:', error);
      res.status(500).json({ error: 'Failed to fetch teams' });
    }
  },

  // Get team by ID
  async getTeamById(req, res) {
    try {
      const { id } = req.params;
      const [teams] = await db.execute(
        'SELECT * FROM departments WHERE id = ?',
        [id]
      );
      
      if (teams.length === 0) {
        return res.status(404).json({ error: 'Team not found' });
      }
      
      res.json(teams[0]);
    } catch (error) {
      console.error('Error fetching team:', error);
      res.status(500).json({ error: 'Failed to fetch team' });
    }
  },

  // Create new team
  async createTeam(req, res) {
    try {
      const { name, description } = req.body;
      
      const [result] = await db.execute(
        'INSERT INTO departments (name, description) VALUES (?, ?)',
        [name, description || null]
      );
      
      const [newTeam] = await db.execute(
        'SELECT * FROM departments WHERE id = ?',
        [result.insertId]
      );
      
      res.status(201).json(newTeam[0]);
    } catch (error) {
      console.error('Error creating team:', error);
      res.status(500).json({ error: 'Failed to create team' });
    }
  },

  // Update team
  async updateTeam(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      
      await db.execute(
        'UPDATE departments SET name = ?, description = ? WHERE id = ?',
        [name, description || null, id]
      );
      
      const [updatedTeam] = await db.execute(
        'SELECT * FROM departments WHERE id = ?',
        [id]
      );
      
      if (updatedTeam.length === 0) {
        return res.status(404).json({ error: 'Team not found' });
      }
      
      res.json(updatedTeam[0]);
    } catch (error) {
      console.error('Error updating team:', error);
      res.status(500).json({ error: 'Failed to update team' });
    }
  },

  // Delete team
  async deleteTeam(req, res) {
    try {
      const { id } = req.params;
      
      const [result] = await db.execute(
        'DELETE FROM departments WHERE id = ?',
        [id]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Team not found' });
      }
      
      res.json({ message: 'Team deleted successfully' });
    } catch (error) {
      console.error('Error deleting team:', error);
      res.status(500).json({ error: 'Failed to delete team' });
    }
  },

  // Get team members
  async getTeamMembers(req, res) {
    try {
      const { id } = req.params;
      
      // For now, return mock data since we don't have a user-team relationship table
      const mockMembers = [
        { id: 1, name: 'Kim Dev', role: 'Developer', email: 'kim@teampulse.com' },
        { id: 2, name: 'Lee Server', role: 'Backend Developer', email: 'lee@teampulse.com' }
      ];
      
      res.json(mockMembers);
    } catch (error) {
      console.error('Error fetching team members:', error);
      res.status(500).json({ error: 'Failed to fetch team members' });
    }
  },

  // Get user's teams
  async getUserTeams(req, res) {
    try {
      const userId = req.user?.id || 1; // Use authenticated user ID or default
      
      // For now, return all teams
      const [teams] = await db.execute(
        'SELECT * FROM departments ORDER BY name'
      );
      
      res.json(teams);
    } catch (error) {
      console.error('Error fetching user teams:', error);
      res.status(500).json({ error: 'Failed to fetch user teams' });
    }
  },

  // Get team hierarchy
  async getTeamHierarchy(req, res) {
    try {
      const { id } = req.params;
      
      // For now, return flat list
      const [teams] = await db.execute(
        'SELECT * FROM departments ORDER BY name'
      );
      
      res.json(teams);
    } catch (error) {
      console.error('Error fetching team hierarchy:', error);
      res.status(500).json({ error: 'Failed to fetch team hierarchy' });
    }
  },

  // Get single team (alias for getTeamById)
  async getTeam(req, res) {
    return teamController.getTeamById(req, res);
  },

  // Add team member
  async addTeamMember(req, res) {
    try {
      const { teamId } = req.params;
      const { userId, role } = req.body;
      
      // Mock response for now
      res.status(201).json({
        message: 'Team member added successfully',
        teamId,
        userId,
        role
      });
    } catch (error) {
      console.error('Error adding team member:', error);
      res.status(500).json({ error: 'Failed to add team member' });
    }
  },

  // Remove team member
  async removeTeamMember(req, res) {
    try {
      const { teamId, userId } = req.params;
      
      // Mock response for now
      res.json({
        message: 'Team member removed successfully',
        teamId,
        userId
      });
    } catch (error) {
      console.error('Error removing team member:', error);
      res.status(500).json({ error: 'Failed to remove team member' });
    }
  },

  // Get team statistics
  async getTeamStats(req, res) {
    try {
      const { id } = req.params;
      
      // Mock statistics for now
      const stats = {
        teamId: id,
        memberCount: 5,
        activeProjects: 3,
        completedTasks: 42,
        pendingTasks: 18,
        thisWeekProgress: 75
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching team stats:', error);
      res.status(500).json({ error: 'Failed to fetch team statistics' });
    }
  }
};

module.exports = teamController;