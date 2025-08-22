import React, { useState } from 'react';
import MobileGoalsView from '../components/goals/MobileGoalsView';
import { MobileGoal } from '../components/goals/MobileGoalCard';

const MobileGoalsDemo: React.FC = () => {
  const [goals, setGoals] = useState<MobileGoal[]>([
    {
      id: '1',
      title: '케이팝데몬헌터스 글로벌 런칭 성공',
      description: '2024년 Q4 글로벌 시장 동시 런칭 및 MAU 500만 달성을 목표로 하는 전략적 프로젝트',
      progress: 72,
      status: 'active',
      owner: '김대표',
      team: '전략팀',
      dueDate: '2024 Q4',
      commentCount: 8,
      lastUpdate: '2024-01-15T10:30:00Z',
      keyResults: [
        {
          id: 'kr1',
          title: '글로벌 5개국 동시 런칭',
          currentValue: 3,
          targetValue: 5,
          unit: '개국',
          progress: 60,
          status: 'on_track',
          owner: '김개발'
        },
        {
          id: 'kr2',
          title: 'MAU 500만 달성',
          currentValue: 380,
          targetValue: 500,
          unit: '만명',
          progress: 76,
          status: 'on_track',
          owner: '박마케팅'
        },
        {
          id: 'kr3',
          title: '일일 매출 10억원 달성',
          currentValue: 7.5,
          targetValue: 10,
          unit: '억원',
          progress: 75,
          status: 'at_risk',
          owner: '최기획'
        }
      ]
    },
    {
      id: '2',
      title: '개발팀 기술 역량 강화',
      description: '최신 기술 스택 도입 및 팀원 역량 향상을 통한 개발 효율성 제고',
      progress: 85,
      status: 'active',
      owner: '김개발',
      team: '개발팀',
      dueDate: '2024 Q4',
      commentCount: 12,
      lastUpdate: '2024-01-14T16:45:00Z',
      keyResults: [
        {
          id: 'kr4',
          title: 'React Native 전환율',
          currentValue: 85,
          targetValue: 100,
          unit: '%',
          progress: 85,
          status: 'on_track',
          owner: '이프론트'
        },
        {
          id: 'kr5',
          title: '코드 커버리지',
          currentValue: 78,
          targetValue: 80,
          unit: '%',
          progress: 97.5,
          status: 'on_track',
          owner: '박백엔드'
        }
      ]
    },
    {
      id: '3',
      title: '개인 성장 목표',
      description: '풀스택 개발자로 성장하기 위한 기술적 역량 개발 목표',
      progress: 65,
      status: 'active',
      owner: '김개발',
      dueDate: '2024 Q4',
      commentCount: 3,
      lastUpdate: '2024-01-13T09:20:00Z',
      keyResults: [
        {
          id: 'kr6',
          title: 'AWS 자격증 취득',
          currentValue: 1,
          targetValue: 2,
          unit: '개',
          progress: 50,
          status: 'on_track',
          owner: '김개발'
        },
        {
          id: 'kr7',
          title: '오픈소스 기여',
          currentValue: 3,
          targetValue: 5,
          unit: 'PR',
          progress: 60,
          status: 'on_track',
          owner: '김개발'
        }
      ]
    },
    {
      id: '4',
      title: '마케팅 성과 향상',
      description: '디지털 마케팅 채널 다각화를 통한 신규 고객 유치 확대',
      progress: 42,
      status: 'at_risk',
      owner: '박마케팅',
      team: '마케팅팀',
      dueDate: '2024 Q4',
      commentCount: 15,
      lastUpdate: '2024-01-12T14:10:00Z',
      keyResults: [
        {
          id: 'kr8',
          title: '신규 고객 확보',
          currentValue: 150,
          targetValue: 300,
          unit: '명',
          progress: 50,
          status: 'at_risk',
          owner: '박마케팅'
        },
        {
          id: 'kr9',
          title: 'SNS 팔로워 증가',
          currentValue: 2800,
          targetValue: 5000,
          unit: '명',
          progress: 56,
          status: 'on_track',
          owner: '이소셜'
        }
      ]
    },
    {
      id: '5',
      title: '고객 만족도 개선',
      description: '고객 서비스 품질 향상을 통한 고객 만족도 및 리텐션 개선',
      progress: 95,
      status: 'completed',
      owner: '최서비스',
      team: '고객서비스팀',
      dueDate: '2024 Q3',
      commentCount: 6,
      lastUpdate: '2024-01-10T11:30:00Z',
      keyResults: [
        {
          id: 'kr10',
          title: '고객 만족도 점수',
          currentValue: 4.8,
          targetValue: 4.5,
          unit: '점',
          progress: 100,
          status: 'completed',
          owner: '최서비스'
        },
        {
          id: 'kr11',
          title: '응답 시간 단축',
          currentValue: 2,
          targetValue: 4,
          unit: '시간',
          progress: 100,
          status: 'completed',
          owner: '정지원'
        }
      ]
    }
  ]);

  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
  };

  const handleUpdateGoal = async (goalId: string, updates: any) => {
    console.log('Updating goal:', goalId, updates);
    
    // Simulate update
    setGoals(prevGoals => 
      prevGoals.map(goal => {
        if (goal.id === goalId) {
          let updatedGoal = { ...goal };
          
          if (updates.progress !== undefined) {
            updatedGoal.progress = updates.progress;
          }
          
          if (updates.markComplete) {
            updatedGoal.status = 'completed';
            updatedGoal.progress = 100;
          }
          
          if (updates.keyResultUpdates) {
            updatedGoal.keyResults = updatedGoal.keyResults.map(kr => {
              const update = updates.keyResultUpdates.find((u: any) => u.id === kr.id);
              return update ? { ...kr, ...update } : kr;
            });
          }
          
          return updatedGoal;
        }
        return goal;
      })
    );
  };

  const handleCreateGoal = () => {
    console.log('Creating new goal...');
    // In a real app, this would open a create goal modal
    alert('목표 생성 기능은 아직 구현되지 않았습니다.');
  };

  const handleViewGoalDetails = (goalId: string) => {
    console.log('Viewing goal details:', goalId);
    alert(`목표 상세보기: ${goalId}`);
  };

  const handleEditGoal = (goalId: string) => {
    console.log('Editing goal:', goalId);
    alert(`목표 편집: ${goalId}`);
  };

  const handleCommentGoal = (goalId: string) => {
    console.log('Commenting on goal:', goalId);
    alert(`목표 댓글: ${goalId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mobile Goals Demo</h1>
        <p className="text-gray-600">모바일 최적화된 목표 관리 인터페이스를 체험해보세요</p>
        <div className="mt-3 text-sm text-gray-500">
          • 스와이프하여 편집/댓글 액션 사용<br/>
          • 터치 친화적인 컨트롤 및 햅틱 피드백<br/>
          • 원핸드 모드 최적화 (≤375px)
        </div>
      </div>
      
      <MobileGoalsView
        goals={goals}
        loading={loading}
        error={null}
        onRefresh={handleRefresh}
        onCreateGoal={handleCreateGoal}
        onUpdateGoal={handleUpdateGoal}
        onViewGoalDetails={handleViewGoalDetails}
        onEditGoal={handleEditGoal}
        onCommentGoal={handleCommentGoal}
      />
    </div>
  );
};

export default MobileGoalsDemo;