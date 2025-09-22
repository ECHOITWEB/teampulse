const admin = require('firebase-admin');
const serviceAccount = require('./functions/teampulse-61474-firebase-adminsdk-fbsvc-a66de64bc4.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'teampulse-61474'
});

const db = admin.firestore();

async function checkAndTestOKR() {
  console.log('=== Checking Current OKR Data ===\n');
  
  try {
    // 1. Check all objectives
    console.log('📋 Fetching all objectives...');
    const objectivesSnapshot = await db.collection('objectives').get();
    console.log(`Found ${objectivesSnapshot.size} objectives\n`);
    
    let totalKeyResults = 0;
    const objectivesWithKR = [];
    
    // 2. Check key results for each objective
    for (const objDoc of objectivesSnapshot.docs) {
      const objective = objDoc.data();
      console.log(`\n🎯 Objective: "${objective.title}"`);
      console.log(`   ID: ${objDoc.id}`);
      console.log(`   Created by: ${objective.created_by}`);
      console.log(`   Year: ${objective.year}, Quarter: ${objective.quarter}`);
      
      // Get key results for this objective
      const krSnapshot = await db.collection('keyResults')
        .where('objective_id', '==', objDoc.id)
        .get();
      
      console.log(`   Key Results: ${krSnapshot.size}`);
      
      if (krSnapshot.size > 0) {
        objectivesWithKR.push({
          objectiveId: objDoc.id,
          objectiveTitle: objective.title,
          keyResults: []
        });
        
        krSnapshot.forEach(krDoc => {
          const kr = krDoc.data();
          totalKeyResults++;
          console.log(`      ✓ "${kr.title}" - Target: ${kr.target_value} ${kr.unit || ''}`);
          
          // Check if this is the SAP one
          if (kr.title && kr.title.includes('SAP')) {
            console.log(`      🔍 Found SAP-related KR: "${kr.title}"`);
          }
          
          objectivesWithKR[objectivesWithKR.length - 1].keyResults.push({
            id: krDoc.id,
            title: kr.title,
            target_value: kr.target_value,
            current_value: kr.current_value || 0,
            unit: kr.unit
          });
        });
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total Objectives: ${objectivesSnapshot.size}`);
    console.log(`   Total Key Results: ${totalKeyResults}`);
    console.log(`   Objectives with KRs: ${objectivesWithKR.length}`);
    
    // 3. Test adding a new Key Result
    console.log('\n=== Testing KR Addition ===\n');
    
    if (objectivesSnapshot.size > 0) {
      // Get the first objective to test with
      const testObjective = objectivesSnapshot.docs[0];
      const testObjectiveData = testObjective.data();
      
      console.log(`📝 Adding test KR to objective: "${testObjectiveData.title}"`);
      
      const newKR = {
        objective_id: testObjective.id,
        title: '테스트 KR - ' + new Date().toISOString(),
        description: 'System test KR',
        metric_type: 'percentage',
        start_value: 0,
        current_value: 25,
        target_value: 100,
        unit: '%',
        progress: 25,
        status: 'on_track',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const krRef = await db.collection('keyResults').add(newKR);
      console.log(`   ✅ Successfully added KR with ID: ${krRef.id}`);
      
      // Verify it was added
      const verifyKR = await krRef.get();
      if (verifyKR.exists) {
        console.log(`   ✅ Verified: KR exists in database`);
        console.log(`   Title: "${verifyKR.data().title}"`);
        
        // Clean up test KR
        await krRef.delete();
        console.log(`   🧹 Cleaned up test KR`);
      }
    } else {
      console.log('   ⚠️ No objectives found to test with');
    }
    
    // 4. Look specifically for SAP-related content
    console.log('\n=== Searching for SAP-related content ===\n');
    
    const sapSearch = await db.collection('keyResults')
      .get();
    
    let sapFound = false;
    sapSearch.forEach(doc => {
      const kr = doc.data();
      if (kr.title && (kr.title.includes('SAP') || kr.title.includes('sap'))) {
        sapFound = true;
        console.log(`🔍 Found SAP Key Result:`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   Title: "${kr.title}"`);
        console.log(`   Objective ID: ${kr.objective_id}`);
        console.log(`   Target: ${kr.target_value} ${kr.unit || ''}`);
      }
    });
    
    if (!sapFound) {
      console.log('   ℹ️ No SAP-related Key Results found in database');
    }
    
    console.log('\n✅ Check complete!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkAndTestOKR();