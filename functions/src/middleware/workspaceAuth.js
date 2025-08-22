const db = require('../utils/database');

// Middleware to verify workspace membership
const requireWorkspaceMember = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is a member of the workspace
    const [members] = await db.query(
      `SELECT wm.*, w.name as workspace_name, w.slug as workspace_slug
       FROM workspace_members wm
       JOIN workspaces w ON wm.workspace_id = w.id
       WHERE wm.workspace_id = ? AND wm.user_id = ? AND wm.status = 'active'`,
      [workspaceId, req.user.id]
    );

    if (members.length === 0) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }

    // Attach workspace info to request
    req.workspace = {
      id: workspaceId,
      name: members[0].workspace_name,
      slug: members[0].workspace_slug,
      memberRole: members[0].role,
      memberId: members[0].id
    };

    next();
  } catch (error) {
    console.error('Workspace auth error:', error);
    res.status(500).json({ error: 'Failed to verify workspace membership' });
  }
};

// Middleware to require specific roles
const requireWorkspaceRole = (roles) => {
  return async (req, res, next) => {
    try {
      // Ensure requireWorkspaceMember has run first
      if (!req.workspace) {
        return res.status(500).json({ error: 'Workspace context not established' });
      }

      // Check if user has required role
      const userRole = req.workspace.memberRole;
      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: allowedRoles,
          current: userRole
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ error: 'Failed to verify permissions' });
    }
  };
};

// Middleware to load workspace by slug
const loadWorkspaceBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return res.status(400).json({ error: 'Workspace slug is required' });
    }

    const [workspaces] = await db.query(
      'SELECT * FROM workspaces WHERE slug = ?',
      [slug]
    );

    if (workspaces.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    req.workspaceId = workspaces[0].id;
    req.workspaceData = workspaces[0];

    next();
  } catch (error) {
    console.error('Load workspace error:', error);
    res.status(500).json({ error: 'Failed to load workspace' });
  }
};

// Check if user can perform action on resource
const canAccessResource = (resourceType) => {
  return async (req, res, next) => {
    try {
      if (!req.workspace) {
        return res.status(500).json({ error: 'Workspace context not established' });
      }

      const resourceId = req.params.id || req.params[`${resourceType}Id`];
      if (!resourceId) {
        return next(); // No specific resource to check
      }

      let query;
      switch (resourceType) {
        case 'objective':
          query = 'SELECT workspace_id FROM objectives WHERE id = ?';
          break;
        case 'task':
          query = 'SELECT workspace_id FROM tasks WHERE id = ?';
          break;
        case 'meeting':
          query = 'SELECT workspace_id FROM meetings WHERE id = ?';
          break;
        case 'channel':
          query = 'SELECT workspace_id FROM workspace_channels WHERE id = ?';
          break;
        default:
          return res.status(400).json({ error: 'Invalid resource type' });
      }

      const [resources] = await db.query(query, [resourceId]);

      if (resources.length === 0) {
        return res.status(404).json({ error: `${resourceType} not found` });
      }

      if (resources[0].workspace_id !== req.workspace.id) {
        return res.status(403).json({ error: 'Resource belongs to different workspace' });
      }

      next();
    } catch (error) {
      console.error('Resource access check error:', error);
      res.status(500).json({ error: 'Failed to verify resource access' });
    }
  };
};

// Get user's workspaces
const getUserWorkspaces = async (userId) => {
  try {
    const [workspaces] = await db.query(
      `SELECT w.*, wm.role, wm.joined_at
       FROM workspace_members wm
       JOIN workspaces w ON wm.workspace_id = w.id
       WHERE wm.user_id = ? AND wm.status = 'active'
       ORDER BY wm.joined_at DESC`,
      [userId]
    );

    return workspaces;
  } catch (error) {
    console.error('Get user workspaces error:', error);
    throw error;
  }
};

module.exports = {
  requireWorkspaceMember,
  requireWorkspaceRole,
  loadWorkspaceBySlug,
  canAccessResource,
  getUserWorkspaces
};