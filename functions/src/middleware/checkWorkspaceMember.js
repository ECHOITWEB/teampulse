const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Middleware to check if user is a member of the workspace
 * Works with channels that have workspaceId
 */
const checkWorkspaceMember = async (req, res, next) => {
  try {
    const userId = req.user?.uid;
    const { channelId } = req.body || req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!channelId) {
      // If no channelId, skip check (some endpoints don't need it)
      return next();
    }
    
    // Get channel to find workspace
    const channelDoc = await db.collection('channels').doc(channelId).get();
    
    if (!channelDoc.exists) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    const channel = channelDoc.data();
    const workspaceId = channel.workspaceId;
    
    if (!workspaceId) {
      // If channel has no workspace, allow access (shouldn't happen)
      console.warn(`Channel ${channelId} has no workspaceId`);
      return next();
    }
    
    // Check if user is a workspace member
    const memberDoc = await db
      .collection('workspace_members')
      .where('workspace_id', '==', workspaceId)
      .where('user_id', '==', userId)
      .where('status', '==', 'active')
      .limit(1)
      .get();
    
    if (memberDoc.empty) {
      console.log(`❌ User ${userId} is not a member of workspace ${workspaceId}`);
      return res.status(403).json({ 
        error: 'You are not a member of this workspace' 
      });
    }
    
    // Add workspace and channel info to request
    req.workspace = { id: workspaceId };
    req.channel = channel;
    req.memberRole = memberDoc.docs[0].data().role;
    
    console.log(`✅ User ${userId} authorized for workspace ${workspaceId}`);
    next();
  } catch (error) {
    console.error('Error checking workspace membership:', error);
    res.status(500).json({ 
      error: 'Failed to verify workspace membership' 
    });
  }
};

module.exports = checkWorkspaceMember;