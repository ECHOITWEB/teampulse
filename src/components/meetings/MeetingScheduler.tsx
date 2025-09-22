import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import meetingService, { Meeting as MeetingType, MeetingAttendee } from '../../services/meetingService';
import memberService from '../../services/memberService';
import { Timestamp } from 'firebase/firestore';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 24px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #666;
`;

const Input = styled.input`
  padding: 10px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: #02A3FE;
  }
`;

const TextArea = styled.textarea`
  padding: 10px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  min-height: 100px;
  resize: vertical;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: #02A3FE;
  }
`;

const Select = styled.select`
  padding: 10px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s;
  
  &:focus {
    outline: none;
    border-color: #02A3FE;
  }
`;

const AttendeesList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
`;

const AttendeeChip = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f5f5f5;
  border-radius: 20px;
  font-size: 14px;
  color: #333;
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  
  &:hover {
    color: #666;
  }
`;

const AddAttendeeSection = styled.div`
  display: flex;
  gap: 8px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 10px 24px;
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

const RecurrenceOptions = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const RadioLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  
  input[type="radio"] {
    cursor: pointer;
  }
`;

interface LocalMeeting {
  title: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  description: string;
  attendees: string[];
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  meetingType: 'video' | 'in-person' | 'hybrid';
}

interface MeetingSchedulerProps {
  onSchedule?: (meeting: LocalMeeting) => void;
  onCancel?: () => void;
}

const MeetingScheduler: React.FC<MeetingSchedulerProps> = ({ onSchedule, onCancel }) => {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [meeting, setMeeting] = useState<LocalMeeting>({
    title: '',
    date: '',
    time: '',
    duration: '60',
    location: '',
    description: '',
    attendees: [],
    recurrence: 'none',
    meetingType: 'video'
  });
  
  const [newAttendee, setNewAttendee] = useState('');
  const [teamMembers, setTeamMembers] = useState<Array<{id: string, name: string, email?: string}>>([]); 
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadTeamMembers();
  }, [currentWorkspace?.id]);

  const loadTeamMembers = async () => {
    if (!currentWorkspace?.id) return;
    
    try {
      const members = await memberService.getWorkspaceMembers(currentWorkspace.id);
      const memberDetails = members.map(member => ({
        id: member.user_id,
        name: member.workspace_profile?.display_name || member.user_id,
        email: undefined // Email is not in workspace_profile type
      }));
      setTeamMembers(memberDetails);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const handleAddAttendee = () => {
    if (newAttendee && !meeting.attendees.includes(newAttendee)) {
      setMeeting({
        ...meeting,
        attendees: [...meeting.attendees, newAttendee]
      });
      setNewAttendee('');
    }
  };

  const handleRemoveAttendee = (attendee: string) => {
    setMeeting({
      ...meeting,
      attendees: meeting.attendees.filter(a => a !== attendee)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentWorkspace?.id || !user) {
      setError('워크스페이스 정보가 없습니다.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Parse date and time
      const [year, month, day] = meeting.date.split('-').map(Number);
      const [hours, minutes] = meeting.time.split(':').map(Number);
      
      const startDate = new Date(year, month - 1, day, hours, minutes);
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + parseInt(meeting.duration));

      // Build attendees list
      const attendeesList: MeetingAttendee[] = meeting.attendees.map(attendeeName => {
        const member = teamMembers.find(m => m.name === attendeeName);
        return {
          user_id: member?.id || attendeeName,
          name: attendeeName,
          email: member?.email,
          status: 'pending' as const,
          role: 'required' as const
        };
      });

      // Add organizer to attendees
      attendeesList.push({
        user_id: user.firebase_uid,
        name: user.name || user.email || 'Organizer',
        email: user.email,
        status: 'accepted' as const,
        role: 'required' as const
      });

      // Create meeting object
      const newMeeting: Omit<MeetingType, 'id' | 'created_at' | 'updated_at'> = {
        workspace_id: currentWorkspace.id,
        title: meeting.title,
        description: meeting.description,
        start_time: Timestamp.fromDate(startDate),
        end_time: Timestamp.fromDate(endDate),
        location: meeting.location,
        meeting_link: meeting.meetingType === 'video' ? meeting.location : undefined,
        organizer_id: user.firebase_uid,
        organizer_name: user.name || user.email || 'Organizer',
        attendees: attendeesList,
        status: 'scheduled',
        recurring: meeting.recurrence !== 'none' ? {
          type: meeting.recurrence,
          frequency: 1,
          end_date: undefined
        } : undefined
      };

      // Save to Firebase
      const meetingId = await meetingService.createMeeting(newMeeting);
      
      console.log('Meeting created with ID:', meetingId);
      setSuccess(true);
      
      // Reset form
      setTimeout(() => {
        setMeeting({
          title: '',
          date: '',
          time: '',
          duration: '60',
          location: '',
          description: '',
          attendees: [],
          recurrence: 'none',
          meetingType: 'video'
        });
        setSuccess(false);
      }, 2000);

      if (onSchedule) {
        onSchedule(meeting);
      }
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      setError(error.message || '회의 예약 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container>
      <Card>
        <Title>새 회의 예약</Title>
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>회의 제목 *</Label>
            <Input
              type="text"
              value={meeting.title}
              onChange={(e) => setMeeting({ ...meeting, title: e.target.value })}
              placeholder="예: 주간 팀 미팅"
              required
            />
          </FormGroup>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup>
              <Label>날짜 *</Label>
              <Input
                type="date"
                value={meeting.date}
                onChange={(e) => setMeeting({ ...meeting, date: e.target.value })}
                required
              />
            </FormGroup>

            <FormGroup>
              <Label>시간 *</Label>
              <Input
                type="time"
                value={meeting.time}
                onChange={(e) => setMeeting({ ...meeting, time: e.target.value })}
                required
              />
            </FormGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup>
              <Label>회의 시간</Label>
              <Select
                value={meeting.duration}
                onChange={(e) => setMeeting({ ...meeting, duration: e.target.value })}
              >
                <option value="30">30분</option>
                <option value="60">1시간</option>
                <option value="90">1시간 30분</option>
                <option value="120">2시간</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>회의 유형</Label>
              <Select
                value={meeting.meetingType}
                onChange={(e) => setMeeting({ ...meeting, meetingType: e.target.value as any })}
              >
                <option value="video">화상 회의</option>
                <option value="in-person">대면 회의</option>
                <option value="hybrid">하이브리드</option>
              </Select>
            </FormGroup>
          </div>

          <FormGroup>
            <Label>장소 / 회의 링크</Label>
            <Input
              type="text"
              value={meeting.location}
              onChange={(e) => setMeeting({ ...meeting, location: e.target.value })}
              placeholder={meeting.meetingType === 'video' ? 'Zoom/Teams 링크' : '회의실 위치'}
            />
          </FormGroup>

          <FormGroup>
            <Label>반복 설정</Label>
            <RecurrenceOptions>
              <RadioLabel>
                <input
                  type="radio"
                  name="recurrence"
                  value="none"
                  checked={meeting.recurrence === 'none'}
                  onChange={(e) => setMeeting({ ...meeting, recurrence: e.target.value as any })}
                />
                반복 없음
              </RadioLabel>
              <RadioLabel>
                <input
                  type="radio"
                  name="recurrence"
                  value="daily"
                  checked={meeting.recurrence === 'daily'}
                  onChange={(e) => setMeeting({ ...meeting, recurrence: e.target.value as any })}
                />
                매일
              </RadioLabel>
              <RadioLabel>
                <input
                  type="radio"
                  name="recurrence"
                  value="weekly"
                  checked={meeting.recurrence === 'weekly'}
                  onChange={(e) => setMeeting({ ...meeting, recurrence: e.target.value as any })}
                />
                매주
              </RadioLabel>
              <RadioLabel>
                <input
                  type="radio"
                  name="recurrence"
                  value="monthly"
                  checked={meeting.recurrence === 'monthly'}
                  onChange={(e) => setMeeting({ ...meeting, recurrence: e.target.value as any })}
                />
                매월
              </RadioLabel>
            </RecurrenceOptions>
          </FormGroup>

          <FormGroup>
            <Label>참석자</Label>
            <AddAttendeeSection>
              <Select
                value={newAttendee}
                onChange={(e) => setNewAttendee(e.target.value)}
                className="flex-1"
              >
                <option value="">팀원 선택...</option>
                {teamMembers.filter(member => !meeting.attendees.includes(member.name)).map(member => (
                  <option key={member.id} value={member.name}>{member.name}</option>
                ))}
              </Select>
              <Button type="button" onClick={handleAddAttendee} $variant="secondary">
                추가
              </Button>
            </AddAttendeeSection>
            {meeting.attendees.length > 0 && (
              <AttendeesList>
                {meeting.attendees.map(attendee => (
                  <AttendeeChip key={attendee}>
                    {attendee}
                    <RemoveButton onClick={() => handleRemoveAttendee(attendee)}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                        <path d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z"/>
                      </svg>
                    </RemoveButton>
                  </AttendeeChip>
                ))}
              </AttendeesList>
            )}
          </FormGroup>

          <FormGroup>
            <Label>회의 설명</Label>
            <TextArea
              value={meeting.description}
              onChange={(e) => setMeeting({ ...meeting, description: e.target.value })}
              placeholder="회의 목적 및 안건을 입력하세요..."
            />
          </FormGroup>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              회의가 성공적으로 예약되었습니다!
            </div>
          )}

          <ButtonGroup>
            <Button type="submit" $variant="primary" disabled={submitting}>
              {submitting ? '예약 중...' : '회의 예약'}
            </Button>
            <Button type="button" $variant="secondary" onClick={onCancel} disabled={submitting}>
              취소
            </Button>
          </ButtonGroup>
        </Form>
      </Card>
    </Container>
  );
};

export default MeetingScheduler;