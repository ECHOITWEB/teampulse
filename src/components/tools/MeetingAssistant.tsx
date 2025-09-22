import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Play, Pause, FileText, CheckCircle, Users, Target, TrendingUp, Calendar, Clock, AlertCircle } from 'lucide-react';

interface TranscriptLine {
  speaker: string;
  text: string;
  time: string;
}

interface TodoItem {
  id: string;
  task: string;
  assignee: string;
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
}

const MeetingAssistant: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 샘플 OKR 회의 대화 스크립트 (전사만)
  const meetingScript: TranscriptLine[] = [
    { speaker: "", text: "안녕하세요 여러분, 이번 분기 OKR 리뷰 미팅을 시작하겠습니다.", time: "00:00" },
    { speaker: "", text: "먼저 매출 목표 달성률을 확인해보겠습니다. 이부장님?", time: "00:05" },
    { speaker: "", text: "네, 이번 분기 매출 목표는 10억이었고, 현재까지 8.5억을 달성해서 85% 달성률을 보이고 있습니다.", time: "00:10" },
    { speaker: "", text: "좋습니다. 남은 기간 동안 목표 달성을 위한 액션 플랜이 있나요?", time: "00:18" },
    { speaker: "", text: "네, 마케팅팀과 협업해서 프로모션을 진행할 예정이고, 신규 고객 유치를 위한 이벤트를 준비 중입니다.", time: "00:23" },
    { speaker: "", text: "마케팅팀에서는 다음 주부터 SNS 광고를 집중적으로 진행할 예정입니다.", time: "00:32" },
    { speaker: "", text: "좋습니다. 그럼 개발팀 OKR은 어떻게 진행되고 있나요?", time: "00:38" },
    { speaker: "", text: "신규 기능 개발은 90% 완료되었고, 다음 주 화요일에 배포 예정입니다.", time: "00:43" },
    { speaker: "", text: "다만 보안 이슈가 하나 발견되어서 이것부터 해결해야 합니다.", time: "00:50" },
    { speaker: "", text: "보안 이슈는 최우선으로 처리해주세요. 배포 일정은 조정 가능한가요?", time: "00:56" },
    { speaker: "", text: "네, 목요일로 조정하면 충분할 것 같습니다.", time: "01:02" },
    { speaker: "", text: "알겠습니다. HR팀 채용 목표는 어떻게 되고 있나요?", time: "01:07" },
    { speaker: "", text: "개발자 3명, 디자이너 2명 채용 목표 중 개발자 2명 채용 완료했습니다.", time: "01:12" },
    { speaker: "", text: "나머지 인원은 이번 달 안에 채용 완료 예정입니다.", time: "01:19" },
    { speaker: "", text: "좋습니다. 다음 분기 OKR 설정을 위해 다음 주 월요일에 워크샵을 진행하겠습니다.", time: "01:25" },
    { speaker: "", text: "각 팀별로 제안서를 준비해주시고, 이부장님은 시장 분석 자료를 준비해주세요.", time: "01:32" },
    { speaker: "", text: "네, 알겠습니다. 경쟁사 분석도 포함하겠습니다.", time: "01:39" },
    { speaker: "", text: "좋습니다. 오늘 미팅은 여기까지 하겠습니다. 수고하셨습니다.", time: "01:45" }
  ];

  // 녹음 시작/중지
  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setTranscript([]);
      setSummary('');
      setTodos([]);
      setShowAnalysis(false);
      setCurrentTime(0);
      
      // 시뮬레이션: 대화를 순차적으로 추가
      let index = 0;
      intervalRef.current = setInterval(() => {
        if (index < meetingScript.length) {
          setTranscript(prev => [...prev, meetingScript[index]]);
          setCurrentTime(index * 5);
          index++;
        } else {
          setIsRecording(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }, 2000);
    } else {
      setIsRecording(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  };

  // 분석 실행
  const analyzeTranscript = () => {
    setShowAnalysis(true);
    
    // 회의록 요약 생성
    const generatedSummary = `
## 📋 회의 요약

### 주요 안건
1. **Q3 OKR 리뷰**: 전반적인 목표 달성률 점검
2. **매출 현황**: 85% 달성 (8.5억/10억)
3. **개발 진행상황**: 신규 기능 90% 완료
4. **채용 현황**: 개발자 2/3명, 디자이너 0/2명 채용 완료

### 주요 결정사항
- 매출 목표 달성을 위한 프로모션 및 이벤트 진행
- 보안 이슈 최우선 처리 후 배포 (목요일로 연기)
- 다음 분기 OKR 워크샵 일정 확정 (다음 주 월요일)

### 팀별 현황
- **영업팀**: 매출 85% 달성, 신규 고객 유치 전략 수립
- **마케팅팀**: SNS 광고 캠페인 준비 중
- **개발팀**: 신규 기능 개발 90% 완료, 보안 이슈 해결 중
- **HR팀**: 채용 목표 60% 달성, 이번 달 내 완료 예정
    `;
    
    setSummary(generatedSummary);
    
    // To-Do 리스트 생성
    const generatedTodos: TodoItem[] = [
      {
        id: '1',
        task: '보안 이슈 해결 및 패치 적용',
        assignee: '최CTO',
        priority: 'high',
        deadline: '2024-08-22'
      },
      {
        id: '2',
        task: 'SNS 마케팅 캠페인 시작',
        assignee: '박팀장',
        priority: 'high',
        deadline: '2024-08-26'
      },
      {
        id: '3',
        task: '신규 고객 유치 이벤트 기획',
        assignee: '이부장',
        priority: 'high',
        deadline: '2024-08-25'
      },
      {
        id: '4',
        task: '시장 분석 및 경쟁사 분석 자료 준비',
        assignee: '이부장',
        priority: 'medium',
        deadline: '2024-08-26'
      },
      {
        id: '5',
        task: '각 팀별 다음 분기 OKR 제안서 작성',
        assignee: '전체 팀장',
        priority: 'medium',
        deadline: '2024-08-26'
      },
      {
        id: '6',
        task: '개발자 1명, 디자이너 2명 추가 채용',
        assignee: '정HR',
        priority: 'medium',
        deadline: '2024-08-31'
      },
      {
        id: '7',
        task: '신규 기능 배포 (보안 이슈 해결 후)',
        assignee: '최CTO',
        priority: 'high',
        deadline: '2024-08-29'
      }
    ];
    
    setTodos(generatedTodos);
  };

  // 컴포넌트 언마운트 시 인터벌 정리
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* 녹음 컨트롤 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">회의 녹음</h3>
            <p className="text-gray-600">OKR 회의를 녹음하고 자동으로 분석합니다</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">녹음 시간</p>
              <p className="text-2xl font-bold text-gray-900">{formatTime(currentTime)}</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleRecording}
              className={`p-4 rounded-full shadow-lg transition-all ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                  : 'bg-white hover:bg-gray-50 text-gray-700'
              }`}
            >
              {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </motion.button>
          </div>
        </div>
        
        {isRecording && (
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-blue-500 rounded-full"
                  animate={{ height: [8, 20, 8] }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>
            <span className="text-sm text-gray-600">녹음 중...</span>
          </div>
        )}
      </div>

      {/* 대화 내용 */}
      {transcript.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">대화 내용</h3>
            <span className="text-sm text-gray-500">{transcript.length}개 발언</span>
          </div>
          <div className="max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-lg">
            <AnimatePresence>
              {transcript.map((line, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mb-2"
                >
                  <p className="text-gray-700">{line.text}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          {!isRecording && transcript.length > 0 && !showAnalysis && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={analyzeTranscript}
              className="mt-4 w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
            >
              회의 분석하기
            </motion.button>
          )}
        </div>
      )}

      {/* 분석 결과 */}
      {showAnalysis && (
        <>
          {/* 회의록 요약 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200"
          >
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="w-6 h-6 text-blue-500" />
              <h3 className="text-xl font-bold text-gray-900">회의록 요약</h3>
            </div>
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-gray-700">{summary}</div>
            </div>
          </motion.div>

          {/* To-Do 리스트 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200"
          >
            <div className="flex items-center space-x-2 mb-4">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <h3 className="text-xl font-bold text-gray-900">액션 아이템 (To-Do)</h3>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-semibold">
                {todos.length}개
              </span>
            </div>
            <div className="space-y-3">
              {todos.map((todo, index) => (
                <motion.div
                  key={todo.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`p-4 rounded-lg border ${getPriorityColor(todo.priority)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-1">{todo.task}</p>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{todo.assignee}</span>
                        </span>
                        {todo.deadline && (
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{todo.deadline}</span>
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          todo.priority === 'high' ? 'bg-red-100 text-red-700' :
                          todo.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {todo.priority === 'high' ? '높음' : todo.priority === 'medium' ? '보통' : '낮음'}
                        </span>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                      <CheckCircle className="w-5 h-5 text-gray-400 hover:text-green-500" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* 내보내기 버튼 */}
          <div className="flex space-x-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold shadow-lg hover:bg-blue-600 transition-all"
            >
              회의록 다운로드 (PDF)
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold shadow-lg hover:bg-green-600 transition-all"
            >
              To-Do 내보내기
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
};

export default MeetingAssistant;