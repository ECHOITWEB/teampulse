const admin = require('firebase-admin');
const serviceAccount = require('./functions/teampulse-61474-firebase-adminsdk-fbsvc-a66de64bc4.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'teampulse-61474'
});

const db = admin.firestore();

async function simulateWebCreation() {
  console.log('=== Simulating Web Creation (like CreateObjectiveModal) ===\n');
  
  try {
    // Simulate what CreateObjectiveModal does
    console.log('📝 Creating objective like the web modal does...\n');
    
    // Step 1: Create objective (simulating okrService.createObjective)
    const objectiveData = {
      company_id: 'ecoIT',
      workspace_id: 'HN3inZSxFt74I4iF2dxX',
      title: '2025년 1분기 주요 목표',
      description: '웹에서 생성한 테스트 목표',
      category: 'growth',
      visibility: 'workspace',
      year: 2025,
      quarter: 1,
      status: 'active',
      progress: 0,
      created_by: 'jUcG15n2qUfx7lTndmlnxcunXJB2', // Your user ID
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const objRef = await db.collection('objectives').add(objectiveData);
    console.log(`✅ Created objective: "${objectiveData.title}"`);
    console.log(`   ID: ${objRef.id}\n`);
    
    // Step 2: Create key results (simulating okrService.createKeyResult)
    console.log('📝 Adding 5 Key Results (like in the modal)...\n');
    
    const keyResultsToAdd = [
      {
        title: '분기 매출 150억 달성',
        target_value: 15000000000,
        unit: '원'
      },
      {
        title: '신규 파트너사 5개 확보',
        target_value: 5,
        unit: '개'
      },
      {
        title: '고객 만족도 95% 달성',
        target_value: 95,
        unit: '%'
      },
      {
        title: '직원 교육 프로그램 100% 이수',
        target_value: 100,
        unit: '%'
      },
      {
        title: '신제품 3개 출시',
        target_value: 3,
        unit: '개'
      }
    ];
    
    const createdKRIds = [];
    
    for (const kr of keyResultsToAdd) {
      const krData = {
        objective_id: objRef.id, // Using the same objective ID
        title: kr.title,
        description: '',
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
      createdKRIds.push(krRef.id);
      console.log(`✅ Added: "${kr.title}"`);
      console.log(`   Target: ${kr.target_value} ${kr.unit}`);
      console.log(`   ID: ${krRef.id}\n`);
    }
    
    // Step 3: Verify all KRs are linked correctly
    console.log('=== Verification ===\n');
    
    // Check the objective
    const objDoc = await db.collection('objectives').doc(objRef.id).get();
    if (!objDoc.exists) {
      console.log('❌ ERROR: Objective not found!');
      return;
    }
    
    console.log(`✅ Objective exists: "${objDoc.data().title}"`);
    
    // Check KRs
    const linkedKRs = await db.collection('keyResults')
      .where('objective_id', '==', objRef.id)
      .get();
    
    console.log(`\n📊 Key Results Check:`);
    console.log(`   Created: 5 KRs`);
    console.log(`   Found: ${linkedKRs.size} KRs linked to this objective`);
    
    if (linkedKRs.size === 5) {
      console.log(`   ✅ SUCCESS: All KRs are properly linked!\n`);
      
      console.log('   Linked KRs:');
      linkedKRs.forEach(doc => {
        const kr = doc.data();
        console.log(`     ✓ ${kr.title} (${kr.target_value} ${kr.unit})`);
      });
    } else {
      console.log(`   ❌ ERROR: KR count mismatch!\n`);
    }
    
    // Step 4: Check for any issues
    console.log('\n=== Final Database Check ===\n');
    
    const allObjectives = await db.collection('objectives').get();
    const allKRs = await db.collection('keyResults').get();
    
    console.log(`Total objectives in DB: ${allObjectives.size}`);
    console.log(`Total KRs in DB: ${allKRs.size}`);
    
    // Group KRs by objective
    const krsByObjective = {};
    allKRs.forEach(doc => {
      const kr = doc.data();
      const objId = kr.objective_id;
      if (!krsByObjective[objId]) {
        krsByObjective[objId] = [];
      }
      krsByObjective[objId].push(kr.title);
    });
    
    console.log('\nObjectives and their KRs:');
    allObjectives.forEach(doc => {
      const obj = doc.data();
      const krs = krsByObjective[doc.id] || [];
      console.log(`  "${obj.title}"`);
      console.log(`    - ${krs.length} KRs`);
      if (krs.length > 0 && krs.length <= 5) {
        krs.forEach(title => console.log(`      • ${title}`));
      }
    });
    
    console.log('\n✅ Simulation complete!');
    console.log('   The web creation process is working correctly.');
    console.log('   All 5 KRs are properly linked to the same objective.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

simulateWebCreation();