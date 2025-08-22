const workspaceService = require('./workspace.service');
const { validateWorkspace } = require('./workspace.validator');

class WorkspaceController {
  /**
   * Create a new workspace with onboarding flow
   */
  async createWorkspace(req, res) {
    try {
      const { error } = validateWorkspace(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const workspaceData = {
        ...req.body,
        ownerId: req.user.id,
        createdBy: req.user.id
      };

      const workspace = await workspaceService.createWorkspace(workspaceData);
      
      // Automatically setup based on template
      if (req.body.template) {
        await workspaceService.applyTemplate(workspace.id, req.body.template);
      }

      // Send invitations to team members
      if (req.body.teamMembers && req.body.teamMembers.length > 0) {
        await workspaceService.inviteMembers(workspace.id, req.body.teamMembers, req.user);
      }

      res.status(201).json({
        success: true,
        workspace,
        message: 'Workspace created successfully'
      });
    } catch (error) {
      console.error('Error creating workspace:', error);
      res.status(500).json({ error: 'Failed to create workspace' });
    }
  }

  /**
   * Get workspace details with projects and channels
   */
  async getWorkspace(req, res) {
    try {
      const { workspaceId } = req.params;
      
      const workspace = await workspaceService.getWorkspaceDetails(workspaceId, req.user.id);
      
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      res.json({
        success: true,
        workspace
      });
    } catch (error) {
      console.error('Error fetching workspace:', error);
      res.status(500).json({ error: 'Failed to fetch workspace' });
    }
  }

  /**
   * Update workspace settings
   */
  async updateWorkspace(req, res) {
    try {
      const { workspaceId } = req.params;
      
      // Check permissions
      const hasPermission = await workspaceService.checkPermission(
        workspaceId, 
        req.user.id, 
        'admin'
      );
      
      if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const updatedWorkspace = await workspaceService.updateWorkspace(
        workspaceId,
        req.body
      );

      res.json({
        success: true,
        workspace: updatedWorkspace,
        message: 'Workspace updated successfully'
      });
    } catch (error) {
      console.error('Error updating workspace:', error);
      res.status(500).json({ error: 'Failed to update workspace' });
    }
  }

  /**
   * List all workspaces for a user
   */
  async listWorkspaces(req, res) {
    try {
      const workspaces = await workspaceService.getUserWorkspaces(req.user.id);
      
      res.json({
        success: true,
        workspaces,
        count: workspaces.length
      });
    } catch (error) {
      console.error('Error listing workspaces:', error);
      res.status(500).json({ error: 'Failed to list workspaces' });
    }
  }

  /**
   * Switch active workspace
   */
  async switchWorkspace(req, res) {
    try {
      const { workspaceId } = req.params;
      
      const hasAccess = await workspaceService.checkAccess(workspaceId, req.user.id);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this workspace' });
      }

      // Update user's active workspace
      await workspaceService.setActiveWorkspace(req.user.id, workspaceId);
      
      // Get workspace details for the session
      const workspace = await workspaceService.getWorkspaceDetails(workspaceId, req.user.id);

      res.json({
        success: true,
        workspace,
        message: 'Workspace switched successfully'
      });
    } catch (error) {
      console.error('Error switching workspace:', error);
      res.status(500).json({ error: 'Failed to switch workspace' });
    }
  }

  /**
   * Invite members to workspace
   */
  async inviteMembers(req, res) {
    try {
      const { workspaceId } = req.params;
      const { emails, role = 'member', message } = req.body;

      // Check permissions
      const hasPermission = await workspaceService.checkPermission(
        workspaceId,
        req.user.id,
        'admin'
      );

      if (!hasPermission) {
        return res.status(403).json({ error: 'Only admins can invite members' });
      }

      const invitations = await workspaceService.inviteMembers(
        workspaceId,
        emails,
        req.user,
        { role, message }
      );

      res.json({
        success: true,
        invitations,
        message: `${invitations.length} invitations sent successfully`
      });
    } catch (error) {
      console.error('Error inviting members:', error);
      res.status(500).json({ error: 'Failed to send invitations' });
    }
  }

  /**
   * Get workspace analytics
   */
  async getWorkspaceAnalytics(req, res) {
    try {
      const { workspaceId } = req.params;
      const { startDate, endDate, metrics } = req.query;

      const hasAccess = await workspaceService.checkAccess(workspaceId, req.user.id);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const analytics = await workspaceService.getAnalytics(workspaceId, {
        startDate,
        endDate,
        metrics: metrics ? metrics.split(',') : undefined
      });

      res.json({
        success: true,
        analytics
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }

  /**
   * Get workspace activity feed
   */
  async getActivityFeed(req, res) {
    try {
      const { workspaceId } = req.params;
      const { limit = 50, offset = 0, filter } = req.query;

      const hasAccess = await workspaceService.checkAccess(workspaceId, req.user.id);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const activities = await workspaceService.getActivityFeed(workspaceId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        filter
      });

      res.json({
        success: true,
        activities,
        hasMore: activities.length === parseInt(limit)
      });
    } catch (error) {
      console.error('Error fetching activity feed:', error);
      res.status(500).json({ error: 'Failed to fetch activity feed' });
    }
  }

  /**
   * Archive workspace
   */
  async archiveWorkspace(req, res) {
    try {
      const { workspaceId } = req.params;

      // Only owner can archive
      const isOwner = await workspaceService.checkOwnership(workspaceId, req.user.id);
      
      if (!isOwner) {
        return res.status(403).json({ error: 'Only workspace owner can archive' });
      }

      await workspaceService.archiveWorkspace(workspaceId);

      res.json({
        success: true,
        message: 'Workspace archived successfully'
      });
    } catch (error) {
      console.error('Error archiving workspace:', error);
      res.status(500).json({ error: 'Failed to archive workspace' });
    }
  }
}

module.exports = new WorkspaceController();