import React, { useState } from 'react';
import styled from 'styled-components';

const DashboardContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 40px;
`;

const Title = styled.h1`
  font-size: 32px;
  color: #333;
  margin-bottom: 10px;
`;

const YearSelector = styled.select`
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #02A3FE;
  }
`;

const OverallProgress = styled.div`
  background: #f5f5f5;
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 40px;
`;

const ProgressTitle = styled.h2`
  font-size: 24px;
  color: #333;
  margin-bottom: 20px;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 30px;
  background: #e0e0e0;
  border-radius: 15px;
  overflow: hidden;
  position: relative;
`;

const ProgressFill = styled.div<{ $progress: number }>`
  width: ${props => props.$progress}%;
  height: 100%;
  background: linear-gradient(90deg, #02A3FE 0%, #0090e0 100%);
  transition: width 0.5s ease;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 10px;
`;

const ProgressText = styled.span`
  color: white;
  font-weight: bold;
  font-size: 14px;
`;

const GoalsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 20px;
`;

const GoalCard = styled.div`
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 25px;
`;

const GoalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const GoalTitle = styled.h3`
  font-size: 20px;
  color: #333;
  margin: 0;
`;

const DepartmentTag = styled.span`
  background: #02A3FE;
  color: white;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
`;

const GoalDescription = styled.p`
  color: #666;
  line-height: 1.6;
  margin-bottom: 20px;
`;

const SubGoalsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const SubGoalItem = styled.li`
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  color: #666;
`;

const Checkbox = styled.input`
  margin-right: 10px;
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const AddButton = styled.button`
  background: #02A3FE;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 20px;
  transition: background 0.3s;
  
  &:hover {
    background: #0090e0;
  }
`;

interface SubGoal {
  id: string;
  text: string;
  completed: boolean;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  department: string;
  subGoals: SubGoal[];
}

const GoalsDashboard: React.FC = () => {
  const [selectedYear] = useState('2024');
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      title: '케이팝데몬헌터스 글로벌 런칭',
      description: '2024년 Q4 글로벌 시장 동시 런칭 및 MAU 500만 달성',
      department: '개발팀',
      subGoals: [
        { id: '1-1', text: '게임 엔진 최적화 완료', completed: true },
        { id: '1-2', text: '멀티플레이어 서버 구축', completed: true },
        { id: '1-3', text: '보안 시스템 구현', completed: true },
        { id: '1-4', text: '글로벌 CBT 진행', completed: true },
        { id: '1-5', text: '정식 런칭 준비', completed: false },
        { id: '1-6', text: '라이브 서비스 안정화', completed: false }
      ]
    },
    {
      id: '2',
      title: '글로벌 마케팅 캠페인',
      description: '사전예약 500만 달성 및 브랜드 인지도 구축',
      department: '마케팅팀',
      subGoals: [
        { id: '2-1', text: '티저 캠페인 시작', completed: true },
        { id: '2-2', text: 'K-POP 아티스트 콜라보 계약', completed: true },
        { id: '2-3', text: '인플루언서 파트너십 체결', completed: true },
        { id: '2-4', text: '글로벌 미디어 광고 집행', completed: false },
        { id: '2-5', text: '커뮤니티 이벤트 진행', completed: false }
      ]
    },
    {
      id: '3',
      title: '캐릭터 디자인 & UI/UX',
      description: '100개 이상의 유니크 캐릭터 디자인 및 직관적인 UI 구현',
      department: '디자인팀',
      subGoals: [
        { id: '3-1', text: '메인 캐릭터 30종 디자인', completed: true },
        { id: '3-2', text: '서브 캐릭터 50종 디자인', completed: true },
        { id: '3-3', text: 'UI/UX 가이드라인 수립', completed: true },
        { id: '3-4', text: '스페셜 에디션 캐릭터 20종', completed: false },
        { id: '3-5', text: '애니메이션 이펙트 최종화', completed: false }
      ]
    },
    {
      id: '4',
      title: '수익화 전략 실행',
      description: '월 매출 100억원 달성 및 수익 모델 다각화',
      department: '기획팀',
      subGoals: [
        { id: '4-1', text: '인앱 결제 시스템 구축', completed: true },
        { id: '4-2', text: 'VIP 멤버십 시스템 설계', completed: true },
        { id: '4-3', text: '시즌 패스 콘텐츠 기획', completed: false },
        { id: '4-4', text: 'NFT 마켓플레이스 연동', completed: false }
      ]
    }
  ]);

  const toggleSubGoal = (goalId: string, subGoalId: string) => {
    setGoals(prevGoals =>
      prevGoals.map(goal =>
        goal.id === goalId
          ? {
              ...goal,
              subGoals: goal.subGoals.map(subGoal =>
                subGoal.id === subGoalId
                  ? { ...subGoal, completed: !subGoal.completed }
                  : subGoal
              )
            }
          : goal
      )
    );
  };

  const calculateOverallProgress = () => {
    const totalSubGoals = goals.reduce((acc, goal) => acc + goal.subGoals.length, 0);
    const completedSubGoals = goals.reduce(
      (acc, goal) => acc + goal.subGoals.filter(sg => sg.completed).length,
      0
    );
    return totalSubGoals > 0 ? Math.round((completedSubGoals / totalSubGoals) * 100) : 0;
  };

  const calculateGoalProgress = (goal: Goal) => {
    const completed = goal.subGoals.filter(sg => sg.completed).length;
    return goal.subGoals.length > 0 ? Math.round((completed / goal.subGoals.length) * 100) : 0;
  };

  const overallProgress = calculateOverallProgress();

  return (
    <DashboardContainer>
      <Header>
        <Title>연간 목표 관리</Title>
        <YearSelector value={selectedYear}>
          <option value="2024">2024년</option>
          <option value="2025">2025년</option>
        </YearSelector>
      </Header>

      <OverallProgress>
        <ProgressTitle>전체 목표 달성률</ProgressTitle>
        <ProgressBar>
          <ProgressFill $progress={overallProgress}>
            <ProgressText>{overallProgress}%</ProgressText>
          </ProgressFill>
        </ProgressBar>
      </OverallProgress>

      <GoalsGrid>
        {goals.map(goal => (
          <GoalCard key={goal.id}>
            <GoalHeader>
              <GoalTitle>{goal.title}</GoalTitle>
              <DepartmentTag>{goal.department}</DepartmentTag>
            </GoalHeader>
            <GoalDescription>{goal.description}</GoalDescription>
            
            <div style={{ marginBottom: '15px' }}>
              <ProgressBar style={{ height: '20px' }}>
                <ProgressFill $progress={calculateGoalProgress(goal)}>
                  <ProgressText style={{ fontSize: '12px' }}>
                    {calculateGoalProgress(goal)}%
                  </ProgressText>
                </ProgressFill>
              </ProgressBar>
            </div>

            <SubGoalsList>
              {goal.subGoals.map(subGoal => (
                <SubGoalItem key={subGoal.id}>
                  <Checkbox
                    type="checkbox"
                    checked={subGoal.completed}
                    onChange={() => toggleSubGoal(goal.id, subGoal.id)}
                  />
                  <span style={{ textDecoration: subGoal.completed ? 'line-through' : 'none' }}>
                    {subGoal.text}
                  </span>
                </SubGoalItem>
              ))}
            </SubGoalsList>
          </GoalCard>
        ))}
      </GoalsGrid>

      <AddButton>새 목표 추가</AddButton>
    </DashboardContainer>
  );
};

export default GoalsDashboard;