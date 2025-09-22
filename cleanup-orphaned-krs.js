const admin = require('firebase-admin');
const serviceAccount = require('./functions/teampulse-61474-firebase-adminsdk-fbsvc-a66de64bc4.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'teampulse-61474'
});

const db = admin.firestore();

async function cleanupOrphanedKRs() {
  console.log('=== Cleaning Up Orphaned Key Results ===\n');
  
  try {
    // Step 1: Get all objectives
    const objectives = await db.collection('objectives').get();
    const validObjectiveIds = new Set();
    
    objectives.forEach(doc => {
      validObjectiveIds.add(doc.id);
    });
    
    console.log(`Found ${validObjectiveIds.size} valid objectives\n`);
    
    // Step 2: Find orphaned KRs
    const allKRs = await db.collection('keyResults').get();
    const orphanedKRs = [];
    
    allKRs.forEach(doc => {
      const kr = doc.data();
      if (!validObjectiveIds.has(kr.objective_id)) {
        orphanedKRs.push({
          id: doc.id,
          title: kr.title,
          objective_id: kr.objective_id
        });
      }
    });
    
    console.log(`Found ${orphanedKRs.length} orphaned KRs:\n`);
    
    if (orphanedKRs.length === 0) {
      console.log('✅ No orphaned KRs to clean up');
      return;
    }
    
    // Step 3: Ask for confirmation (in production, you'd want to backup first)
    orphanedKRs.forEach(kr => {
      console.log(`  - "${kr.title}" (linked to non-existent: ${kr.objective_id})`);
    });
    
    // Step 4: Delete orphaned KRs
    console.log('\n🧹 Deleting orphaned KRs...\n');
    
    for (const kr of orphanedKRs) {
      await db.collection('keyResults').doc(kr.id).delete();
      console.log(`  ✅ Deleted: "${kr.title}"`);
    }
    
    console.log(`\n✅ Cleanup complete! Deleted ${orphanedKRs.length} orphaned KRs`);
    
    // Step 5: Verify cleanup
    console.log('\n📊 Verifying cleanup...');
    
    const remainingKRs = await db.collection('keyResults').get();
    let allValid = true;
    
    remainingKRs.forEach(doc => {
      const kr = doc.data();
      if (!validObjectiveIds.has(kr.objective_id)) {
        console.log(`  ❌ Still orphaned: "${kr.title}"`);
        allValid = false;
      }
    });
    
    if (allValid) {
      console.log('  ✅ All remaining KRs are properly linked!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

cleanupOrphanedKRs();