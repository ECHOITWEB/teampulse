import React, { useState } from 'react';
import styled from 'styled-components';
import { MeetingScheduler, MeetingNotes, ActionItems } from '../components/meetings';

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const PageHeader = styled.div`
  margin-bottom: 40px;
`;

const PageTitle = styled.h1`
  font-size: 36px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;
`;

const PageDescription = styled.p`
  font-size: 16px;
  color: #666;
`;

const TabsContainer = styled.div`
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 32px;
`;

const Tabs = styled.div`
  display: flex;
  gap: 32px;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 12px 0;
  border: none;
  background: none;
  font-size: 16px;
  font-weight: 500;
  color: ${props => props.$active ? '#02A3FE' : '#666'};
  border-bottom: 2px solid ${props => props.$active ? '#02A3FE' : 'transparent'};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    color: #02A3FE;
  }
`;

const TabContent = styled.div`
  animation: fadeIn 0.3s ease-in-out;
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const MeetingsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
`;

const MeetingCard = styled.div`
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }
`;

const MeetingCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const MeetingTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
`;

const MeetingTime = styled.div`
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
`;

const MeetingAttendees = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
`;

const AttendeeAvatars = styled.div`
  display: flex;
  margin-right: 8px;
`;

const Avatar = styled.div<{ $index: number }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #02A3FE;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 500;
  border: 2px solid white;
  margin-left: ${props => props.$index > 0 ? '-8px' : '0'};
`;

const StatusDot = styled.div<{ $status: 'upcoming' | 'ongoing' | 'completed' }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => {
    switch (props.$status) {
      case 'ongoing': return '#4caf50';
      case 'completed': return '#ccc';
      default: return '#ff9800';
    }
  }};
`;

type TabType = 'overview' | 'scheduler' | 'notes' | 'action-items';

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  attendees: string[];
  status: 'upcoming' | 'ongoing' | 'completed';
}

const Meetings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const meetings: Meeting[] = [
    {
      id: '1',
      title: 'TeamPulse 게임 런칭 전략 회의',
      date: '2024-12-24',
      time: '14:00',
      attendees: ['김개발', '카리나', '최기획', '김디자인'],
      status: 'ongoing'
    },
    {
      id: '2',
      title: '개발팀 주간 스탠드업',
      date: '2024-12-25',
      time: '09:00',
      attendees: ['김개발', '이서버', '박결제'],
      status: 'upcoming'
    },
    {
      id: '3',
      title: '마케팅 캠페인 리뷰',
      date: '2024-12-23',
      time: '15:00',
      attendees: ['카리나', '윈터', '진우', '루미'],
      status: 'completed'
    }
  ];

  const getInitials = (name: string) => {
    return name.split('').filter(char => char.match(/[가-힣]/)).slice(0, 2).join('');
  };

  const getStatusText = (status: Meeting['status']) => {
    switch (status) {
      case 'ongoing': return '진행 중';
      case 'upcoming': return '예정';
      case 'completed': return '완료';
    }
  };

  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setActiveTab('notes');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px' }}>
                오늘의 회의
              </h2>
              <MeetingsList>
                {meetings.map(meeting => (
                  <MeetingCard key={meeting.id} onClick={() => handleMeetingClick(meeting)}>
                    <MeetingCardHeader>
                      <div>
                        <MeetingTitle>{meeting.title}</MeetingTitle>
                        <MeetingTime>
                          {meeting.date} {meeting.time}
                        </MeetingTime>
                      </div>
                      <StatusDot $status={meeting.status} />
                    </MeetingCardHeader>
                    <MeetingAttendees>
                      <AttendeeAvatars>
                        {meeting.attendees.slice(0, 3).map((attendee, index) => (
                          <Avatar key={attendee} $index={index}>
                            {getInitials(attendee)}
                          </Avatar>
                        ))}
                        {meeting.attendees.length > 3 && (
                          <Avatar $index={3}>+{meeting.attendees.length - 3}</Avatar>
                        )}
                      </AttendeeAvatars>
                      <span>{meeting.attendees.length}명 참석</span>
                      <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#999' }}>
                        {getStatusText(meeting.status)}
                      </span>
                    </MeetingAttendees>
                  </MeetingCard>
                ))}
              </MeetingsList>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-6 rounded-xl">
                <div className="text-blue-600 text-3xl mb-2">📅</div>
                <div className="text-2xl font-semibold text-gray-900">12</div>
                <div className="text-sm text-gray-600">이번 주 회의</div>
              </div>
              <div className="bg-green-50 p-6 rounded-xl">
                <div className="text-green-600 text-3xl mb-2">✅</div>
                <div className="text-2xl font-semibold text-gray-900">28</div>
                <div className="text-sm text-gray-600">완료된 액션 아이템</div>
              </div>
              <div className="bg-orange-50 p-6 rounded-xl">
                <div className="text-orange-600 text-3xl mb-2">⏰</div>
                <div className="text-2xl font-semibold text-gray-900">7</div>
                <div className="text-sm text-gray-600">대기 중인 액션</div>
              </div>
            </div>
          </>
        );
      
      case 'scheduler':
        return <MeetingScheduler />;
      
      case 'notes':
        return <MeetingNotes 
          meetingId={selectedMeeting?.id} 
          meetingTitle={selectedMeeting?.title}
          isLive={selectedMeeting?.status === 'ongoing'}
        />;
      
      case 'action-items':
        return <ActionItems meetingId={selectedMeeting?.id} />;
      
      default:
        return null;
    }
  };

  return (
    <Container>
      <PageHeader>
        <PageTitle>스마트 회의 도우미</PageTitle>
        <PageDescription>
          효율적인 회의 관리와 실시간 협업을 위한 통합 플랫폼
        </PageDescription>
      </PageHeader>

      <TabsContainer>
        <Tabs>
          <Tab 
            $active={activeTab === 'overview'} 
            onClick={() => setActiveTab('overview')}
          >
            전체보기
          </Tab>
          <Tab 
            $active={activeTab === 'scheduler'} 
            onClick={() => setActiveTab('scheduler')}
          >
            회의 예약
          </Tab>
          <Tab 
            $active={activeTab === 'notes'} 
            onClick={() => setActiveTab('notes')}
          >
            회의록
          </Tab>
          <Tab 
            $active={activeTab === 'action-items'} 
            onClick={() => setActiveTab('action-items')}
          >
            액션 아이템
          </Tab>
        </Tabs>
      </TabsContainer>

      <TabContent key={activeTab}>
        {renderContent()}
      </TabContent>
    </Container>
  );
};

export default Meetings;