const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, '..', 'teampulse-61474-firebase-adminsdk.json');

try {
  const serviceAccount = require(serviceAccountPath);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://teampulse-61474.firebaseio.com"
  });
  
  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
  console.log('Please ensure teampulse-61474-firebase-adminsdk.json exists in the project root');
  process.exit(1);
}

const db = admin.firestore();

async function cleanupDummyOKRs() {
  console.log('🧹 Starting cleanup of dummy OKR data...\n');
  
  try {
    // Get all objectives
    const objectivesSnapshot = await db.collection('objectives').get();
    console.log(`Found ${objectivesSnapshot.size} total objectives`);
    
    let deletedCount = 0;
    const batch = db.batch();
    
    for (const doc of objectivesSnapshot.docs) {
      const data = doc.data();
      
      // Delete objectives that look like test/dummy data
      const isDummy = (
        data.title?.toLowerCase().includes('test') ||
        data.title?.toLowerCase().includes('dummy') ||
        data.title?.toLowerCase().includes('example') ||
        data.title?.includes('신규 고객') ||
        data.title?.includes('월간 활성') ||
        data.title?.includes('NPS') ||
        data.title?.includes('시스템 안정성') ||
        data.title?.includes('모바일 앱') ||
        data.title?.includes('자동화') ||
        data.title?.includes('비용 절감') ||
        data.title?.includes('파트너십') ||
        data.title?.includes('직원 만족도') ||
        data.title?.includes('테스트') ||
        !data.createdBy // No creator means it's probably dummy data
      );
      
      if (isDummy) {
        console.log(`  🗑️  Deleting: ${data.title} (${doc.id})`);
        batch.delete(doc.ref);
        deletedCount++;
        
        // Also delete associated key results
        const keyResultsSnapshot = await db.collection('keyResults')
          .where('objectiveId', '==', doc.id)
          .get();
        
        for (const krDoc of keyResultsSnapshot.docs) {
          batch.delete(krDoc.ref);
        }
      }
    }
    
    if (deletedCount > 0) {
      await batch.commit();
      console.log(`\n✅ Successfully deleted ${deletedCount} dummy objectives and their key results`);
    } else {
      console.log('\n✅ No dummy objectives found to delete');
    }
    
    // Show remaining objectives
    const remainingSnapshot = await db.collection('objectives').get();
    console.log(`\n📊 Remaining objectives: ${remainingSnapshot.size}`);
    
    if (remainingSnapshot.size > 0) {
      console.log('\nRemaining objectives:');
      remainingSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${data.title} (Type: ${data.type}, Company: ${data.companyId || 'N/A'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
  
  process.exit(0);
}

cleanupDummyOKRs();