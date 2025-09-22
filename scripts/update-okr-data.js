const admin = require('firebase-admin');
const serviceAccount = require('../teampulse-61474-firebase-adminsdk-5y0o3-cd24b42e27.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://teampulse-61474.firebaseio.com'
});

const db = admin.firestore();

async function cleanAndUpdateOKRs() {
  try {
    // Get workspace ID
    const workspacesSnapshot = await db.collection('workspaces').limit(1).get();
    if (workspacesSnapshot.empty) {
      console.log('No workspace found');
      return;
    }
    
    const workspaceId = workspacesSnapshot.docs[0].id;
    console.log('Using workspace:', workspaceId);
    
    // Step 1: Delete duplicate objectives for 2025 Q1
    console.log('Cleaning up duplicate objectives...');
    const q1Objectives = await db.collection('objectives')
      .where('workspaceId', '==', workspaceId)
      .where('year', '==', 2025)
      .where('quarter', '==', 'Q1')
      .get();
    
    // Keep only the first one, delete the rest
    const objectivesToDelete = q1Objectives.docs.slice(1);
    for (const doc of objectivesToDelete) {
      await doc.ref.delete();
      console.log(`Deleted duplicate objective: ${doc.id}`);
    }
    
    // Step 2: Add new objectives for Q3 and Q4 2025
    const newObjectives = [
      // Q3 2025 - ESGO Platform
      {
        title: 'ESGO 플랫폼 글로벌 확장',
        description: 'ESGO ESG 관리 플랫폼의 글로벌 시장 진출 및 사용자 확대',
        quarter: 'Q3',
        year: 2025,
        workspaceId: workspaceId,
        progress: 42,
        status: 'at_risk',
        keyResults: [
          {
            id: 'kr1',
            title: '글로벌 파트너십 체결',
            target: 10,
            current: 3,
            unit: '개사',
            progress: 30
          },
          {
            id: 'kr2',
            title: '다국어 지원 구현',
            target: 5,
            current: 2,
            unit: '개 언어',
            progress: 40
          },
          {
            id: 'kr3',
            title: '월 활성 사용자 확보',
            target: 10000,
            current: 5500,
            unit: '명',
            progress: 55
          }
        ],
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      },
      // Q3 2025 - SAPJOY Platform
      {
        title: 'SAPJOY 엔터프라이즈 기능 강화',
        description: 'SAP 통합 플랫폼 SAPJOY의 대기업 고객 맞춤 기능 개발',
        quarter: 'Q3',
        year: 2025,
        workspaceId: workspaceId,
        progress: 68,
        status: 'on_track',
        keyResults: [
          {
            id: 'kr1',
            title: 'SAP S/4HANA 통합 모듈 개발',
            target: 8,
            current: 6,
            unit: '개 모듈',
            progress: 75
          },
          {
            id: 'kr2',
            title: '대기업 고객 확보',
            target: 20,
            current: 12,
            unit: '개사',
            progress: 60
          },
          {
            id: 'kr3',
            title: '통합 자동화율 달성',
            target: 95,
            current: 67,
            unit: '%',
            progress: 70
          }
        ],
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      },
      // Q4 2025 - TEAMPULSE Platform
      {
        title: 'TeamPulse AI 기능 고도화',
        description: 'AI 기반 팀 협업 플랫폼 TeamPulse의 차세대 AI 기능 출시',
        quarter: 'Q4',
        year: 2025,
        workspaceId: workspaceId,
        progress: 35,
        status: 'at_risk',
        keyResults: [
          {
            id: 'kr1',
            title: 'AI 회의 요약 정확도',
            target: 95,
            current: 78,
            unit: '%',
            progress: 82
          },
          {
            id: 'kr2',
            title: 'AI 추천 기능 만족도',
            target: 4.5,
            current: 3.8,
            unit: '점',
            progress: 84
          },
          {
            id: 'kr3',
            title: '일일 AI 상호작용 수',
            target: 100000,
            current: 35000,
            unit: '회',
            progress: 35
          }
        ],
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      },
      // Q4 2025 - VIBE-C Platform
      {
        title: 'VIBE-C 커뮤니티 생태계 구축',
        description: 'VIBE-C 플랫폼의 크리에이터 커뮤니티 활성화 및 수익 모델 확립',
        quarter: 'Q4',
        year: 2025,
        workspaceId: workspaceId,
        progress: 58,
        status: 'on_track',
        keyResults: [
          {
            id: 'kr1',
            title: '활성 크리에이터 확보',
            target: 5000,
            current: 2800,
            unit: '명',
            progress: 56
          },
          {
            id: 'kr2',
            title: '월 콘텐츠 생성량',
            target: 50000,
            current: 31000,
            unit: '개',
            progress: 62
          },
          {
            id: 'kr3',
            title: '크리에이터 수익 분배 총액',
            target: 10,
            current: 5.5,
            unit: '억원',
            progress: 55
          }
        ],
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      },
      // Q3 2025 - Cross-Platform Integration
      {
        title: '플랫폼 간 시너지 창출',
        description: 'ESGO, SAPJOY, TeamPulse, VIBE-C 플랫폼 간 통합 솔루션 개발',
        quarter: 'Q3',
        year: 2025,
        workspaceId: workspaceId,
        progress: 76,
        status: 'on_track',
        keyResults: [
          {
            id: 'kr1',
            title: '크로스 플랫폼 API 개발',
            target: 15,
            current: 12,
            unit: '개',
            progress: 80
          },
          {
            id: 'kr2',
            title: '통합 대시보드 사용자',
            target: 3000,
            current: 2100,
            unit: '명',
            progress: 70
          },
          {
            id: 'kr3',
            title: '플랫폼 간 데이터 연동률',
            target: 100,
            current: 78,
            unit: '%',
            progress: 78
          }
        ],
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      },
      // Q4 2025 - Innovation Lab
      {
        title: '차세대 기술 R&D 프로젝트',
        description: 'AI, 블록체인, 메타버스 등 미래 기술 연구 및 PoC 개발',
        quarter: 'Q4',
        year: 2025,
        workspaceId: workspaceId,
        progress: 45,
        status: 'at_risk',
        keyResults: [
          {
            id: 'kr1',
            title: 'PoC 프로젝트 완료',
            target: 6,
            current: 3,
            unit: '개',
            progress: 50
          },
          {
            id: 'kr2',
            title: '특허 출원',
            target: 4,
            current: 1,
            unit: '건',
            progress: 25
          },
          {
            id: 'kr3',
            title: '기술 파트너십 체결',
            target: 8,
            current: 5,
            unit: '개사',
            progress: 62
          }
        ],
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      }
    ];
    
    // Add new objectives
    console.log('\nAdding new objectives for Q3 and Q4 2025...');
    for (const objective of newObjectives) {
      const docRef = await db.collection('objectives').add(objective);
      console.log(`Added: ${objective.title} (${objective.quarter} ${objective.year}) - ID: ${docRef.id}`);
    }
    
    console.log('\n✅ OKR data update completed successfully!');
    console.log(`- Removed ${objectivesToDelete.length} duplicate objectives`);
    console.log(`- Added ${newObjectives.length} new objectives for Q3 and Q4 2025`);
    
  } catch (error) {
    console.error('Error updating OKR data:', error);
  } finally {
    process.exit(0);
  }
}

cleanAndUpdateOKRs();