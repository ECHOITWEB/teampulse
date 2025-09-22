const admin = require('firebase-admin');
const serviceAccount = require('./functions/teampulse-61474-firebase-adminsdk-fbsvc-a66de64bc4.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'teampulse-61474'
});

const db = admin.firestore();

async function testCompanyIsolation() {
  console.log('=== Testing Company/Workspace Isolation ===\n');
  
  try {
    // Step 1: Check current data structure
    console.log('📋 Step 1: Analyzing current data structure...\n');
    
    const objectives = await db.collection('objectives').get();
    const workspaces = await db.collection('workspaces').get();
    
    console.log(`Found ${objectives.size} objectives`);
    console.log(`Found ${workspaces.size} workspaces\n`);
    
    // Map objectives by workspace
    const objectivesByWorkspace = {};
    const objectivesByCompany = {};
    
    objectives.forEach(doc => {
      const obj = doc.data();
      const wsId = obj.workspace_id || 'NO_WORKSPACE';
      const compId = obj.company_id || 'NO_COMPANY';
      
      if (!objectivesByWorkspace[wsId]) {
        objectivesByWorkspace[wsId] = [];
      }
      if (!objectivesByCompany[compId]) {
        objectivesByCompany[compId] = [];
      }
      
      objectivesByWorkspace[wsId].push({
        id: doc.id,
        title: obj.title,
        company_id: obj.company_id,
        workspace_id: obj.workspace_id,
        visibility: obj.visibility
      });
      
      objectivesByCompany[compId].push({
        id: doc.id,
        title: obj.title,
        company_id: obj.company_id,
        workspace_id: obj.workspace_id,
        visibility: obj.visibility
      });
    });
    
    console.log('📊 Objectives grouped by workspace:');
    Object.entries(objectivesByWorkspace).forEach(([wsId, objs]) => {
      console.log(`  Workspace ${wsId}: ${objs.length} objectives`);
      objs.forEach(obj => {
        console.log(`    - "${obj.title}"`);
        console.log(`      Company: ${obj.company_id || 'none'}, Visibility: ${obj.visibility || 'unknown'}`);
      });
    });
    
    console.log('\n📊 Objectives grouped by company:');
    Object.entries(objectivesByCompany).forEach(([compId, objs]) => {
      console.log(`  Company ${compId}: ${objs.length} objectives`);
    });
    
    // Step 2: Simulate creating objectives for different companies
    console.log('\n=== Step 2: Creating test objectives for different companies ===\n');
    
    // Create test company A objective
    const companyAObjective = {
      company_id: 'test-company-A',
      workspace_id: 'workspace-A-main',
      title: 'Company A - Q1 목표',
      description: 'Company A만 볼 수 있는 목표',
      visibility: 'workspace',
      category: 'growth',
      year: 2025,
      quarter: 1,
      status: 'active',
      progress: 0,
      created_by: 'test-user-A',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const objARef = await db.collection('objectives').add(companyAObjective);
    console.log(`✅ Created Company A objective: "${companyAObjective.title}"`);
    console.log(`   ID: ${objARef.id}`);
    console.log(`   Company: ${companyAObjective.company_id}`);
    console.log(`   Workspace: ${companyAObjective.workspace_id}\n`);
    
    // Create test company B objective
    const companyBObjective = {
      company_id: 'test-company-B',
      workspace_id: 'workspace-B-main',
      title: 'Company B - Q1 목표',
      description: 'Company B만 볼 수 있는 목표',
      visibility: 'workspace',
      category: 'revenue',
      year: 2025,
      quarter: 1,
      status: 'active',
      progress: 0,
      created_by: 'test-user-B',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const objBRef = await db.collection('objectives').add(companyBObjective);
    console.log(`✅ Created Company B objective: "${companyBObjective.title}"`);
    console.log(`   ID: ${objBRef.id}`);
    console.log(`   Company: ${companyBObjective.company_id}`);
    console.log(`   Workspace: ${companyBObjective.workspace_id}\n`);
    
    // Step 3: Test isolation - query as if we're in Company A
    console.log('=== Step 3: Testing isolation (querying as Company A) ===\n');
    
    const companyAQuery = await db.collection('objectives')
      .where('workspace_id', '==', 'workspace-A-main')
      .get();
    
    console.log(`Company A workspace query results: ${companyAQuery.size} objectives`);
    companyAQuery.forEach(doc => {
      const obj = doc.data();
      console.log(`  ✓ "${obj.title}"`);
      if (obj.company_id !== 'test-company-A') {
        console.log(`    ⚠️ WARNING: Found objective from different company: ${obj.company_id}`);
      }
    });
    
    // Step 4: Test isolation - query as if we're in Company B
    console.log('\n=== Step 4: Testing isolation (querying as Company B) ===\n');
    
    const companyBQuery = await db.collection('objectives')
      .where('workspace_id', '==', 'workspace-B-main')
      .get();
    
    console.log(`Company B workspace query results: ${companyBQuery.size} objectives`);
    companyBQuery.forEach(doc => {
      const obj = doc.data();
      console.log(`  ✓ "${obj.title}"`);
      if (obj.company_id !== 'test-company-B') {
        console.log(`    ⚠️ WARNING: Found objective from different company: ${obj.company_id}`);
      }
    });
    
    // Step 5: Check for any cross-contamination
    console.log('\n=== Step 5: Checking for cross-contamination ===\n');
    
    const allObjectivesNow = await db.collection('objectives').get();
    let crossContamination = false;
    
    allObjectivesNow.forEach(doc => {
      const obj = doc.data();
      // Check if workspace_id and company_id are consistent
      if (obj.workspace_id && obj.company_id) {
        // This is a simple check - in reality you'd verify against actual workspace records
        if (obj.workspace_id.includes('A') && obj.company_id.includes('B')) {
          console.log(`⚠️ ISSUE: Objective "${obj.title}" has mismatched workspace/company`);
          crossContamination = true;
        }
        if (obj.workspace_id.includes('B') && obj.company_id.includes('A')) {
          console.log(`⚠️ ISSUE: Objective "${obj.title}" has mismatched workspace/company`);
          crossContamination = true;
        }
      }
    });
    
    if (!crossContamination) {
      console.log('✅ No cross-contamination detected!');
      console.log('   Each company\'s objectives are properly isolated.');
    }
    
    // Step 6: Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    
    await db.collection('objectives').doc(objARef.id).delete();
    await db.collection('objectives').doc(objBRef.id).delete();
    console.log('   Deleted test objectives');
    
    // Step 7: Final recommendations
    console.log('\n=== Recommendations ===\n');
    
    const hasWorkspaceId = objectives.docs.every(doc => doc.data().workspace_id);
    const hasCompanyId = objectives.docs.every(doc => doc.data().company_id);
    
    if (!hasWorkspaceId) {
      console.log('⚠️ Some objectives are missing workspace_id');
      console.log('   This could cause data leaks between workspaces');
    } else {
      console.log('✅ All objectives have workspace_id');
    }
    
    if (!hasCompanyId) {
      console.log('⚠️ Some objectives are missing company_id');
      console.log('   This could cause issues with company-level reporting');
    } else {
      console.log('✅ All objectives have company_id');
    }
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testCompanyIsolation();