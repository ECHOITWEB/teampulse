const admin = require('firebase-admin');
const serviceAccount = require('./functions/teampulse-61474-firebase-adminsdk-fbsvc-a66de64bc4.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'teampulse-61474'
});

const db = admin.firestore();

async function addKeyResults() {
  console.log('=== Adding Key Results to Objectives ===\n');
  
  try {
    // Find the objective
    const objectiveId = '3ou2rIkwuZB45QLndhU3'; // 에코아이티 매출 500억 달성
    
    console.log('📝 Adding Key Results to "에코아이티 매출 500억 달성"...\n');
    
    // Define Key Results
    const keyResults = [
      {
        objective_id: objectiveId,
        title: 'SAP 사업부문 매출 200억 달성',
        description: 'SAP 관련 프로젝트 및 서비스 매출 목표',
        metric_type: 'currency',
        start_value: 0,
        current_value: 8500000000, // 85억
        target_value: 20000000000, // 200억
        unit: '원',
        progress: 42.5,
        status: 'on_track',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        objective_id: objectiveId,
        title: '신규 고객사 10개 확보',
        description: '대기업 및 중견기업 신규 고객사 확보',
        metric_type: 'number',
        start_value: 0,
        current_value: 4,
        target_value: 10,
        unit: '개사',
        progress: 40,
        status: 'on_track',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        objective_id: objectiveId,
        title: '클라우드 전환 프로젝트 15건 완료',
        description: '기업 클라우드 마이그레이션 프로젝트',
        metric_type: 'number',
        start_value: 0,
        current_value: 6,
        target_value: 15,
        unit: '건',
        progress: 40,
        status: 'on_track',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        objective_id: objectiveId,
        title: '직원 만족도 90% 이상 달성',
        description: '직원 만족도 조사 결과 향상',
        metric_type: 'percentage',
        start_value: 75,
        current_value: 82,
        target_value: 90,
        unit: '%',
        progress: 91,
        status: 'on_track',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      }
    ];
    
    // Add each Key Result
    for (const kr of keyResults) {
      const krRef = await db.collection('keyResults').add(kr);
      console.log(`✅ Added: "${kr.title}"`);
      console.log(`   ID: ${krRef.id}`);
      console.log(`   Progress: ${kr.progress}%`);
      console.log(`   Current: ${kr.current_value} / Target: ${kr.target_value} ${kr.unit}\n`);
    }
    
    // Update the objective with calculated progress
    const avgProgress = keyResults.reduce((sum, kr) => sum + kr.progress, 0) / keyResults.length;
    await db.collection('objectives').doc(objectiveId).update({
      progress: Math.round(avgProgress),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`📊 Updated objective progress to ${Math.round(avgProgress)}%`);
    
    // Verify the additions
    console.log('\n=== Verifying Key Results ===\n');
    const krSnapshot = await db.collection('keyResults')
      .where('objective_id', '==', objectiveId)
      .get();
    
    console.log(`✅ Total Key Results for this objective: ${krSnapshot.size}`);
    
    krSnapshot.forEach(doc => {
      const kr = doc.data();
      console.log(`   • ${kr.title}: ${kr.current_value}/${kr.target_value} ${kr.unit}`);
    });
    
    console.log('\n✅ Key Results added successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

addKeyResults();