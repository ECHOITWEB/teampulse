import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { MeetingScheduler, MeetingNotes, ActionItems } from '../components/meetings';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import meetingService, { Meeting as MeetingType } from '../services/meetingService';
import { Timestamp } from 'firebase/firestore';

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;
  flex: 1;
  min-height: calc(100vh - 8rem);
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

const StatusDot = styled.div<{ $status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => {
    switch (props.$status) {
      case 'ongoing': return '#4caf50';
      case 'completed': return '#ccc';
      case 'cancelled': return '#f44336';
      default: return '#ff9800';
    }
  }};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  font-size: 16px;
  color: #666;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  background: #f9f9f9;
  border-radius: 12px;
  
  h3 {
    font-size: 20px;
    color: #333;
    margin-bottom: 8px;
  }
  
  p {
    color: #666;
    margin-bottom: 20px;
  }
`;

const CreateButton = styled.button`
  background: #02A3FE;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
  
  &:hover {
    background: #0090e0;
  }
`;

type TabType = 'overview' | 'scheduler' | 'notes' | 'action-items';

const Meetings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingType | null>(null);
  const [meetings, setMeetings] = useState<MeetingType[]>([]);
  const [todayMeetings, setTodayMeetings] = useState<MeetingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    weekMeetings: 0,
    completedActions: 0,
    pendingActions: 0
  });

  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  useEffect(() => {
    if (!currentWorkspace?.id) return;

    loadMeetings();
    loadStats();

    // Set up real-time subscription
    const unsubscribe = meetingService.subscribeMeetings(
      currentWorkspace.id,
      (updatedMeetings) => {
        setMeetings(updatedMeetings);
        filterTodayMeetings(updatedMeetings);
      }
    );

    // Check and update meeting statuses periodically
    const statusInterval = setInterval(() => {
      meetingService.checkAndUpdateMeetingStatuses(currentWorkspace.id);
    }, 60000); // Check every minute

    return () => {
      unsubscribe();
      clearInterval(statusInterval);
    };
  }, [currentWorkspace?.id]);

  const loadMeetings = async () => {
    if (!currentWorkspace?.id) return;

    try {
      setLoading(true);
      
      // Load all meetings
      const allMeetings = await meetingService.getWorkspaceMeetings(currentWorkspace.id);
      setMeetings(allMeetings);
      
      // Filter today's meetings
      filterTodayMeetings(allMeetings);
      
      // Check and update statuses
      await meetingService.checkAndUpdateMeetingStatuses(currentWorkspace.id);
    } catch (error) {
      console.error('Error loading meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTodayMeetings = (allMeetings: MeetingType[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysMeetings = allMeetings.filter(meeting => {
      const meetingDate = meeting.start_time.toDate();
      return meetingDate >= today && meetingDate < tomorrow;
    });

    setTodayMeetings(todaysMeetings);
  };

  const loadStats = async () => {
    if (!currentWorkspace?.id) return;

    try {
      // Get this week's meetings
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);

      const weekMeetings = await meetingService.getWorkspaceMeetings(
        currentWorkspace.id,
        startOfWeek,
        endOfWeek
      );

      // Get action items
      const actionItems = await meetingService.getActionItems(undefined, currentWorkspace.id);
      const completedActions = actionItems.filter(item => item.status === 'completed').length;
      const pendingActions = actionItems.filter(item => 
        item.status === 'pending' || item.status === 'in_progress'
      ).length;

      setStats({
        weekMeetings: weekMeetings.length,
        completedActions,
        pendingActions
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[parts.length - 1][0];
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getStatusText = (status: MeetingType['status']) => {
    switch (status) {
      case 'ongoing': return '진행 중';
      case 'scheduled': return '예정';
      case 'completed': return '완료';
      case 'cancelled': return '취소됨';
    }
  };

  const formatDateTime = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return {
      date: date.toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  const handleMeetingClick = (meeting: MeetingType) => {
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
              {loading ? (
                <LoadingContainer>회의 정보를 불러오는 중...</LoadingContainer>
              ) : todayMeetings.length > 0 ? (
                <MeetingsList>
                  {todayMeetings.map(meeting => {
                    const dateTime = formatDateTime(meeting.start_time);
                    return (
                      <MeetingCard 
                        key={meeting.id} 
                        onClick={() => handleMeetingClick(meeting)}
                      >
                        <MeetingCardHeader>
                          <div>
                            <MeetingTitle>{meeting.title}</MeetingTitle>
                            <MeetingTime>
                              {dateTime.date} {dateTime.time}
                            </MeetingTime>
                          </div>
                          <StatusDot $status={meeting.status} />
                        </MeetingCardHeader>
                        <MeetingAttendees>
                          <AttendeeAvatars>
                            {meeting.attendees.slice(0, 3).map((attendee, index) => (
                              <Avatar key={attendee.user_id} $index={index}>
                                {getInitials(attendee.name)}
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
                    );
                  })}
                </MeetingsList>
              ) : (
                <EmptyState>
                  <h3>오늘 예정된 회의가 없습니다</h3>
                  <p>새로운 회의를 예약하시겠습니까?</p>
                  <CreateButton onClick={() => setActiveTab('scheduler')}>
                    회의 예약하기
                  </CreateButton>
                </EmptyState>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-6 rounded-xl">
                <div className="text-blue-600 text-3xl mb-2">📅</div>
                <div className="text-2xl font-semibold text-gray-900">{stats.weekMeetings}</div>
                <div className="text-sm text-gray-600">이번 주 회의</div>
              </div>
              <div className="bg-green-50 p-6 rounded-xl">
                <div className="text-green-600 text-3xl mb-2">✅</div>
                <div className="text-2xl font-semibold text-gray-900">{stats.completedActions}</div>
                <div className="text-sm text-gray-600">완료된 액션 아이템</div>
              </div>
              <div className="bg-orange-50 p-6 rounded-xl">
                <div className="text-orange-600 text-3xl mb-2">⏰</div>
                <div className="text-2xl font-semibold text-gray-900">{stats.pendingActions}</div>
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