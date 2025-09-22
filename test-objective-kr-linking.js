const admin = require('firebase-admin');
const serviceAccount = require('./functions/teampulse-61474-firebase-adminsdk-fbsvc-a66de64bc4.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'teampulse-61474'
});

const db = admin.firestore();

async function testObjectiveKRLinking() {
  console.log('=== Testing Objective-KR Linking ===\n');
  
  try {
    // Step 1: Check existing objectives first
    console.log('📋 Step 1: Checking existing objectives...');
    const existingObjectives = await db.collection('objectives').get();
    console.log(`Found ${existingObjectives.size} existing objectives:`);
    
    const objectiveMap = {};
    existingObjectives.forEach(doc => {
      const data = doc.data();
      console.log(`  - "${data.title}" (ID: ${doc.id})`);
      objectiveMap[doc.id] = data.title;
    });
    
    // Step 2: Check orphaned KRs
    console.log('\n📋 Step 2: Checking for orphaned or mislinked KRs...');
    const allKRs = await db.collection('keyResults').get();
    console.log(`Total KRs in database: ${allKRs.size}`);
    
    const orphanedKRs = [];
    const krByObjective = {};
    
    allKRs.forEach(doc => {
      const kr = doc.data();
      const objId = kr.objective_id;
      
      if (!objectiveMap[objId]) {
        orphanedKRs.push({
          id: doc.id,
          title: kr.title,
          objective_id: objId
        });
      } else {
        if (!krByObjective[objId]) {
          krByObjective[objId] = [];
        }
        krByObjective[objId].push({
          id: doc.id,
          title: kr.title
        });
      }
    });
    
    if (orphanedKRs.length > 0) {
      console.log(`\n⚠️  Found ${orphanedKRs.length} orphaned KRs (linked to non-existent objectives):`);
      orphanedKRs.forEach(kr => {
        console.log(`  - "${kr.title}" linked to missing objective: ${kr.objective_id}`);
      });
    }
    
    console.log('\n📊 KRs grouped by objective:');
    Object.entries(krByObjective).forEach(([objId, krs]) => {
      console.log(`  Objective: "${objectiveMap[objId]}" (${objId})`);
      console.log(`    Has ${krs.length} KRs:`);
      krs.forEach(kr => {
        console.log(`      - ${kr.title}`);
      });
    });
    
    // Step 3: Create a new test objective
    console.log('\n=== Creating New Test Objective ===\n');
    
    const testObjective = {
      title: 'Q1 2025 테스트 목표 - ' + new Date().toISOString().split('T')[0],
      description: '5개의 KR이 올바르게 연결되는지 테스트',
      company_id: 'test-company',
      workspace_id: 'HN3inZSxFt74I4iF2dxX', // Your workspace ID
      year: 2025,
      quarter: 1,
      visibility: 'workspace',
      category: 'growth',
      status: 'active',
      progress: 0,
      created_by: 'system-test',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const objRef = await db.collection('objectives').add(testObjective);
    console.log(`✅ Created test objective: "${testObjective.title}"`);
    console.log(`   ID: ${objRef.id}\n`);
    
    // Step 4: Add 5 KRs to the same objective
    console.log('📝 Adding 5 KRs to the same objective...\n');
    
    const testKRs = [
      {
        title: 'KR 1: 매출 목표 달성',
        target_value: 1000000000,
        unit: '원'
      },
      {
        title: 'KR 2: 신규 고객 확보',
        target_value: 20,
        unit: '명'
      },
      {
        title: 'KR 3: 제품 출시',
        target_value: 3,
        unit: '개'
      },
      {
        title: 'KR 4: 팀원 교육 완료',
        target_value: 100,
        unit: '%'
      },
      {
        title: 'KR 5: 고객 만족도 향상',
        target_value: 95,
        unit: '%'
      }
    ];
    
    const addedKRIds = [];
    
    for (let i = 0; i < testKRs.length; i++) {
      const kr = testKRs[i];
      const krData = {
        objective_id: objRef.id, // All KRs linked to same objective
        title: kr.title,
        description: `Test KR ${i + 1}`,
        metric_type: kr.unit === '%' ? 'percentage' : kr.unit === '원' ? 'currency' : 'number',
        start_value: 0,
        current_value: 0,
        target_value: kr.target_value,
        unit: kr.unit,
        progress: 0,
        status: 'not_started',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const krRef = await db.collection('keyResults').add(krData);
      addedKRIds.push(krRef.id);
      console.log(`✅ Added KR ${i + 1}: "${kr.title}" (ID: ${krRef.id})`);
    }
    
    // Step 5: Verify all KRs are properly linked
    console.log('\n=== Verifying KR Linking ===\n');
    
    const verifyKRs = await db.collection('keyResults')
      .where('objective_id', '==', objRef.id)
      .get();
    
    console.log(`📊 Verification Results:`);
    console.log(`   Expected KRs: 5`);
    console.log(`   Found KRs: ${verifyKRs.size}`);
    
    if (verifyKRs.size === 5) {
      console.log(`   ✅ SUCCESS: All 5 KRs are properly linked to the objective!`);
      
      console.log('\n   Linked KRs:');
      verifyKRs.forEach(doc => {
        const kr = doc.data();
        console.log(`     - ${kr.title} (${kr.target_value} ${kr.unit})`);
      });
    } else {
      console.log(`   ❌ ERROR: Expected 5 KRs but found ${verifyKRs.size}`);
      
      // Check what went wrong
      console.log('\n   Debugging info:');
      console.log(`   Added KR IDs: ${addedKRIds.join(', ')}`);
      
      for (const krId of addedKRIds) {
        const krDoc = await db.collection('keyResults').doc(krId).get();
        if (krDoc.exists) {
          const data = krDoc.data();
          console.log(`     KR ${krId}: objective_id = ${data.objective_id}`);
        } else {
          console.log(`     KR ${krId}: NOT FOUND`);
        }
      }
    }
    
    // Step 6: Check if there are any duplicate objectives with same title
    console.log('\n=== Checking for Duplicate Objectives ===\n');
    
    const allObjectives = await db.collection('objectives').get();
    const titleCount = {};
    
    allObjectives.forEach(doc => {
      const title = doc.data().title;
      if (!titleCount[title]) {
        titleCount[title] = [];
      }
      titleCount[title].push(doc.id);
    });
    
    const duplicates = Object.entries(titleCount).filter(([title, ids]) => ids.length > 1);
    
    if (duplicates.length > 0) {
      console.log('⚠️  Found duplicate objectives with same title:');
      duplicates.forEach(([title, ids]) => {
        console.log(`   "${title}" has ${ids.length} copies:`);
        ids.forEach(id => console.log(`     - ${id}`));
      });
    } else {
      console.log('✅ No duplicate objectives found');
    }
    
    // Step 7: Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    
    // Delete test KRs
    for (const krId of addedKRIds) {
      await db.collection('keyResults').doc(krId).delete();
    }
    console.log(`   Deleted ${addedKRIds.length} test KRs`);
    
    // Delete test objective
    await db.collection('objectives').doc(objRef.id).delete();
    console.log(`   Deleted test objective`);
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testObjectiveKRLinking();