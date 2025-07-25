import { createStructuredCompletion } from '../utils/openai';
import { z } from 'zod';

// 캘린더 이벤트 스키마 정의
const CalendarEventSchema = z.object({
  name: z.string().describe('이벤트 이름'),
  date: z.string().describe('이벤트 날짜 (YYYY-MM-DD 형식)'),
  participants: z.array(z.string()).describe('참가자 목록'),
  location: z.string().optional().describe('장소'),
  duration: z.number().optional().describe('소요 시간 (분 단위)'),
});

// 회의록 스키마 정의
const MeetingMinutesSchema = z.object({
  title: z.string().describe('회의 제목'),
  date: z.string().describe('회의 날짜'),
  attendees: z.array(z.string()).describe('참석자 목록'),
  keyPoints: z.array(z.string()).describe('주요 논의 사항'),
  actionItems: z.array(z.object({
    task: z.string().describe('할 일'),
    assignee: z.string().describe('담당자'),
    dueDate: z.string().optional().describe('마감일'),
  })).describe('액션 아이템'),
  nextMeeting: z.string().optional().describe('다음 회의 일정'),
});

// 이메일 요약 스키마
const EmailSummarySchema = z.object({
  sender: z.string().describe('발신자'),
  subject: z.string().describe('제목'),
  mainPoints: z.array(z.string()).describe('주요 내용'),
  requiredActions: z.array(z.string()).describe('필요한 조치사항'),
  urgency: z.enum(['low', 'medium', 'high']).describe('긴급도'),
  sentiment: z.enum(['positive', 'neutral', 'negative']).describe('감정 톤'),
});

// 사용 예시
export async function extractCalendarEvent() {
  const event = await createStructuredCompletion(
    [
      { 
        role: 'user', 
        content: '다음 주 금요일에 김철수, 이영희와 함께 과학 박람회에 갑니다. 오전 10시부터 시작해서 약 3시간 정도 걸릴 예정입니다.' 
      }
    ],
    CalendarEventSchema,
    'calendar_event'
  );

  if (event) {
    console.log('추출된 이벤트:', event);
    // 결과:
    // {
    //   name: "과학 박람회",
    //   date: "2024-01-26",
    //   participants: ["김철수", "이영희"],
    //   duration: 180
    // }
  }
}

export async function parseMeetingNotes() {
  const minutes = await createStructuredCompletion(
    [
      {
        role: 'user',
        content: `
        프로젝트 킥오프 미팅
        2024년 1월 19일
        
        참석: 김부장, 이과장, 박대리, 최사원
        
        논의사항:
        - 프로젝트 일정 확정
        - 역할 분담 논의
        - 예산 검토
        
        할 일:
        - 김부장: 예산안 작성 (1/22까지)
        - 이과장: 개발 일정 수립 (1/24까지)
        - 박대리: 디자인 목업 준비
        
        다음 미팅: 1월 26일 오후 2시
        `
      }
    ],
    MeetingMinutesSchema,
    'meeting_minutes'
  );

  if (minutes) {
    console.log('정리된 회의록:', JSON.stringify(minutes, null, 2));
  }
}

export async function analyzeEmail() {
  const summary = await createStructuredCompletion(
    [
      {
        role: 'user',
        content: `
        From: 고객지원팀장 <support@company.com>
        Subject: 긴급 - 시스템 장애 관련 대응 요청
        
        안녕하세요,
        
        오늘 오후 2시경부터 주요 고객사에서 시스템 접속 불가 문제가 발생하고 있습니다.
        현재까지 약 50건의 문의가 접수되었으며, 계속 증가하고 있는 상황입니다.
        
        긴급히 다음 사항들을 확인 부탁드립니다:
        1. 서버 상태 점검
        2. 최근 배포 내역 확인
        3. 임시 해결 방안 마련
        
        가능한 빨리 상황을 파악하여 회신 부탁드립니다.
        고객사 대응을 위해 최대한 신속한 조치가 필요합니다.
        
        감사합니다.
        `
      }
    ],
    EmailSummarySchema,
    'email_summary'
  );

  if (summary) {
    console.log('이메일 분석 결과:', summary);
  }
}

// TypeScript 타입 추론 활용
type CalendarEvent = z.infer<typeof CalendarEventSchema>;
type MeetingMinutes = z.infer<typeof MeetingMinutesSchema>;
type EmailSummary = z.infer<typeof EmailSummarySchema>;

// 타입 안전한 함수 예시
export function processCalendarEvent(event: CalendarEvent) {
  // TypeScript가 타입을 완벽하게 이해합니다
  console.log(`이벤트: ${event.name}`);
  console.log(`날짜: ${event.date}`);
  console.log(`참가자: ${event.participants.join(', ')}`);
  
  if (event.location) {
    console.log(`장소: ${event.location}`);
  }
}