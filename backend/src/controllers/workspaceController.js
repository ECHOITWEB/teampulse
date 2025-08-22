const db = require('../utils/database');
const crypto = require('crypto');
const { sendInvitationEmail } = require('../services/emailService');

// Create a new workspace
const createWorkspace = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { name, description } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ error: 'Workspace name is required' });
    }

    // Generate unique slug
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    let slug = baseSlug;
    let counter = 1;

    // Check for existing slugs
    while (true) {
      const [existing] = await connection.query(
        'SELECT id FROM workspaces WHERE slug = ?',
        [slug]
      );
      
      if (existing.length === 0) break;
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create workspace
    const [result] = await connection.query(
      `INSERT INTO workspaces (name, slug, description, owner_id) 
       VALUES (?, ?, ?, ?)`,
      [name, slug, description, userId]
    );

    const workspaceId = result.insertId;

    // Add owner as member
    await connection.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role, status, joined_at) 
       VALUES (?, ?, 'owner', 'active', NOW())`,
      [workspaceId, userId]
    );

    // Create default general channel
    const [channelResult] = await connection.query(
      `INSERT INTO workspace_channels (workspace_id, name, description, is_private, created_by) 
       VALUES (?, 'general', 'General discussion', FALSE, ?)`,
      [workspaceId, userId]
    );

    // Add owner to general channel
    await connection.query(
      `INSERT INTO channel_members (channel_id, user_id) 
       VALUES (?, ?)`,
      [channelResult.insertId, userId]
    );

    // Create workspace settings
    await connection.query(
      `INSERT INTO workspace_settings (workspace_id, default_channel_id) 
       VALUES (?, ?)`,
      [workspaceId, channelResult.insertId]
    );

    // Log the action
    await connection.query(
      `INSERT INTO workspace_audit_log (workspace_id, user_id, action, details) 
       VALUES (?, ?, 'workspace_created', ?)`,
      [workspaceId, userId, JSON.stringify({ name, slug })]
    );

    await connection.commit();

    // Fetch the created workspace
    const [workspaces] = await db.query(
      `SELECT w.*, wm.role 
       FROM workspaces w 
       JOIN workspace_members wm ON w.id = wm.workspace_id 
       WHERE w.id = ? AND wm.user_id = ?`,
      [workspaceId, userId]
    );

    res.status(201).json({
      message: 'Workspace created successfully',
      workspace: workspaces[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error('Create workspace error:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  } finally {
    connection.release();
  }
};

// Get user's workspaces
const getUserWorkspaces = async (req, res) => {
  try {
    const userId = req.user.id;

    const [workspaces] = await db.query(
      `SELECT w.*, wm.role, wm.joined_at,
              COUNT(DISTINCT wm2.user_id) as member_count
       FROM workspace_members wm
       JOIN workspaces w ON wm.workspace_id = w.id
       LEFT JOIN workspace_members wm2 ON w.id = wm2.workspace_id AND wm2.status = 'active'
       WHERE wm.user_id = ? AND wm.status = 'active'
       GROUP BY w.id, wm.role, wm.joined_at
       ORDER BY wm.joined_at DESC`,
      [userId]
    );

    res.json({ workspaces });
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
};

// Get workspace details
const getWorkspaceDetails = async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user.id;

    const [workspaces] = await db.query(
      `SELECT w.*, wm.role,
              COUNT(DISTINCT wm2.user_id) as member_count,
              COUNT(DISTINCT o.id) as objective_count,
              COUNT(DISTINCT t.id) as task_count
       FROM workspaces w
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = ?
       LEFT JOIN workspace_members wm2 ON w.id = wm2.workspace_id AND wm2.status = 'active'
       LEFT JOIN objectives o ON w.id = o.workspace_id
       LEFT JOIN tasks t ON w.id = t.workspace_id
       WHERE w.slug = ?
       GROUP BY w.id, wm.role`,
      [userId, slug]
    );

    if (workspaces.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const workspace = workspaces[0];

    // Check if user is a member
    if (!workspace.role) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }

    res.json({ workspace });
  } catch (error) {
    console.error('Get workspace details error:', error);
    res.status(500).json({ error: 'Failed to fetch workspace details' });
  }
};

// Update workspace
const updateWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, logo_url } = req.body;
    const userId = req.user.id;

    // Check permissions (only owner and admin can update)
    if (!['owner', 'admin'].includes(req.workspace.memberRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (logo_url !== undefined) {
      updates.push('logo_url = ?');
      values.push(logo_url);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(id);

    await db.query(
      `UPDATE workspaces SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    // Log the action
    await db.query(
      `INSERT INTO workspace_audit_log (workspace_id, user_id, action, details) 
       VALUES (?, ?, 'workspace_updated', ?)`,
      [id, userId, JSON.stringify({ name, description, logo_url })]
    );

    res.json({ message: 'Workspace updated successfully' });
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({ error: 'Failed to update workspace' });
  }
};

// Delete workspace (owner only)
const deleteWorkspace = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is owner
    if (req.workspace.memberRole !== 'owner') {
      return res.status(403).json({ error: 'Only workspace owner can delete workspace' });
    }

    // Log the deletion
    await connection.query(
      `INSERT INTO workspace_audit_log (workspace_id, user_id, action, details) 
       VALUES (?, ?, 'workspace_deleted', ?)`,
      [id, userId, JSON.stringify({ deleted_at: new Date() })]
    );

    // Delete workspace (cascades to all related data)
    await connection.query('DELETE FROM workspaces WHERE id = ?', [id]);

    await connection.commit();

    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Delete workspace error:', error);
    res.status(500).json({ error: 'Failed to delete workspace' });
  } finally {
    connection.release();
  }
};

// Get workspace members
const getWorkspaceMembers = async (req, res) => {
  try {
    const workspaceId = req.workspace.id;

    const [members] = await db.query(
      `SELECT wm.*, u.email, u.name, u.avatar_url,
              iu.name as invited_by_name
       FROM workspace_members wm
       JOIN users u ON wm.user_id = u.id
       LEFT JOIN users iu ON wm.invited_by = iu.id
       WHERE wm.workspace_id = ?
       ORDER BY wm.role = 'owner' DESC, wm.joined_at DESC`,
      [workspaceId]
    );

    res.json({ members });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
};

// Invite member to workspace
const inviteMember = async (req, res) => {
  try {
    const workspaceId = req.workspace.id;
    const { email, role = 'member' } = req.body;
    const invitedBy = req.user.id;

    // Check permissions
    if (!['owner', 'admin'].includes(req.workspace.memberRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to invite members' });
    }

    // Validate role
    if (!['admin', 'member', 'guest'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user already exists
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      // Check if already a member
      const [existingMembers] = await db.query(
        'SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
        [workspaceId, existingUsers[0].id]
      );

      if (existingMembers.length > 0) {
        return res.status(400).json({ error: 'User is already a member' });
      }

      // Add as pending member
      await db.query(
        `INSERT INTO workspace_members (workspace_id, user_id, role, status, invited_by) 
         VALUES (?, ?, ?, 'invited', ?)`,
        [workspaceId, existingUsers[0].id, role, invitedBy]
      );
    }

    // Create invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    await db.query(
      `INSERT INTO workspace_invitations (workspace_id, email, role, token, invited_by, expires_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [workspaceId, email, role, token, invitedBy, expiresAt]
    );

    // Send invitation email (implement this service)
    // await sendInvitationEmail(email, req.workspace.name, token);

    // Log the action
    await db.query(
      `INSERT INTO workspace_audit_log (workspace_id, user_id, action, resource_type, details) 
       VALUES (?, ?, 'member_invited', 'user', ?)`,
      [workspaceId, invitedBy, JSON.stringify({ email, role })]
    );

    res.json({ 
      message: 'Invitation sent successfully',
      invitation: { email, role, expires_at: expiresAt }
    });
  } catch (error) {
    console.error('Invite member error:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
};

// Update member role
const updateMemberRole = async (req, res) => {
  try {
    const workspaceId = req.workspace.id;
    const { userId } = req.params;
    const { role } = req.body;

    // Check permissions
    if (req.workspace.memberRole !== 'owner') {
      return res.status(403).json({ error: 'Only owner can change member roles' });
    }

    // Can't change owner's role
    const [members] = await db.query(
      'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
      [workspaceId, userId]
    );

    if (members.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (members[0].role === 'owner') {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }

    // Validate role
    if (!['admin', 'member', 'guest'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    await db.query(
      'UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?',
      [role, workspaceId, userId]
    );

    // Log the action
    await db.query(
      `INSERT INTO workspace_audit_log (workspace_id, user_id, action, resource_type, resource_id, details) 
       VALUES (?, ?, 'member_role_updated', 'user', ?, ?)`,
      [workspaceId, req.user.id, userId, JSON.stringify({ old_role: members[0].role, new_role: role })]
    );

    res.json({ message: 'Member role updated successfully' });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
};

// Remove member from workspace
const removeMember = async (req, res) => {
  try {
    const workspaceId = req.workspace.id;
    const { userId } = req.params;

    // Check permissions
    if (!['owner', 'admin'].includes(req.workspace.memberRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Can't remove owner
    const [members] = await db.query(
      'SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
      [workspaceId, userId]
    );

    if (members.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (members[0].role === 'owner') {
      return res.status(400).json({ error: 'Cannot remove workspace owner' });
    }

    // Admin can't remove admin
    if (req.workspace.memberRole === 'admin' && members[0].role === 'admin') {
      return res.status(403).json({ error: 'Admin cannot remove another admin' });
    }

    await db.query(
      'DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
      [workspaceId, userId]
    );

    // Remove from all channels
    await db.query(
      `DELETE cm FROM channel_members cm
       JOIN workspace_channels wc ON cm.channel_id = wc.id
       WHERE wc.workspace_id = ? AND cm.user_id = ?`,
      [workspaceId, userId]
    );

    // Log the action
    await db.query(
      `INSERT INTO workspace_audit_log (workspace_id, user_id, action, resource_type, resource_id, details) 
       VALUES (?, ?, 'member_removed', 'user', ?, ?)`,
      [workspaceId, req.user.id, userId, JSON.stringify({ removed_role: members[0].role })]
    );

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

module.exports = {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceDetails,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  inviteMember,
  updateMemberRole,
  removeMember
};