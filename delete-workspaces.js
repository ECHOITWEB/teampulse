const admin = require('firebase-admin');

// Firebase Admin SDK 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "teampulse-61474",
  });
}

const db = admin.firestore();

async function deleteWorkspacesAndFixOwnership() {
  try {
    console.log('=== Workspace Cleanup Script ===\n');
    
    // 1. 모든 워크스페이스 조회
    const workspacesRef = db.collection('workspaces');
    const snapshot = await workspacesRef.get();
    
    console.log(`Found ${snapshot.size} workspaces\n`);
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      console.log(`\n--- Workspace: ${data.full_name || data.name} ---`);
      console.log(`ID: ${doc.id}`);
      console.log(`Company: ${data.company_name}`);
      console.log(`Name: ${data.name}`);
      console.log(`Owner ID: ${data.owner_id}`);
      
      // 2. 해당 워크스페이스의 멤버 확인
      const membersRef = db.collection('workspace_members');
      const membersSnapshot = await membersRef
        .where('workspace_id', '==', doc.id)
        .get();
      
      console.log(`Members: ${membersSnapshot.size}`);
      
      if (membersSnapshot.size === 0) {
        console.log('⚠️  No members found - This workspace should be deleted');
        
        // 3. 멤버가 없는 워크스페이스 삭제
        console.log('Deleting workspace...');
        await doc.ref.delete();
        console.log('✅ Workspace deleted');
        
        // 4. 관련 채널도 삭제
        const channelsRef = db.collection('channels');
        const channelsSnapshot = await channelsRef
          .where('workspace_id', '==', doc.id)
          .get();
        
        for (const channelDoc of channelsSnapshot.docs) {
          await channelDoc.ref.delete();
        }
        console.log(`✅ Deleted ${channelsSnapshot.size} channels`);
        
      } else {
        // 멤버가 있는 경우 상세 정보 출력
        console.log('\nMembers:');
        membersSnapshot.forEach(memberDoc => {
          const member = memberDoc.data();
          console.log(`  - ${member.user_name || member.display_name} (${member.user_id}) - Role: ${member.role}`);
        });
        
        // 오너가 제대로 설정되어 있는지 확인
        const ownerMember = membersSnapshot.docs.find(
          doc => doc.data().role === 'owner'
        );
        
        if (!ownerMember) {
          console.log('⚠️  No owner found in members!');
        } else if (ownerMember.data().user_id !== data.owner_id) {
          console.log('⚠️  Owner mismatch between workspace and members!');
        }
      }
    }
    
    console.log('\n=== Cleanup Complete ===');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// 스크립트 실행
deleteWorkspacesAndFixOwnership().then(() => {
  process.exit(0);
});