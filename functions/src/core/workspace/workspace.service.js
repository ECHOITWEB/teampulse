const db = require('../../utils/database');
const { v4: uuidv4 } = require('uuid');
const emailService = require('../../services/emailService');
const templates = require('./workspace.templates');

class WorkspaceService {
  /**
   * Create a new workspace
   */
  async createWorkspace(data) {
    const workspaceId = uuidv4();
    const subdomain = this.generateSubdomain(data.workspaceName);

    const workspace = {
      id: workspaceId,
      name: data.workspaceName,
      subdomain,
      owner_id: data.ownerId,
      company_size: data.companySize,
      primary_use: data.primaryUse,
      plan_type: data.planType || 'free',
      settings: {
        theme: 'light',
        notifications: true,
        timezone: data.timezone || 'UTC',
        language: data.language || 'en'
      },
      created_at: new Date(),
      updated_at: new Date()
    };

    await db.query(
      `INSERT INTO workspaces (id, name, subdomain, owner_id, company_size, primary_use, plan_type, settings, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [workspace.id, workspace.name, workspace.subdomain, workspace.owner_id, 
       workspace.company_size, workspace.primary_use, workspace.plan_type, 
       JSON.stringify(workspace.settings), workspace.created_at, workspace.updated_at]
    );

    // Add owner as admin member
    await this.addMember(workspaceId, data.ownerId, 'owner');

    // Create default channels
    await this.createDefaultChannels(workspaceId);

    return workspace;
  }

  /**
   * Apply template to workspace
   */
  async applyTemplate(workspaceId, templateId) {
    const template = templates[templateId];
    if (!template) {
      throw new Error('Template not found');
    }

    // Create template channels
    for (const channel of template.channels) {
      await this.createChannel(workspaceId, {
        name: channel.name,
        purpose: channel.purpose,
        type: channel.type || 'public'
      });
    }

    // Create template projects
    if (template.projects) {
      for (const project of template.projects) {
        await this.createProject(workspaceId, project);
      }
    }

    // Setup workflows
    if (template.workflows) {
      for (const workflow of template.workflows) {
        await this.createWorkflow(workspaceId, workflow);
      }
    }

    // Apply settings
    if (template.settings) {
      await this.updateWorkspaceSettings(workspaceId, template.settings);
    }

    return true;
  }

  /**
   * Create default channels for new workspace
   */
  async createDefaultChannels(workspaceId) {
    const defaultChannels = [
      { name: 'general', purpose: 'Company-wide announcements and discussions', type: 'public' },
      { name: 'random', purpose: 'Non-work conversations and team bonding', type: 'public' }
    ];

    for (const channel of defaultChannels) {
      await this.createChannel(workspaceId, channel);
    }
  }

  /**
   * Create a channel
   */
  async createChannel(workspaceId, channelData) {
    const channelId = uuidv4();
    
    await db.query(
      `INSERT INTO channels (id, workspace_id, name, purpose, type, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [channelId, workspaceId, channelData.name, channelData.purpose, 
       channelData.type || 'public', new Date()]
    );

    return channelId;
  }

  /**
   * Create a project
   */
  async createProject(workspaceId, projectData) {
    const projectId = uuidv4();
    
    await db.query(
      `INSERT INTO projects (id, workspace_id, name, description, template_id, status, settings, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [projectId, workspaceId, projectData.name, projectData.description,
       projectData.templateId, 'active', JSON.stringify(projectData.settings || {}), new Date()]
    );

    // Create project board columns
    if (projectData.columns) {
      for (const column of projectData.columns) {
        await this.createProjectColumn(projectId, column);
      }
    }

    return projectId;
  }

  /**
   * Create workflow
   */
  async createWorkflow(workspaceId, workflowData) {
    const workflowId = uuidv4();
    
    await db.query(
      `INSERT INTO workflows (id, workspace_id, name, trigger_type, conditions, actions, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [workflowId, workspaceId, workflowData.name, workflowData.triggerType,
       JSON.stringify(workflowData.conditions || {}), 
       JSON.stringify(workflowData.actions || []),
       true, new Date()]
    );

    return workflowId;
  }

  /**
   * Get workspace details
   */
  async getWorkspaceDetails(workspaceId, userId) {
    const workspace = await db.query(
      `SELECT w.*, 
              COUNT(DISTINCT wm.user_id) as member_count,
              COUNT(DISTINCT p.id) as project_count,
              COUNT(DISTINCT c.id) as channel_count
       FROM workspaces w
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
       LEFT JOIN projects p ON w.id = p.workspace_id AND p.status = 'active'
       LEFT JOIN channels c ON w.id = c.workspace_id
       WHERE w.id = $1
       GROUP BY w.id`,
      [workspaceId]
    );

    if (!workspace.rows[0]) {
      return null;
    }

    // Get user's role in workspace
    const memberInfo = await db.query(
      `SELECT role, joined_at FROM workspace_members 
       WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, userId]
    );

    return {
      ...workspace.rows[0],
      currentUserRole: memberInfo.rows[0]?.role || null,
      joinedAt: memberInfo.rows[0]?.joined_at || null
    };
  }

  /**
   * Get user's workspaces
   */
  async getUserWorkspaces(userId) {
    const workspaces = await db.query(
      `SELECT w.*, wm.role, wm.joined_at,
              COUNT(DISTINCT wm2.user_id) as member_count
       FROM workspaces w
       INNER JOIN workspace_members wm ON w.id = wm.workspace_id
       LEFT JOIN workspace_members wm2 ON w.id = wm2.workspace_id
       WHERE wm.user_id = $1 AND w.archived = false
       GROUP BY w.id, wm.role, wm.joined_at
       ORDER BY wm.last_accessed DESC`,
      [userId]
    );

    return workspaces.rows;
  }

  /**
   * Invite members to workspace
   */
  async inviteMembers(workspaceId, emails, invitedBy, options = {}) {
    const invitations = [];

    for (const email of emails) {
      const inviteId = uuidv4();
      const inviteToken = this.generateInviteToken();

      await db.query(
        `INSERT INTO workspace_invitations 
         (id, workspace_id, email, role, invited_by, token, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [inviteId, workspaceId, email, options.role || 'member', 
         invitedBy.id, inviteToken, 
         new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
         new Date()]
      );

      // Send invitation email
      await emailService.sendWorkspaceInvitation({
        to: email,
        workspaceName: await this.getWorkspaceName(workspaceId),
        invitedBy: invitedBy.name,
        inviteToken,
        customMessage: options.message
      });

      invitations.push({
        id: inviteId,
        email,
        role: options.role || 'member',
        status: 'sent'
      });
    }

    return invitations;
  }

  /**
   * Check user permission in workspace
   */
  async checkPermission(workspaceId, userId, requiredRole) {
    const result = await db.query(
      `SELECT role FROM workspace_members 
       WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, userId]
    );

    if (!result.rows[0]) {
      return false;
    }

    const userRole = result.rows[0].role;
    const roleHierarchy = ['member', 'admin', 'owner'];
    
    return roleHierarchy.indexOf(userRole) >= roleHierarchy.indexOf(requiredRole);
  }

  /**
   * Check if user has access to workspace
   */
  async checkAccess(workspaceId, userId) {
    const result = await db.query(
      `SELECT 1 FROM workspace_members 
       WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, userId]
    );

    return result.rows.length > 0;
  }

  /**
   * Get workspace analytics
   */
  async getAnalytics(workspaceId, options = {}) {
    const { startDate, endDate, metrics = ['all'] } = options;

    const analytics = {};

    // Active users
    if (metrics.includes('all') || metrics.includes('users')) {
      const activeUsers = await db.query(
        `SELECT COUNT(DISTINCT user_id) as count
         FROM user_activities
         WHERE workspace_id = $1 
         AND created_at BETWEEN $2 AND $3`,
        [workspaceId, startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate || new Date()]
      );
      analytics.activeUsers = activeUsers.rows[0].count;
    }

    // Messages sent
    if (metrics.includes('all') || metrics.includes('messages')) {
      const messages = await db.query(
        `SELECT COUNT(*) as count
         FROM messages m
         INNER JOIN channels c ON m.channel_id = c.id
         WHERE c.workspace_id = $1
         AND m.created_at BETWEEN $2 AND $3`,
        [workspaceId, startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate || new Date()]
      );
      analytics.messagesSent = messages.rows[0].count;
    }

    // Tasks completed
    if (metrics.includes('all') || metrics.includes('tasks')) {
      const tasks = await db.query(
        `SELECT COUNT(*) as count
         FROM tasks t
         INNER JOIN projects p ON t.project_id = p.id
         WHERE p.workspace_id = $1
         AND t.status = 'completed'
         AND t.completed_at BETWEEN $2 AND $3`,
        [workspaceId, startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate || new Date()]
      );
      analytics.tasksCompleted = tasks.rows[0].count;
    }

    return analytics;
  }

  /**
   * Helper methods
   */
  generateSubdomain(workspaceName) {
    return workspaceName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 63);
  }

  generateInviteToken() {
    return Buffer.from(uuidv4()).toString('base64').replace(/[/+=]/g, '');
  }

  async getWorkspaceName(workspaceId) {
    const result = await db.query('SELECT name FROM workspaces WHERE id = $1', [workspaceId]);
    return result.rows[0]?.name || 'Workspace';
  }

  async addMember(workspaceId, userId, role) {
    await db.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = $3`,
      [workspaceId, userId, role, new Date()]
    );
  }
}

module.exports = new WorkspaceService();