import React, { useState } from 'react';
import styled from 'styled-components';

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

interface Meeting {
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
  onSchedule?: (meeting: Meeting) => void;
  onCancel?: () => void;
}

const MeetingScheduler: React.FC<MeetingSchedulerProps> = ({ onSchedule, onCancel }) => {
  const [meeting, setMeeting] = useState<Meeting>({
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

  const teamMembers = [
    '김개발', '이서버', '박결제', '카리나', '윈터', 
    '진우', '루미', '김디자인', '이아트', '박모션', 
    '최기획', '정밸런스'
  ];

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSchedule) {
      onSchedule(meeting);
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
                {teamMembers.filter(member => !meeting.attendees.includes(member)).map(member => (
                  <option key={member} value={member}>{member}</option>
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

          <ButtonGroup>
            <Button type="submit" $variant="primary">
              회의 예약
            </Button>
            <Button type="button" $variant="secondary" onClick={onCancel}>
              취소
            </Button>
          </ButtonGroup>
        </Form>
      </Card>
    </Container>
  );
};

export default MeetingScheduler;