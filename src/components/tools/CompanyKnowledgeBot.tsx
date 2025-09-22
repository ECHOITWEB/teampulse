import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Building2, Users, Phone, Mail, Target, FileText, TrendingUp, Calendar, MapPin, Shield, Award, Briefcase } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  attachments?: any[];
}

interface CompanyData {
  [key: string]: any;
}

const CompanyKnowledgeBot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: '안녕하세요! 회사 정보 Q&A 봇입니다. 궁금하신 내용을 질문해주세요. 예를 들어:\n• "사업기획본부장이 누구야?"\n• "우리 회사 소개서 보여줘"\n• "재무 부서장 정보 알려줘"\n• "회사의 올해 목표는?"',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // 회사 정보 데이터베이스 (실제로는 Firebase나 API에서 가져옴)
  const companyKnowledge: CompanyData = {
    executives: {
      CEO: {
        name: "김철수",
        position: "대표이사",
        email: "ceo@company.com",
        phone: "010-1234-5678",
        department: "경영진",
        bio: "20년 경력의 IT 업계 전문가"
      },
      사업기획본부장: {
        name: "이영희",
        position: "사업기획본부장",
        email: "lee.yh@company.com",
        phone: "010-2345-6789",
        department: "사업기획본부",
        bio: "전략 기획 및 신사업 개발 전문가"
      },
      재무부서장: {
        name: "박민수",
        position: "재무본부장 / CFO",
        email: "park.ms@company.com",
        phone: "010-3456-7890",
        department: "재무본부",
        bio: "재무 관리 및 투자 전략 수립"
      },
      CTO: {
        name: "최기술",
        position: "최고기술책임자 / CTO",
        email: "choi.tech@company.com",
        phone: "010-4567-8901",
        department: "기술본부",
        bio: "제품 개발 및 기술 혁신 리더"
      },
      HR본부장: {
        name: "정인사",
        position: "인사본부장 / CHRO",
        email: "jung.hr@company.com",
        phone: "010-5678-9012",
        department: "인사본부",
        bio: "조직 문화 및 인재 개발 전문가"
      }
    },
    companyInfo: {
      name: "테크이노베이션 주식회사",
      founded: "2015년 3월",
      employees: "250명",
      location: "서울특별시 강남구 테헤란로 123",
      industry: "소프트웨어 개발 및 IT 서비스",
      revenue: "연매출 500억원 (2023년 기준)",
      vision: "디지털 혁신을 통한 더 나은 미래 창조",
      mission: "고객의 비즈니스 성장을 위한 최고의 기술 파트너"
    },
    goals2024: {
      financial: "매출 700억원 달성",
      market: "국내 시장 점유율 15% 확보",
      product: "AI 기반 신제품 3개 출시",
      people: "핵심 인재 50명 추가 채용",
      global: "동남아 3개국 진출"
    },
    departments: {
      경영지원: {
        head: "김지원",
        members: 15,
        responsibilities: "총무, 법무, 구매 관리"
      },
      영업본부: {
        head: "이세일",
        members: 35,
        responsibilities: "국내외 영업, 고객 관리"
      },
      마케팅팀: {
        head: "박마케",
        members: 20,
        responsibilities: "브랜드 관리, 마케팅 전략, PR"
      },
      개발본부: {
        head: "최개발",
        members: 80,
        responsibilities: "제품 개발, 기술 연구"
      },
      디자인팀: {
        head: "정디자",
        members: 15,
        responsibilities: "UX/UI 디자인, 브랜드 디자인"
      }
    }
  };

  // 질문 처리 함수
  const processQuestion = (question: string): string => {
    const q = question.toLowerCase();
    
    // 임원 정보 관련
    if (q.includes('사업기획본부장')) {
      const exec = companyKnowledge.executives.사업기획본부장;
      return `📋 **사업기획본부장 정보**\n\n👤 이름: ${exec.name}\n📧 이메일: ${exec.email}\n📱 연락처: ${exec.phone}\n🏢 소속: ${exec.department}\n💼 소개: ${exec.bio}`;
    }
    
    if (q.includes('재무') && (q.includes('부서장') || q.includes('본부장'))) {
      const exec = companyKnowledge.executives.재무부서장;
      return `💰 **재무본부장 정보**\n\n👤 이름: ${exec.name}\n📧 이메일: ${exec.email}\n📱 연락처: ${exec.phone}\n🏢 소속: ${exec.department}\n💼 소개: ${exec.bio}`;
    }
    
    if (q.includes('대표') || q.includes('ceo')) {
      const exec = companyKnowledge.executives.CEO;
      return `👔 **대표이사 정보**\n\n👤 이름: ${exec.name}\n📧 이메일: ${exec.email}\n📱 연락처: ${exec.phone}\n💼 소개: ${exec.bio}`;
    }
    
    if (q.includes('cto') || (q.includes('기술') && q.includes('책임자'))) {
      const exec = companyKnowledge.executives.CTO;
      return `💻 **CTO 정보**\n\n👤 이름: ${exec.name}\n📧 이메일: ${exec.email}\n📱 연락처: ${exec.phone}\n🏢 소속: ${exec.department}\n💼 소개: ${exec.bio}`;
    }
    
    // 회사 정보 관련
    if (q.includes('회사') && (q.includes('소개') || q.includes('정보'))) {
      const info = companyKnowledge.companyInfo;
      return `🏢 **회사 소개**\n\n📌 회사명: ${info.name}\n📅 설립: ${info.founded}\n👥 직원 수: ${info.employees}\n📍 위치: ${info.location}\n💼 업종: ${info.industry}\n💰 매출: ${info.revenue}\n\n🎯 **비전**: ${info.vision}\n📋 **미션**: ${info.mission}`;
    }
    
    // 목표 관련
    if (q.includes('목표') || q.includes('okr')) {
      const goals = companyKnowledge.goals2024;
      return `🎯 **2024년 회사 목표**\n\n💰 재무 목표: ${goals.financial}\n📈 시장 목표: ${goals.market}\n🚀 제품 목표: ${goals.product}\n👥 인재 목표: ${goals.people}\n🌏 글로벌 목표: ${goals.global}`;
    }
    
    // 부서 정보
    if (q.includes('부서') || q.includes('조직')) {
      const depts = companyKnowledge.departments;
      let response = "🏢 **부서 현황**\n\n";
      for (const [dept, info] of Object.entries(depts)) {
        const deptInfo = info as any;
        response += `• **${dept}**\n  - 부서장: ${deptInfo.head}\n  - 인원: ${deptInfo.members}명\n  - 담당: ${deptInfo.responsibilities}\n\n`;
      }
      return response;
    }
    
    // 연락처 관련
    if (q.includes('연락처') || q.includes('전화') || q.includes('이메일')) {
      let response = "📞 **주요 연락처**\n\n";
      for (const [role, exec] of Object.entries(companyKnowledge.executives)) {
        const execInfo = exec as any;
        response += `• **${execInfo.position}** (${execInfo.name})\n  📧 ${execInfo.email}\n  📱 ${execInfo.phone}\n\n`;
      }
      return response;
    }
    
    // 기본 응답
    return "죄송합니다. 해당 정보를 찾을 수 없습니다. 다른 질문을 해주세요.\n\n💡 **예시 질문**:\n• 특정 임원 정보 (예: 사업기획본부장, 재무부서장)\n• 회사 소개 및 현황\n• 2024년 목표\n• 부서 정보\n• 연락처 정보";
  };

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    
    // 봇 응답 시뮬레이션
    setTimeout(() => {
      const response = processQuestion(input);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const quickQuestions = [
    "사업기획본부장이 누구야?",
    "우리 회사 소개서",
    "재무 부서장 정보",
    "회사의 올해 목표",
    "부서 현황",
    "임원진 연락처"
  ];

  return (
    <div className="flex flex-col h-[600px]">
      {/* 채팅 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 rounded-t-2xl">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-2xl ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                <div
                  className={`p-4 rounded-2xl shadow-sm ${
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                      : 'bg-white text-gray-800 border border-gray-200'
                  }`}
                >
                  {message.type === 'bot' ? (
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-1">회사 정보 봇</div>
                        <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                </div>
                <div className={`text-xs text-gray-500 mt-1 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                  {message.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center space-x-2 text-gray-500"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex space-x-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </motion.div>
        )}
      </div>

      {/* 빠른 질문 버튼 */}
      <div className="p-3 bg-white border-t border-gray-200">
        <div className="flex flex-wrap gap-2 mb-3">
          {quickQuestions.map((question, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setInput(question)}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors"
            >
              {question}
            </motion.button>
          ))}
        </div>
      </div>

      {/* 입력 영역 */}
      <div className="p-4 bg-white rounded-b-2xl border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="회사 관련 질문을 입력하세요..."
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!input.trim()}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              input.trim()
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default CompanyKnowledgeBot;