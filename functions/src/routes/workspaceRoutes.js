const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/workspaceController');
const { authenticate } = require('../middleware/firebaseAuth');
const { 
  requireWorkspaceMember, 
  requireWorkspaceRole,
  loadWorkspaceBySlug 
} = require('../middleware/workspaceAuth');

// All routes require authentication
router.use(authenticate);

// Workspace CRUD
router.post('/', workspaceController.createWorkspace);
router.get('/', workspaceController.getUserWorkspaces);
router.get('/:slug', workspaceController.getWorkspaceDetails);
router.put('/:id', 
  requireWorkspaceMember, 
  requireWorkspaceRole(['owner', 'admin']), 
  workspaceController.updateWorkspace
);
router.delete('/:id', 
  requireWorkspaceMember, 
  requireWorkspaceRole('owner'), 
  workspaceController.deleteWorkspace
);

// Member management
router.get('/:slug/members', 
  loadWorkspaceBySlug,
  requireWorkspaceMember,
  workspaceController.getWorkspaceMembers
);
router.post('/:slug/members', 
  loadWorkspaceBySlug,
  requireWorkspaceMember,
  requireWorkspaceRole(['owner', 'admin']),
  workspaceController.inviteMember
);
router.put('/:slug/members/:userId', 
  loadWorkspaceBySlug,
  requireWorkspaceMember,
  requireWorkspaceRole('owner'),
  workspaceController.updateMemberRole
);
router.delete('/:slug/members/:userId', 
  loadWorkspaceBySlug,
  requireWorkspaceMember,
  requireWorkspaceRole(['owner', 'admin']),
  workspaceController.removeMember
);

module.exports = router;