import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 1200px;
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
  font-size: 28px;
  font-weight: 600;
  color: #333;
`;

const MeetingInfo = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  color: #666;
  font-size: 14px;
`;

const StatusBadge = styled.span<{ $status: 'live' | 'ended' }>`
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  ${props => props.$status === 'live' ? `
    background: #e8f5e9;
    color: #2e7d32;
  ` : `
    background: #f5f5f5;
    color: #666;
  `}
`;

const MainContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const NotesSection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SidebarCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
`;

const Editor = styled.div`
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  min-height: 400px;
  padding: 16px;
  font-size: 14px;
  line-height: 1.6;
  
  &:focus {
    outline: none;
    border-color: #02A3FE;
  }
`;

const ParticipantsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Participant = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Avatar = styled.div<{ $color: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => props.$color};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
`;

const ParticipantInfo = styled.div`
  flex: 1;
`;

const ParticipantName = styled.div`
  font-size: 14px;
  color: #333;
`;

const EditingIndicator = styled.div`
  font-size: 12px;
  color: #02A3FE;
`;

const OnlineIndicator = styled.div<{ $online: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.$online ? '#4caf50' : '#ccc'};
`;

const QuickActions = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #f5f5f5;
    border-color: #02A3FE;
    color: #02A3FE;
  }
`;

const AgendaList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const AgendaItem = styled.div<{ $completed?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  background: ${props => props.$completed ? '#f5f5f5' : 'transparent'};
  text-decoration: ${props => props.$completed ? 'line-through' : 'none'};
  color: ${props => props.$completed ? '#999' : '#333'};
  font-size: 14px;
  cursor: pointer;
  
  &:hover {
    background: #f5f5f5;
  }
`;

const Checkbox = styled.input`
  cursor: pointer;
`;

const SaveIndicator = styled.div<{ $saving?: boolean }>`
  font-size: 12px;
  color: ${props => props.$saving ? '#ff9800' : '#4caf50'};
  display: flex;
  align-items: center;
  gap: 4px;
`;

interface MeetingNotesProps {
  meetingId?: string;
  meetingTitle?: string;
  isLive?: boolean;
}

interface Participant {
  id: string;
  name: string;
  isOnline: boolean;
  isEditing: boolean;
  color: string;
}

interface AgendaItem {
  id: string;
  text: string;
  completed: boolean;
}

const MeetingNotes: React.FC<MeetingNotesProps> = ({ 
  meetingId = '1',
  meetingTitle = 'TeamPulse 게임 런칭 전략 회의',
  isLive = true 
}) => {
  const [notes, setNotes] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', name: '김개발', isOnline: true, isEditing: false, color: '#02A3FE' },
    { id: '2', name: '카리나', isOnline: true, isEditing: true, color: '#ff6b6b' },
    { id: '3', name: '최기획', isOnline: true, isEditing: false, color: '#4ecdc4' },
    { id: '4', name: '김디자인', isOnline: false, isEditing: false, color: '#ffe66d' }
  ]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([
    { id: '1', text: 'K-POP 콜라보레이션 마케팅 전략', completed: true },
    { id: '2', text: '글로벌 런칭 일정 확정', completed: true },
    { id: '3', text: '사전예약 이벤트 기획 검토', completed: false },
    { id: '4', text: '서버 인프라 확장 계획', completed: false }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Simulate auto-save
  useEffect(() => {
    if (notes) {
      setIsSaving(true);
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        setIsSaving(false);
      }, 1000);
    }
  }, [notes]);

  const handleNotesChange = (e: React.FormEvent<HTMLDivElement>) => {
    setNotes(e.currentTarget.innerText);
  };

  const toggleAgendaItem = (id: string) => {
    setAgenda(agenda.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const insertTemplate = (template: string) => {
    const editorEl = document.getElementById('notes-editor');
    if (editorEl) {
      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);
      
      if (range && editorEl.contains(range.commonAncestorContainer)) {
        const textNode = document.createTextNode('\n' + template + '\n');
        range.insertNode(textNode);
        range.collapse(false);
      } else {
        editorEl.innerText += '\n' + template + '\n';
      }
      
      editorEl.focus();
      setNotes(editorEl.innerText);
    }
  };

  const getInitials = (name: string) => {
    return name.split('').filter(char => char.match(/[가-힣]/)).slice(0, 2).join('');
  };

  return (
    <Container>
      <Header>
        <div>
          <Title>{meetingTitle}</Title>
          <MeetingInfo>
            <span>2024년 12월 24일 14:00</span>
            <span>•</span>
            <span>{participants.filter(p => p.isOnline).length}명 참여 중</span>
            <span>•</span>
            <StatusBadge $status={isLive ? 'live' : 'ended'}>
              {isLive ? '진행 중' : '종료됨'}
            </StatusBadge>
          </MeetingInfo>
        </div>
        <SaveIndicator $saving={isSaving}>
          {isSaving ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4m0 12v4m-8-8h4m12 0h4" strokeLinecap="round" />
              </svg>
              저장 중...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              자동 저장됨
            </>
          )}
        </SaveIndicator>
      </Header>

      <MainContent>
        <NotesSection>
          <SectionTitle>회의록</SectionTitle>
          
          <QuickActions>
            <ActionButton onClick={() => insertTemplate('## 주요 결정사항\n- ')}>
              <span>📌</span> 결정사항
            </ActionButton>
            <ActionButton onClick={() => insertTemplate('## 액션 아이템\n- [ ] ')}>
              <span>✅</span> 액션 아이템
            </ActionButton>
            <ActionButton onClick={() => insertTemplate('## 다음 단계\n- ')}>
              <span>🚀</span> 다음 단계
            </ActionButton>
            <ActionButton onClick={() => insertTemplate('## 참고사항\n- ')}>
              <span>💡</span> 참고사항
            </ActionButton>
          </QuickActions>

          <Editor
            id="notes-editor"
            contentEditable
            onInput={handleNotesChange}
            suppressContentEditableWarning
          >
            <div style={{ color: '#999', marginBottom: '16px' }}>
              회의 내용을 입력하세요...
            </div>
            
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginTop: '24px', marginBottom: '12px' }}>
              ## 참석자
            </h2>
            <p>김개발, 카리나, 최기획, 김디자인</p>
            
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginTop: '24px', marginBottom: '12px' }}>
              ## 회의 목적
            </h2>
            <p>TeamPulse 게임의 성공적인 글로벌 런칭을 위한 전략 수립 및 실행 계획 논의</p>
            
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginTop: '24px', marginBottom: '12px' }}>
              ## 주요 논의사항
            </h2>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
              1. K-POP 콜라보레이션 마케팅
            </h3>
            <ul style={{ marginLeft: '20px', listStyleType: 'disc' }}>
              <li>aespa 콜라보 캐릭터 디자인 90% 완성</li>
              <li>NCT Dream 콜라보 계약 진행 중</li>
              <li>특별 에디션 아이템 출시 예정</li>
            </ul>
          </Editor>
        </NotesSection>

        <Sidebar>
          <SidebarCard>
            <SectionTitle>참석자 ({participants.length})</SectionTitle>
            <ParticipantsList>
              {participants.map(participant => (
                <Participant key={participant.id}>
                  <Avatar $color={participant.color}>
                    {getInitials(participant.name)}
                  </Avatar>
                  <ParticipantInfo>
                    <ParticipantName>{participant.name}</ParticipantName>
                    {participant.isEditing && (
                      <EditingIndicator>편집 중...</EditingIndicator>
                    )}
                  </ParticipantInfo>
                  <OnlineIndicator $online={participant.isOnline} />
                </Participant>
              ))}
            </ParticipantsList>
          </SidebarCard>

          <SidebarCard>
            <SectionTitle>회의 안건</SectionTitle>
            <AgendaList>
              {agenda.map(item => (
                <AgendaItem 
                  key={item.id} 
                  $completed={item.completed}
                  onClick={() => toggleAgendaItem(item.id)}
                >
                  <Checkbox
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => toggleAgendaItem(item.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span>{item.text}</span>
                </AgendaItem>
              ))}
            </AgendaList>
          </SidebarCard>

          <SidebarCard>
            <SectionTitle>회의 정보</SectionTitle>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>주최자</span>
                <span className="font-medium text-gray-900">최기획</span>
              </div>
              <div className="flex justify-between">
                <span>회의 유형</span>
                <span className="font-medium text-gray-900">화상 회의</span>
              </div>
              <div className="flex justify-between">
                <span>예정 시간</span>
                <span className="font-medium text-gray-900">2시간</span>
              </div>
              <div className="flex justify-between">
                <span>회의실</span>
                <span className="font-medium text-gray-900">Zoom Room 1</span>
              </div>
            </div>
          </SidebarCard>
        </Sidebar>
      </MainContent>
    </Container>
  );
};

export default MeetingNotes;