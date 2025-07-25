import React, { useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
`;

const Title = styled.h1`
  font-size: 32px;
  color: #333;
`;

const FilterSection = styled.div`
  display: flex;
  gap: 15px;
  align-items: center;
`;

const FilterSelect = styled.select`
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #02A3FE;
  }
`;

const AddTaskButton = styled.button`
  background: #02A3FE;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.3s;
  
  &:hover {
    background: #0090e0;
  }
`;

const KanbanBoard = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
`;

const Column = styled.div`
  background: #f5f5f5;
  border-radius: 12px;
  padding: 20px;
  min-height: 500px;
`;

const ColumnHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const ColumnTitle = styled.h3`
  font-size: 18px;
  color: #333;
  margin: 0;
`;

const TaskCount = styled.span`
  background: #e0e0e0;
  color: #666;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 14px;
`;

const TaskCard = styled.div`
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
`;

const TaskTitle = styled.h4`
  font-size: 16px;
  color: #333;
  margin: 0 0 8px 0;
`;

const TaskDescription = styled.p`
  font-size: 14px;
  color: #666;
  margin: 0 0 12px 0;
  line-height: 1.5;
`;

const TaskMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`;

const Assignee = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Avatar = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #02A3FE;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
`;

const DueDate = styled.span<{ $urgent?: boolean }>`
  font-size: 12px;
  color: ${props => props.$urgent ? '#ff4444' : '#666'};
`;

const Priority = styled.span<{ $level: 'high' | 'medium' | 'low' }>`
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: ${props => {
    switch (props.$level) {
      case 'high': return '#ffebee';
      case 'medium': return '#fff3e0';
      case 'low': return '#e8f5e9';
    }
  }};
  color: ${props => {
    switch (props.$level) {
      case 'high': return '#d32f2f';
      case 'medium': return '#f57c00';
      case 'low': return '#388e3c';
    }
  }};
`;

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'inProgress' | 'review' | 'done';
  assignee: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  department: string;
}

const TaskManagement: React.FC = () => {
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [tasks] = useState<Task[]>([
    // 개발팀 업무
    {
      id: '1',
      title: '실시간 PvP 배틀 시스템 구현',
      description: '최대 4명이 동시에 플레이 가능한 실시간 배틀 모드 개발',
      status: 'inProgress',
      assignee: '김개발',
      dueDate: '2024-12-28',
      priority: 'high',
      department: '개발팀'
    },
    {
      id: '2',
      title: '서버 부하 테스트',
      description: '동시접속 100만 유저 대응 가능한 서버 인프라 검증',
      status: 'inProgress',
      assignee: '이서버',
      dueDate: '2024-12-26',
      priority: 'high',
      department: '개발팀'
    },
    {
      id: '3',
      title: '결제 시스템 통합',
      description: '글로벌 결제 게이트웨이 연동 (Google Play, App Store, PayPal)',
      status: 'review',
      assignee: '박결제',
      dueDate: '2024-12-24',
      priority: 'high',
      department: '개발팀'
    },
    
    // 마케팅팀 업무
    {
      id: '4',
      title: '유튜브 광고 캠페인 집행',
      description: '게임 플레이 하이라이트 영상 제작 및 광고 집행',
      status: 'inProgress',
      assignee: '카리나',
      dueDate: '2024-12-25',
      priority: 'high',
      department: '마케팅팀'
    },
    {
      id: '5',
      title: 'K-POP 아티스트 콜라보 계약',
      description: 'aespa, NCT Dream 콜라보레이션 계약 진행',
      status: 'todo',
      assignee: '윈터',
      dueDate: '2024-12-30',
      priority: 'high',
      department: '마케팅팀'
    },
    {
      id: '6',
      title: '인플루언서 리스트업',
      description: '게임 스트리머 100명 섭외 리스트 작성 및 컨택',
      status: 'done',
      assignee: '진우',
      dueDate: '2024-12-20',
      priority: 'medium',
      department: '마케팅팀'
    },
    {
      id: '7',
      title: '사전예약 이벤트 페이지',
      description: '사전예약 랜딩페이지 콘텐츠 기획',
      status: 'review',
      assignee: '루미',
      dueDate: '2024-12-23',
      priority: 'high',
      department: '마케팅팀'
    },
    
    // 디자인팀 업무
    {
      id: '8',
      title: 'aespa 콜라보 캐릭터 디자인',
      description: '윈터, 카리나, 지젤, 닝닝 특별 에디션 캐릭터',
      status: 'inProgress',
      assignee: '김디자인',
      dueDate: '2024-12-27',
      priority: 'high',
      department: '디자인팀'
    },
    {
      id: '9',
      title: '크리스마스 이벤트 UI',
      description: '시즌 한정 크리스마스 테마 UI 스킨 제작',
      status: 'review',
      assignee: '이아트',
      dueDate: '2024-12-22',
      priority: 'medium',
      department: '디자인팀'
    },
    {
      id: '10',
      title: '배틀 이펙트 애니메이션',
      description: '스킬 사용 시 파티클 이펙트 및 카메라 연출',
      status: 'todo',
      assignee: '박모션',
      dueDate: '2024-12-29',
      priority: 'medium',
      department: '디자인팀'
    },
    
    // 기획팀 업무
    {
      id: '11',
      title: '시즌1 콘텐츠 로드맵',
      description: '런칭 후 3개월 업데이트 계획 수립',
      status: 'done',
      assignee: '최기획',
      dueDate: '2024-12-21',
      priority: 'high',
      department: '기획팀'
    },
    {
      id: '12',
      title: '밸런스 패치 시뮬레이션',
      description: '캐릭터별 스킬 데미지 및 쿨타임 조정안',
      status: 'inProgress',
      assignee: '정밸런스',
      dueDate: '2024-12-26',
      priority: 'medium',
      department: '기획팀'
    }
  ]);

  const columns = [
    { id: 'todo', title: '할 일', status: 'todo' as const },
    { id: 'inProgress', title: '진행 중', status: 'inProgress' as const },
    { id: 'review', title: '검토', status: 'review' as const },
    { id: 'done', title: '완료', status: 'done' as const }
  ];

  const filteredTasks = selectedDepartment === 'all' 
    ? tasks 
    : tasks.filter(task => task.department === selectedDepartment);

  const getTasksByStatus = (status: Task['status']) => {
    return filteredTasks.filter(task => task.status === status);
  };

  const isUrgent = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  };

  const getInitials = (name: string) => {
    return name.split('').filter(char => char.match(/[가-힣]/)).slice(0, 2).join('');
  };

  return (
    <Container>
      <Header>
        <Title>업무 관리</Title>
        <FilterSection>
          <FilterSelect 
            value={selectedDepartment} 
            onChange={(e) => setSelectedDepartment(e.target.value)}
          >
            <option value="all">모든 부서</option>
            <option value="개발팀">개발팀</option>
            <option value="마케팅팀">마케팅팀</option>
            <option value="디자인팀">디자인팀</option>
            <option value="기획팀">기획팀</option>
          </FilterSelect>
          <AddTaskButton>+ 새 업무 추가</AddTaskButton>
        </FilterSection>
      </Header>

      <KanbanBoard>
        {columns.map(column => {
          const columnTasks = getTasksByStatus(column.status);
          return (
            <Column key={column.id}>
              <ColumnHeader>
                <ColumnTitle>{column.title}</ColumnTitle>
                <TaskCount>{columnTasks.length}</TaskCount>
              </ColumnHeader>
              {columnTasks.map(task => (
                <TaskCard key={task.id}>
                  <TaskTitle>{task.title}</TaskTitle>
                  <TaskDescription>{task.description}</TaskDescription>
                  <TaskMeta>
                    <Assignee>
                      <Avatar>{getInitials(task.assignee)}</Avatar>
                      <span style={{ fontSize: '14px', color: '#666' }}>{task.assignee}</span>
                    </Assignee>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Priority $level={task.priority}>
                        {task.priority === 'high' ? '높음' : task.priority === 'medium' ? '보통' : '낮음'}
                      </Priority>
                      <DueDate $urgent={isUrgent(task.dueDate)}>
                        {new Date(task.dueDate).toLocaleDateString('ko-KR', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </DueDate>
                    </div>
                  </TaskMeta>
                </TaskCard>
              ))}
            </Column>
          );
        })}
      </KanbanBoard>
    </Container>
  );
};

export default TaskManagement;