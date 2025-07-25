import React, { useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: #333;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  ${props => props.$variant === 'primary' ? `
    background: #02A3FE;
    color: white;
    border: none;
    
    &:hover {
      background: #0090e0;
    }
  ` : `
    background: white;
    color: #666;
    border: 1px solid #e0e0e0;
    
    &:hover {
      background: #f5f5f5;
    }
  `}
`;

const FilterTabs = styled.div`
  display: flex;
  gap: 4px;
  background: #f5f5f5;
  padding: 4px;
  border-radius: 8px;
  margin-bottom: 24px;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  background: ${props => props.$active ? 'white' : 'transparent'};
  color: ${props => props.$active ? '#333' : '#666'};
  font-size: 14px;
  font-weight: ${props => props.$active ? '500' : '400'};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${props => props.$active ? 'white' : 'rgba(255, 255, 255, 0.5)'};
  }
`;

const ActionItemsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ActionItemCard = styled.div`
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
`;

const ActionItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const ActionItemTitle = styled.h3`
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin: 0;
`;

const StatusBadge = styled.span<{ $status: 'pending' | 'in-progress' | 'completed' | 'overdue' }>`
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  ${props => {
    switch (props.$status) {
      case 'completed':
        return `
          background: #e8f5e9;
          color: #2e7d32;
        `;
      case 'in-progress':
        return `
          background: #e3f2fd;
          color: #1976d2;
        `;
      case 'overdue':
        return `
          background: #ffebee;
          color: #d32f2f;
        `;
      default:
        return `
          background: #fafafa;
          color: #666;
        `;
    }
  }}
`;

const ActionItemContent = styled.div`
  margin-bottom: 16px;
`;

const Description = styled.p`
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  margin: 0 0 12px 0;
`;

const MetaInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 14px;
  color: #666;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
`;

const ActionButton = styled.button`
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: white;
  color: #666;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #f5f5f5;
    border-color: #02A3FE;
    color: #02A3FE;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #999;
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`;

const EmptyText = styled.p`
  font-size: 16px;
  margin: 0;
`;

const NewActionForm = styled.div`
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: #666;
`;

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #02A3FE;
  }
`;

const TextArea = styled.textarea`
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  min-height: 80px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: #02A3FE;
  }
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #02A3FE;
  }
`;

interface ActionItem {
  id: string;
  title: string;
  description: string;
  assignee: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  meetingId: string;
  meetingTitle: string;
  createdAt: string;
}

interface ActionItemsProps {
  meetingId?: string;
}

const ActionItems: React.FC<ActionItemsProps> = ({ meetingId }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed' | 'overdue'>('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newAction, setNewAction] = useState({
    title: '',
    description: '',
    assignee: '',
    dueDate: '',
    priority: 'medium' as const
  });

  const [actionItems] = useState<ActionItem[]>([
    {
      id: '1',
      title: 'aespa 콜라보 캐릭터 최종 디자인 승인',
      description: '윈터, 카리나, 지젤, 닝닝 특별 에디션 캐릭터 디자인 최종 검토 및 승인. SM 엔터테인먼트 피드백 반영 필요.',
      assignee: '김디자인',
      dueDate: '2024-12-27',
      priority: 'high',
      status: 'in-progress',
      meetingId: '1',
      meetingTitle: 'TeamPulse 게임 런칭 전략 회의',
      createdAt: '2024-12-24T14:30:00'
    },
    {
      id: '2',
      title: '유튜브 광고 캠페인 소재 3종 제작',
      description: '15초, 30초, 60초 버전 게임플레이 하이라이트 영상 제작. K-POP 콜라보 요소 강조.',
      assignee: '카리나',
      dueDate: '2024-12-25',
      priority: 'high',
      status: 'pending',
      meetingId: '1',
      meetingTitle: 'TeamPulse 게임 런칭 전략 회의',
      createdAt: '2024-12-24T14:45:00'
    },
    {
      id: '3',
      title: '서버 스트레스 테스트 시나리오 작성',
      description: '동시접속 100만 유저 대응 테스트 시나리오 및 부하 테스트 계획 수립',
      assignee: '이서버',
      dueDate: '2024-12-26',
      priority: 'medium',
      status: 'completed',
      meetingId: '2',
      meetingTitle: '개발팀 주간 회의',
      createdAt: '2024-12-20T10:00:00'
    },
    {
      id: '4',
      title: '사전예약 랜딩페이지 A/B 테스트 설정',
      description: '전환율 최적화를 위한 랜딩페이지 2개 버전 제작 및 테스트 환경 구성',
      assignee: '루미',
      dueDate: '2024-12-23',
      priority: 'medium',
      status: 'overdue',
      meetingId: '1',
      meetingTitle: 'TeamPulse 게임 런칭 전략 회의',
      createdAt: '2024-12-24T15:00:00'
    }
  ]);

  const teamMembers = [
    '김개발', '이서버', '박결제', '카리나', '윈터', 
    '진우', '루미', '김디자인', '이아트', '박모션', 
    '최기획', '정밸런스'
  ];

  const filteredItems = actionItems.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const getStatusText = (status: ActionItem['status']) => {
    switch (status) {
      case 'completed': return '완료';
      case 'in-progress': return '진행 중';
      case 'overdue': return '지연';
      default: return '대기';
    }
  };

  const getPriorityText = (priority: ActionItem['priority']) => {
    switch (priority) {
      case 'high': return '높음';
      case 'medium': return '보통';
      case 'low': return '낮음';
    }
  };

  const handleCreateAction = () => {
    // In a real app, this would create the action item
    console.log('Creating action item:', newAction);
    setShowNewForm(false);
    setNewAction({
      title: '',
      description: '',
      assignee: '',
      dueDate: '',
      priority: 'medium'
    });
  };

  return (
    <Container>
      <Header>
        <Title>액션 아이템</Title>
        <HeaderActions>
          <Button $variant="secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18m-9-9v18" strokeLinecap="round" />
            </svg>
            내보내기
          </Button>
          <Button $variant="primary" onClick={() => setShowNewForm(!showNewForm)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14m-7-7h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            새 액션 아이템
          </Button>
        </HeaderActions>
      </Header>

      {showNewForm && (
        <NewActionForm>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
            새 액션 아이템 추가
          </h3>
          <FormGroup style={{ marginBottom: '16px' }}>
            <Label>제목 *</Label>
            <Input
              type="text"
              value={newAction.title}
              onChange={(e) => setNewAction({ ...newAction, title: e.target.value })}
              placeholder="액션 아이템 제목을 입력하세요"
            />
          </FormGroup>
          <FormGroup style={{ marginBottom: '16px' }}>
            <Label>설명</Label>
            <TextArea
              value={newAction.description}
              onChange={(e) => setNewAction({ ...newAction, description: e.target.value })}
              placeholder="상세 설명을 입력하세요..."
            />
          </FormGroup>
          <FormGrid>
            <FormGroup>
              <Label>담당자 *</Label>
              <Select
                value={newAction.assignee}
                onChange={(e) => setNewAction({ ...newAction, assignee: e.target.value })}
              >
                <option value="">선택하세요</option>
                {teamMembers.map(member => (
                  <option key={member} value={member}>{member}</option>
                ))}
              </Select>
            </FormGroup>
            <FormGroup>
              <Label>마감일 *</Label>
              <Input
                type="date"
                value={newAction.dueDate}
                onChange={(e) => setNewAction({ ...newAction, dueDate: e.target.value })}
              />
            </FormGroup>
            <FormGroup>
              <Label>우선순위</Label>
              <Select
                value={newAction.priority}
                onChange={(e) => setNewAction({ ...newAction, priority: e.target.value as any })}
              >
                <option value="high">높음</option>
                <option value="medium">보통</option>
                <option value="low">낮음</option>
              </Select>
            </FormGroup>
          </FormGrid>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button $variant="primary" onClick={handleCreateAction}>
              추가
            </Button>
            <Button $variant="secondary" onClick={() => setShowNewForm(false)}>
              취소
            </Button>
          </div>
        </NewActionForm>
      )}

      <FilterTabs>
        <Tab $active={filter === 'all'} onClick={() => setFilter('all')}>
          전체 ({actionItems.length})
        </Tab>
        <Tab $active={filter === 'pending'} onClick={() => setFilter('pending')}>
          대기 ({actionItems.filter(i => i.status === 'pending').length})
        </Tab>
        <Tab $active={filter === 'in-progress'} onClick={() => setFilter('in-progress')}>
          진행 중 ({actionItems.filter(i => i.status === 'in-progress').length})
        </Tab>
        <Tab $active={filter === 'completed'} onClick={() => setFilter('completed')}>
          완료 ({actionItems.filter(i => i.status === 'completed').length})
        </Tab>
        <Tab $active={filter === 'overdue'} onClick={() => setFilter('overdue')}>
          지연 ({actionItems.filter(i => i.status === 'overdue').length})
        </Tab>
      </FilterTabs>

      {filteredItems.length > 0 ? (
        <ActionItemsList>
          {filteredItems.map(item => (
            <ActionItemCard key={item.id}>
              <ActionItemHeader>
                <ActionItemTitle>{item.title}</ActionItemTitle>
                <StatusBadge $status={item.status}>
                  {getStatusText(item.status)}
                </StatusBadge>
              </ActionItemHeader>
              
              <ActionItemContent>
                <Description>{item.description}</Description>
                
                <MetaInfo>
                  <MetaItem>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    {item.assignee}
                  </MetaItem>
                  <MetaItem>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {new Date(item.dueDate).toLocaleDateString('ko-KR')}
                  </MetaItem>
                  <MetaItem>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    우선순위: {getPriorityText(item.priority)}
                  </MetaItem>
                  <MetaItem>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    {item.meetingTitle}
                  </MetaItem>
                </MetaInfo>
              </ActionItemContent>
              
              <ActionButtons>
                <ActionButton>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  수정
                </ActionButton>
                <ActionButton>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  업무로 변환
                </ActionButton>
                {item.status !== 'completed' && (
                  <ActionButton>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    완료
                  </ActionButton>
                )}
              </ActionButtons>
            </ActionItemCard>
          ))}
        </ActionItemsList>
      ) : (
        <EmptyState>
          <EmptyIcon>📋</EmptyIcon>
          <EmptyText>선택한 필터에 해당하는 액션 아이템이 없습니다.</EmptyText>
        </EmptyState>
      )}
    </Container>
  );
};

export default ActionItems;