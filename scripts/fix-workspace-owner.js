// Script to check and fix workspace owner role
const admin = require('firebase-admin');
const serviceAccount = require('../backend/teampulse-61474-firebase-adminsdk-fbsvc-a66de64bc4.json');

// Initialize admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkAndFixWorkspaceOwner() {
  const workspaceId = 'iOJ7UlR1eG60bVGrvXUQ';
  
  try {
    // 1. Get workspace details
    console.log('Checking workspace:', workspaceId);
    const workspaceDoc = await db.collection('workspaces').doc(workspaceId).get();
    
    if (!workspaceDoc.exists) {
      console.error('Workspace not found!');
      return;
    }
    
    const workspaceData = workspaceDoc.data();
    console.log('Workspace name:', workspaceData.name);
    console.log('Workspace owner_id:', workspaceData.owner_id);
    
    // 2. Check workspace_members for the owner
    const membersSnapshot = await db.collection('workspace_members')
      .where('workspace_id', '==', workspaceId)
      .where('user_id', '==', workspaceData.owner_id)
      .get();
    
    if (membersSnapshot.empty) {
      console.log('Owner not found in workspace_members! Creating member record...');
      
      // Get owner user data
      const ownerDoc = await db.collection('users').doc(workspaceData.owner_id).get();
      
      if (ownerDoc.exists) {
        const ownerData = ownerDoc.data();
        
        // Create owner member record
        await db.collection('workspace_members').add({
          workspace_id: workspaceId,
          user_id: workspaceData.owner_id,
          role: 'owner',
          status: 'active',
          joined_at: admin.firestore.FieldValue.serverTimestamp(),
          user_email: ownerData.email,
          user_name: ownerData.display_name || ownerData.email
        });
        
        console.log('✅ Created owner member record');
      } else {
        console.error('Owner user document not found!');
      }
    } else {
      // Check if the role is correct
      const memberDoc = membersSnapshot.docs[0];
      const memberData = memberDoc.data();
      
      console.log('Found member record:');
      console.log('- Member ID:', memberDoc.id);
      console.log('- Current role:', memberData.role);
      console.log('- Status:', memberData.status);
      
      if (memberData.role !== 'owner') {
        console.log('Role is incorrect! Fixing...');
        
        await db.collection('workspace_members').doc(memberDoc.id).update({
          role: 'owner',
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Updated role to owner');
      } else {
        console.log('✅ Role is already correct');
      }
      
      if (memberData.status !== 'active') {
        console.log('Status is not active! Fixing...');
        
        await db.collection('workspace_members').doc(memberDoc.id).update({
          status: 'active',
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Updated status to active');
      }
    }
    
    // 3. List all members to verify
    console.log('\n📋 All workspace members:');
    const allMembersSnapshot = await db.collection('workspace_members')
      .where('workspace_id', '==', workspaceId)
      .where('status', '==', 'active')
      .get();
    
    allMembersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.user_email || 'Unknown'}: ${data.role} (ID: ${data.user_id})`);
    });
    
    console.log('\n✅ Check complete!');
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkAndFixWorkspaceOwner();