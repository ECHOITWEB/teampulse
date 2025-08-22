const admin = require('firebase-admin');
const { query, get, create, update, collections, db } = require('../utils/firestore');

// Sync user from Firebase
const syncUser = async (req, res) => {
  try {
    const { firebase_uid, email, name, avatar_url } = req.body;

    // Check if user exists
    const users = await query(collections.users, [
      { field: 'firebase_uid', operator: '==', value: firebase_uid }
    ]);

    let user;
    if (users.length === 0) {
      // Create new user
      user = await create(collections.users, {
        firebase_uid,
        email,
        name: name || email.split('@')[0],
        avatar_url: avatar_url || null,
        is_email_verified: true,
        status: 'active',
        role: 'user'
      });
    } else {
      user = users[0];
      
      // Update user info if changed
      const updates = {};
      if (name && name !== user.name) updates.name = name;
      if (avatar_url && avatar_url !== user.avatar_url) updates.avatar_url = avatar_url;
      
      if (Object.keys(updates).length > 0) {
        await update(collections.users, user.id, {
          ...updates,
          last_login_at: admin.firestore.FieldValue.serverTimestamp()
        });
        user = { ...user, ...updates };
      }
    }

    res.json({ user });
  } catch (error) {
    console.error('Sync user error:', error);
    res.status(500).json({ error: 'Failed to sync user' });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user data
    const user = await get(collections.users, userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's workspace memberships
    const memberships = await query(collections.workspace_members, [
      { field: 'user_id', operator: '==', value: userId },
      { field: 'status', operator: '==', value: 'active' }
    ], { field: 'joined_at', direction: 'desc' }, 5);

    // Get workspace details
    const workspacePromises = memberships.map(async (membership) => {
      const workspace = await get(collections.workspaces, membership.workspace_id);
      return {
        ...workspace,
        role: membership.role
      };
    });

    const recent_workspaces = await Promise.all(workspacePromises);
    
    res.json({ 
      user: {
        ...user,
        workspace_count: memberships.length,
        recent_workspaces
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, timezone, locale } = req.body;

    const updates = {};
    
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (timezone !== undefined) updates.timezone = timezone;
    if (locale !== undefined) updates.locale = locale;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    await update(collections.users, userId, updates);

    // Get updated user
    const updatedUser = await get(collections.users, userId);

    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Delete user account
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const firebaseUid = req.user.firebase_uid;

    // Check if user owns any workspaces
    const ownedWorkspaces = await query(collections.workspaces, [
      { field: 'owner_id', operator: '==', value: userId }
    ]);

    if (ownedWorkspaces.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete account while owning workspaces',
        owned_workspaces: ownedWorkspaces.map(w => ({ id: w.id, name: w.name }))
      });
    }

    // Use batch to delete all related data
    const batch = db.batch();

    // Remove user from all workspaces
    const memberships = await query(collections.workspace_members, [
      { field: 'user_id', operator: '==', value: userId }
    ]);
    
    memberships.forEach(membership => {
      batch.delete(db.collection(collections.workspace_members).doc(membership.id));
    });

    // Delete user notifications
    const notifications = await query(collections.notifications, [
      { field: 'user_id', operator: '==', value: userId }
    ]);
    
    notifications.forEach(notification => {
      batch.delete(db.collection(collections.notifications).doc(notification.id));
    });

    // Delete user document
    batch.delete(db.collection(collections.users).doc(userId));

    // Commit all deletions
    await batch.commit();

    // Delete from Firebase Auth
    try {
      await admin.auth().deleteUser(firebaseUid);
    } catch (authError) {
      console.error('Failed to delete Firebase Auth user:', authError);
      // Continue even if Firebase Auth deletion fails
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

module.exports = {
  syncUser,
  getCurrentUser,
  updateProfile,
  deleteAccount
};