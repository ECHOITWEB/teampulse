import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface ChatMessage {
  id: string;
  content: string;
  author: string;
  isUser: boolean;
  timestamp: Date;
  avatar?: string;
}

const TeamChat: React.FC = () => {
  const [selectedTeam, setSelectedTeam] = useState('마케팅팀');
  
  // 사용자별 프로필 이미지 URL
  const userAvatars: Record<string, string> = {
    '카리나': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Karina&backgroundColor=b6e3f4',
    '윈터': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Winter&backgroundColor=c0aede',
    '진우': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jinwoo&backgroundColor=d1d4f9',
    '루미': 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lumi&backgroundColor=ffd5dc',
    '김개발': 'https://api.dicebear.com/7.x/avataaars/svg?seed=KimDev&backgroundColor=b6e3f4',
    '이서버': 'https://api.dicebear.com/7.x/avataaars/svg?seed=LeeServer&backgroundColor=c0aede',
    '박결제': 'https://api.dicebear.com/7.x/avataaars/svg?seed=ParkPay&backgroundColor=d1d4f9',
    '김디자인': 'https://api.dicebear.com/7.x/avataaars/svg?seed=KimDesign&backgroundColor=ffd5dc',
    '이아트': 'https://api.dicebear.com/7.x/avataaars/svg?seed=LeeArt&backgroundColor=ffdfba',
    '박모션': 'https://api.dicebear.com/7.x/avataaars/svg?seed=ParkMotion&backgroundColor=baffc9',
    '최기획': 'https://api.dicebear.com/7.x/avataaars/svg?seed=ChoiPlan&backgroundColor=bae1ff',
    '정밸런스': 'https://api.dicebear.com/7.x/avataaars/svg?seed=JungBalance&backgroundColor=ffffba',
  };

  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({
    '개발팀': [],
    '마케팅팀': [
      {
        id: '1',
        content: '케이팝데몬헌터스의 한국 시장 진출 전략에 대해 분석해줘.',
        author: '카리나',
        isUser: true,
        timestamp: new Date('2024-12-22T09:00:00'),
        avatar: userAvatars['카리나']
      },
      {
        id: '2',
        content: '케이팝데몬헌터스의 한국 시장 진출 전략을 분석해드리겠습니다.\n\n🎯 주요 타겟층 분석:\n- 10-20대 K-POP 팬덤 (특히 글로벌 팬덤과의 연계)\n- 캐릭터 수집형 게임 유저\n- 리듬게임 경험자\n\n📊 시장 기회:\n1. K-POP x 게임 콜라보 시장 성장세 (연평균 35% 성장)\n2. 글로벌 팬덤의 한국 콘텐츠 소비 증가\n3. 아이돌 IP 활용 게임의 높은 수익성\n\n💡 추천 전략:\n- 인기 아이돌과의 콜라보레이션\n- 한국 전용 캐릭터 및 스토리 개발\n- 팬 커뮤니티 연계 이벤트',
        author: 'TeamPulse AI',
        isUser: false,
        timestamp: new Date('2024-12-22T09:01:00')
      },
      {
        id: '3',
        content: '좋은 분석이네요! 경쟁사 분석도 추가로 부탁드려요.',
        author: '윈터',
        isUser: true,
        timestamp: new Date('2024-12-22T09:15:00'),
        avatar: userAvatars['윈터']
      },
      {
        id: '4',
        content: '주요 경쟁사 분석을 추가로 제공하겠습니다.\n\n🏢 주요 경쟁사:\n\n1. **리듬하이브 (HYBE)**\n   - MAU: 500만+\n   - 강점: BTS, SEVENTEEN 등 자체 아티스트 IP\n   - 약점: 타사 아티스트 콘텐츠 부족\n\n2. **슈퍼스타 시리즈 (Dalcomsoft)**\n   - MAU: 300만+\n   - 강점: 다양한 엔터사와의 파트너십\n   - 약점: 게임성 차별화 부족\n\n3. **프로젝트 세카이 (SEGA)**\n   - MAU: 200만+\n   - 강점: 높은 게임 퀄리티, 보컬로이드 팬덤\n   - 약점: K-POP 콘텐츠 부재\n\n🎮 차별화 포인트:\n- 데몬 헌팅 + 리듬게임의 독특한 조합\n- 글로벌 K-POP 아티스트 총망라\n- 실시간 협동 플레이 기능',
        author: 'TeamPulse AI',
        isUser: false,
        timestamp: new Date('2024-12-22T09:16:00')
      },
      {
        id: '5',
        content: '마케팅 예산은 어느 정도로 잡아야 할까요? 초기 3개월 기준으로 알려주세요.',
        author: '진우',
        isUser: true,
        timestamp: new Date('2024-12-22T09:30:00'),
        avatar: userAvatars['진우']
      },
      {
        id: '6',
        content: '케이팝데몬헌터스 한국 런칭 초기 3개월 마케팅 예산안입니다.\n\n💰 총 예산: 15-20억원 (권장)\n\n📍 세부 배분:\n\n1. **디지털 마케팅 (40%, 6-8억원)**\n   - 유튜브/틱톡 광고: 3억원\n   - 인스타그램/트위터: 2억원\n   - 네이버/카카오 검색광고: 1-3억원\n\n2. **인플루언서 마케팅 (30%, 4.5-6억원)**\n   - 대형 게임 유튜버: 2-3억원\n   - K-POP 리액션 유튜버: 1.5-2억원\n   - 틱톡 크리에이터: 1억원\n\n3. **콜라보/이벤트 (20%, 3-4억원)**\n   - 아이돌 콜라보 계약금\n   - 오프라인 팝업스토어\n   - 런칭 기념 팬미팅\n\n4. **PR/미디어 (10%, 1.5-2억원)**\n   - 보도자료 배포\n   - 게임 전문 매체 광고\n   - 커뮤니티 관리\n\n🎯 예상 성과:\n- D+30 다운로드: 100만+\n- D+90 MAU: 50만+\n- ROAS: 150-200%',
        author: 'TeamPulse AI',
        isUser: false,
        timestamp: new Date('2024-12-22T09:31:00')
      },
      {
        id: '7',
        content: '프리런칭 전략도 필요할 것 같은데, 사전예약 캠페인은 어떻게 진행하면 좋을까요?',
        author: '루미',
        isUser: true,
        timestamp: new Date('2024-12-22T09:45:00'),
        avatar: userAvatars['루미']
      },
      {
        id: '8',
        content: '케이팝데몬헌터스 사전예약 캠페인 전략을 제안드립니다.\n\n🚀 **사전예약 캠페인 로드맵 (D-60 ~ D-Day)**\n\n**Phase 1: 티징 (D-60 ~ D-45)**\n- 미스터리 티저 영상 공개\n- "데몬이 K-POP을 노린다" 컨셉\n- SNS 바이럴 챌린지 시작\n\n**Phase 2: 본격 공개 (D-45 ~ D-30)**\n- 게임 플레이 영상 공개\n- 초대 아티스트 라인업 발표 (순차적)\n- CBT 참가자 모집\n\n**Phase 3: 보상 확대 (D-30 ~ D-15)**\n- 사전예약 리워드 공개\n  * 10만: SR급 캐릭터\n  * 50만: 한정 스킨 + 다이아 1000개\n  * 100만: SSR급 캐릭터 + 추가 보상\n- 친구 추천 이벤트\n\n**Phase 4: 카운트다운 (D-15 ~ D-Day)**\n- 매일 신규 콘텐츠 공개\n- 라이브 스트리밍 이벤트\n- 런칭 D-1 카운트다운 파티\n\n💎 **특별 전략**\n- K-POP 아티스트 응원 영상\n- 글로벌 동시 사전예약 (한/영/일)\n- NFT 한정판 캐릭터 추첨 이벤트\n\n🎯 **예상 성과**\n- 사전예약자 150만명\n- 커뮤니티 가입자 10만명\n- 런칭일 DAU 전환율 70%+',
        author: 'TeamPulse AI',
        isUser: false,
        timestamp: new Date('2024-12-22T09:46:00')
      }
    ],
    '디자인팀': [],
    '기획팀': []
  });
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const teams = ['개발팀', '마케팅팀', '디자인팀', '기획팀'];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedTeam]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const currentUser = '나';
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage,
      author: currentUser,
      isUser: true,
      timestamp: new Date(),
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me&backgroundColor=ffb6c1'
    };

    setMessages(prev => ({
      ...prev,
      [selectedTeam]: [...prev[selectedTeam], userMessage]
    }));
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `당신은 ${selectedTeam}의 협업을 돕는 AI 어시스턴트입니다. 팀의 업무와 관련된 질문에 답하고 도움을 제공합니다.`
            },
            ...messages[selectedTeam].map(msg => ({
              role: msg.isUser ? 'user' : 'assistant',
              content: msg.content
            })),
            { role: 'user', content: inputMessage }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response.data.choices[0].message.content,
        author: 'TeamPulse AI',
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => ({
        ...prev,
        [selectedTeam]: [...prev[selectedTeam], aiMessage]
      }));
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: '죄송합니다. 메시지를 전송하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        author: 'System',
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => ({
        ...prev,
        [selectedTeam]: [...prev[selectedTeam], errorMessage]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex h-[calc(100vh-200px)] max-w-7xl mx-auto p-4 gap-4">
      {/* Team Selector - Sidebar */}
      <div className="w-64 bg-gray-50 rounded-2xl p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 px-2">팀 선택</h3>
        <div className="space-y-2">
          {teams.map(team => (
            <button
              key={team}
              onClick={() => setSelectedTeam(team)}
              className={`
                w-full text-left px-4 py-3 rounded-xl font-medium transition-all duration-200
                ${selectedTeam === team 
                  ? 'bg-primary text-white shadow-md' 
                  : 'bg-white text-gray-700 hover:bg-gray-100 hover:shadow-sm'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <span>{team}</span>
                {selectedTeam === team && (
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                    {messages[team].length}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col">
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark p-4 text-white">
          <h2 className="text-xl font-semibold">{selectedTeam} 채팅</h2>
          <p className="text-sm opacity-90">팀원들과 AI가 함께 협업하는 공간</p>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {messages[selectedTeam].length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-gray-500 text-lg">아직 대화가 없습니다.</p>
              <p className="text-gray-400 mt-2">질문을 입력하여 대화를 시작해보세요!</p>
            </div>
          ) : (
            messages[selectedTeam].map(message => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${message.isUser ? 'order-2' : 'order-1'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                    {message.avatar ? (
                      <img 
                        src={message.avatar} 
                        alt={message.author} 
                        className="w-8 h-8 rounded-full"
                      />
                    ) : !message.isUser ? (
                      <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        AI
                      </div>
                    ) : null}
                    <span className="text-sm font-medium text-gray-600">{message.author}</span>
                    <span className="text-xs text-gray-400">{formatTime(message.timestamp)}</span>
                  </div>
                  <div
                    className={`
                      px-4 py-3 rounded-2xl 
                      ${message.isUser 
                        ? 'bg-primary text-white rounded-tr-sm ml-10' 
                        : 'bg-white text-gray-800 rounded-tl-sm shadow-sm mr-10'
                      }
                    `}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Container */}
        <div className="border-t bg-white p-4">
          <div className="flex gap-3">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="팀과 공유할 질문을 입력하세요..."
              disabled={isLoading}
              className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed min-h-[50px] max-h-[150px]"
              rows={1}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>전송 중...</span>
                </>
              ) : (
                <>
                  <span>전송</span>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamChat;