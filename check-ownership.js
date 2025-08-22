const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./teampulse-61474-firebase-adminsdk-7b3w1-f7e5af5f5e.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://teampulse-61474.firebaseio.com"
});

const db = admin.firestore();

async function checkWorkspaceOwnership() {
  try {
    // Find ECHOIT-사업기획본부 workspace
    const workspacesRef = db.collection('workspaces');
    const snapshot = await workspacesRef
      .where('company_name', '==', 'ECHOIT')
      .where('name', '==', '사업기획본부')
      .get();

    if (snapshot.empty) {
      console.log('No workspace found with name ECHOIT-사업기획본부');
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('\n=== Workspace Details ===');
      console.log('Workspace ID:', doc.id);
      console.log('Company Name:', data.company_name);
      console.log('Workspace Name:', data.name);
      console.log('Full Name:', data.full_name);
      console.log('Owner ID:', data.owner_id);
      console.log('Created At:', data.created_at?.toDate());
      
      // Check workspace members
      checkWorkspaceMembers(doc.id);
    });

    // Check users collection
    console.log('\n=== Registered Users ===');
    const usersSnapshot = await db.collection('users').get();
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      console.log(`\nUser ID: ${doc.id}`);
      console.log(`Email: ${userData.email}`);
      console.log(`Name: ${userData.name || userData.display_name || 'N/A'}`);
    });

  } catch (error) {
    console.error('Error checking workspace:', error);
  }
}

async function checkWorkspaceMembers(workspaceId) {
  try {
    const membersRef = db.collection('workspace_members');
    const snapshot = await membersRef
      .where('workspace_id', '==', workspaceId)
      .get();

    console.log('\n=== Workspace Members ===');
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`\nMember: ${data.user_name || data.display_name}`);
      console.log(`User ID: ${data.user_id}`);
      console.log(`Role: ${data.role}`);
      console.log(`Status: ${data.status}`);
      console.log(`Joined: ${data.joined_at?.toDate()}`);
    });
  } catch (error) {
    console.error('Error checking members:', error);
  }
}

checkWorkspaceOwnership().then(() => {
  console.log('\n=== Check Complete ===');
  process.exit(0);
});