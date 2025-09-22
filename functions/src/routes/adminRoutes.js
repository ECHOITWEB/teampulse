const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const SchemaManager = require('../admin/schemaManager');

// Admin authentication middleware
const requireAdmin = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is admin (you can customize this check)
    const adminEmails = [
      'echoitplanning1@gmail.com',
      'aijossi.business@gmail.com'
    ];

    if (!adminEmails.includes(user.email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ error: 'Authorization failed' });
  }
};

// Initialize SchemaManager
const schemaManager = new SchemaManager();

// ==================== ADMIN ENDPOINTS ====================

// Migrate existing data to new schema
router.post('/migrate', requireAdmin, async (req, res) => {
  try {
    console.log('Starting migration...');
    await schemaManager.migrateExistingData();
    res.json({ 
      success: true, 
      message: 'Migration completed successfully' 
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Cleanup dummy data
router.post('/cleanup', requireAdmin, async (req, res) => {
  try {
    console.log('Starting cleanup...');
    await schemaManager.cleanupDummyData();
    res.json({ 
      success: true, 
      message: 'Cleanup completed successfully' 
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Create company
router.post('/companies', requireAdmin, async (req, res) => {
  try {
    const companyId = await schemaManager.createCompany(req.body);
    res.json({ 
      success: true, 
      companyId 
    });
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Create workspace
router.post('/workspaces', requireAdmin, async (req, res) => {
  try {
    const workspaceId = await schemaManager.createWorkspace(req.body);
    res.json({ 
      success: true, 
      workspaceId 
    });
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Manage objectives
router.post('/objectives', requireAdmin, async (req, res) => {
  try {
    const objectiveId = await schemaManager.createObjective(req.body);
    res.json({ 
      success: true, 
      objectiveId 
    });
  } catch (error) {
    console.error('Create objective error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

router.put('/objectives/:id', requireAdmin, async (req, res) => {
  try {
    await schemaManager.updateObjective(req.params.id, req.body);
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
});

router.delete('/objectives/:id', requireAdmin, async (req, res) => {
  try {
    await schemaManager.deleteObjective(req.params.id);
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
});

// Get user workspaces
router.get('/users/:userId/workspaces', requireAdmin, async (req, res) => {
  try {
    const workspaces = await schemaManager.getUserWorkspaces(req.params.userId);
    res.json({ 
      success: true, 
      workspaces 
    });
  } catch (error) {
    console.error('Get user workspaces error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Direct Firestore access for debugging
router.post('/firestore/delete', requireAdmin, async (req, res) => {
  try {
    const { collection, documentId } = req.body;
    
    if (!collection || !documentId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Collection and documentId required' 
      });
    }

    await admin.firestore().collection(collection).doc(documentId).delete();
    
    res.json({ 
      success: true, 
      message: `Deleted ${collection}/${documentId}` 
    });
  } catch (error) {
    console.error('Firestore delete error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

router.post('/firestore/update', requireAdmin, async (req, res) => {
  try {
    const { collection, documentId, data } = req.body;
    
    if (!collection || !documentId || !data) {
      return res.status(400).json({ 
        success: false, 
        error: 'Collection, documentId, and data required' 
      });
    }

    await admin.firestore().collection(collection).doc(documentId).update(data);
    
    res.json({ 
      success: true, 
      message: `Updated ${collection}/${documentId}` 
    });
  } catch (error) {
    console.error('Firestore update error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;