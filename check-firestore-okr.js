const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://teampulse-61474.firebaseio.com'
});

const db = admin.firestore();

async function checkOKRData() {
  console.log('=== Checking OKR Data in Firestore ===\n');
  
  try {
    // 1. Check objectives collection
    console.log('1. Checking objectives collection:');
    const objectivesSnapshot = await db.collection('objectives').limit(10).get();
    console.log(`   - Found ${objectivesSnapshot.size} objectives`);
    
    objectivesSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`   - Objective ID: ${doc.id}`);
      console.log(`     Title: ${data.title}`);
      console.log(`     Type: ${data.type}`);
      console.log(`     WorkspaceId: ${data.workspaceId}`);
      console.log(`     Progress: ${data.progress}%`);
      console.log(`     Status: ${data.status}`);
      console.log('');
    });
    
    // 2. Check specific problematic objective
    console.log('2. Checking specific objective (DCnLco462H7qB6QpuoQi):');
    const problemDoc = await db.collection('objectives').doc('DCnLco462H7qB6QpuoQi').get();
    if (problemDoc.exists) {
      console.log('   ✅ Document exists');
      console.log('   Data:', JSON.stringify(problemDoc.data(), null, 2));
    } else {
      console.log('   ❌ Document does NOT exist');
    }
    
    // 3. Check keyResults collection
    console.log('\n3. Checking keyResults collection:');
    const keyResultsSnapshot = await db.collection('keyResults').limit(10).get();
    console.log(`   - Found ${keyResultsSnapshot.size} key results`);
    
    // 4. Check for orphaned key results
    console.log('\n4. Checking for orphaned key results:');
    const allKRs = await db.collection('keyResults').get();
    const orphanedKRs = [];
    
    for (const krDoc of allKRs.docs) {
      const kr = krDoc.data();
      if (kr.objectiveId) {
        const objExists = await db.collection('objectives').doc(kr.objectiveId).get();
        if (!objExists.exists) {
          orphanedKRs.push({
            krId: krDoc.id,
            objectiveId: kr.objectiveId,
            title: kr.title
          });
        }
      }
    }
    
    if (orphanedKRs.length > 0) {
      console.log(`   ⚠️ Found ${orphanedKRs.length} orphaned key results:`);
      orphanedKRs.forEach(kr => {
        console.log(`   - KR ID: ${kr.krId}`);
        console.log(`     Missing Objective: ${kr.objectiveId}`);
        console.log(`     Title: ${kr.title}`);
      });
    } else {
      console.log('   ✅ No orphaned key results found');
    }
    
    // 5. Check for workspaces
    console.log('\n5. Checking workspaces:');
    const workspacesSnapshot = await db.collection('workspaces').limit(5).get();
    console.log(`   - Found ${workspacesSnapshot.size} workspaces`);
    workspacesSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`   - Workspace: ${data.name} (ID: ${doc.id})`);
    });
    
    // 6. Check company objectives (if any)
    console.log('\n6. Checking companyObjectives collection:');
    const companyObjSnapshot = await db.collection('companyObjectives').limit(5).get();
    console.log(`   - Found ${companyObjSnapshot.size} company objectives`);
    
    console.log('\n=== Check Complete ===');
    
  } catch (error) {
    console.error('Error checking Firestore:', error);
  } finally {
    // Cleanup
    await admin.app().delete();
  }
}

checkOKRData();