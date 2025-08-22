import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import LandingHeader from '../components/LandingHeader';
import Footer from '../components/Footer';
import TeamChatPreview from '../components/TeamChatPreview';
import GoalsPreview from '../components/GoalsPreview';
import AIToolsPreview from '../components/AIToolsPreview';
import WorkspacePreview from '../components/WorkspacePreview';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowRight, Sparkles, Shield, Zap, Users, Brain, Target,
  MessageSquare, BarChart3, Calendar, FileText, Rocket,
  CheckCircle, Lock, Check, ChevronDown, ChevronUp
} from 'lucide-react';
import { PRICING, formatPrice } from '../config/pricing';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 300], [0, 50]);
  const y2 = useTransform(scrollY, [0, 300], [0, -50]);
  const [showMoreGPT, setShowMoreGPT] = useState(false);
  const [showMoreClaude, setShowMoreClaude] = useState(false);

  // 컴포넌트 마운트 시 스크롤 최상단으로 초기화
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const stats = [
    { icon: '🚀', value: '10x', label: '업무 효율 향상' },
    { icon: '👥', value: '1,000+', label: '활성 사용자' },
    { icon: '⚡', value: '99.9%', label: '가동률' },
    { icon: '🎯', value: '4.9/5', label: '고객 만족도' }
  ];

  const features = [
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: 'AI 팀 채팅',
      description: '실시간 AI 어시스턴트와 함께하는 스마트한 팀 커뮤니케이션',
      details: [
        '24/7 즉각적인 AI 응답으로 업무 연속성 보장',
        '컨텍스트 기반 대화로 정확한 답변 제공',
        '다국어 지원으로 글로벌 팀 협업 가능',
        '팀 지식베이스와 연동된 스마트 검색'
      ],
      gradient: 'from-blue-500 to-cyan-400'
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: '목표 관리',
      description: 'OKR 기반의 체계적인 목표 설정과 진행 상황 추적',
      details: [
        '분기별/연간 OKR 자동 관리 및 정렬',
        '실시간 진행률 추적 및 시각화',
        '목표 달성 예측 및 위험 요소 알림',
        '팀원별 기여도 분석 및 성과 대시보드'
      ],
      gradient: 'from-purple-500 to-pink-400'
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: '실시간 분석',
      description: '데이터 기반 인사이트로 팀 성과 극대화',
      details: [
        'AI 기반 예측 분석 및 트렌드 파악',
        '맞춤형 KPI 대시보드 자동 생성',
        '이상 징후 감지 및 조기 경보 시스템',
        '주간/월간 자동 리포트 생성'
      ],
      gradient: 'from-green-500 to-emerald-400'
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      title: '스마트 미팅',
      description: 'AI가 지원하는 효율적인 회의 관리 시스템',
      details: [
        '회의록 자동 작성 및 액션 아이템 추출',
        '참석자 일정 자동 조율 및 최적 시간 추천',
        '회의 효율성 분석 및 개선 제안',
        '팔로우업 자동 추적 및 리마인더'
      ],
      gradient: 'from-orange-500 to-red-400'
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: '문서 관리',
      description: '팀의 모든 지식을 한 곳에서 관리하고 공유',
      details: [
        'AI 자동 태깅 및 스마트 분류 시스템',
        '버전 관리 및 변경 이력 추적',
        '문서 내 검색 및 연관 자료 추천',
        '실시간 협업 편집 및 코멘트 기능'
      ],
      gradient: 'from-indigo-500 to-purple-400'
    },
    {
      icon: <Rocket className="w-8 h-8" />,
      title: '업무 자동화',
      description: '반복적인 작업을 AI가 대신 처리',
      details: [
        '워크플로우 자동화로 수작업 90% 감소',
        '이메일/슬랙 자동 응답 및 분류',
        '데이터 입력 및 보고서 자동 생성',
        'API 연동으로 외부 툴과 원활한 통합'
      ],
      gradient: 'from-pink-500 to-rose-400'
    }
  ];


  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 opacity-70" />
          <motion.div
            style={{ y: y1 }}
            className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
          />
          <motion.div
            style={{ y: y2 }}
            className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"
          />
        </div>
        
        <div className="relative px-4 pt-20 pb-16 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mx-auto max-w-7xl"
          >
            <div className="text-center">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full mb-8"
              >
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-800">AI 기반 차세대 협업 플랫폼</span>
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl md:text-7xl font-bold mb-6"
              >
                <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  팀의 잠재력을
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AI와 함께 극대화하세요
                </span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed"
              >
                실시간 AI 어시스턴트와 함께 팀 커뮤니케이션을 혁신하고,<br />
                업무 효율성을 극대화하는 차세대 협업 플랫폼
              </motion.p>

              {/* CTA Buttons */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                {user ? (
                  <>
                    <Link
                      to="/workspaces"
                      className="group inline-flex items-center px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-300 shadow-lg"
                    >
                      내 프로젝트로 이동
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link
                      to="/ai-tools"
                      className="group inline-flex items-center px-8 py-4 rounded-xl bg-white border-2 border-gray-200 text-gray-700 font-semibold hover:border-purple-300 hover:shadow-lg hover:scale-105 transition-all duration-300"
                    >
                      <Brain className="mr-2 w-5 h-5" />
                      AI 도구 사용하기
                    </Link>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => navigate('/login')}
                      className="group inline-flex items-center px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-300 shadow-lg"
                    >
                      무료로 시작하기
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                      onClick={() => navigate('/login')}
                      className="group inline-flex items-center px-8 py-4 rounded-xl bg-white border-2 border-gray-200 text-gray-700 font-semibold hover:border-purple-300 hover:shadow-lg hover:scale-105 transition-all duration-300"
                    >
                      <Lock className="mr-2 w-5 h-5" />
                      로그인
                    </button>
                  </>
                )}
              </motion.div>

              {/* Trust Indicators */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.8 }}
                className="flex flex-wrap items-center justify-center gap-8 text-gray-600 mt-12"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium">보안 인증 완료</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-medium">99.9% 가동률</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium">1,000+ 기업 사용</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Interactive Previews Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                실제로 경험해보세요
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              TeamPulse의 핵심 기능들을 직접 체험하고 팀의 생산성이 어떻게 향상되는지 확인하세요
            </p>
          </motion.div>
          
          {/* Team Chat Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-20"
          >
            <TeamChatPreview />
          </motion.div>

          {/* Goals & OKR Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-20"
          >
            <GoalsPreview />
          </motion.div>

          {/* AI Tools Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-20"
          >
            <AIToolsPreview />
          </motion.div>

          {/* Workspace Management Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <WorkspacePreview />
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                <div className="relative bg-white rounded-2xl p-8 shadow-lg border border-gray-100 h-full text-center">
                  <div className="text-5xl mb-4">{stat.icon}</div>
                  <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-gray-600 mt-2 font-medium">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-7xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                강력한 기능들
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              TeamPulse의 다양한 기능으로 팀의 협업 방식을 혁신하세요
            </p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative bg-white rounded-2xl p-8 shadow-lg border border-gray-100 h-full flex flex-col">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.gradient} text-white mb-6 self-start`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 mb-4">{feature.description}</p>
                  <ul className="space-y-2 mt-auto">
                    {feature.details.map((detail, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                합리적인 가격
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-4">
              팀 규모와 필요에 맞는 플랜을 선택하세요
            </p>
            <p className="text-lg text-gray-500">
              모든 플랜은 <span className="font-semibold text-gray-700">월 {formatPrice(PRICING.subscription.monthly_per_user)}/1인</span> 기본 요금에 AI 토큰 사용량만큼 추가 과금됩니다
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(PRICING.plans).map(([key, plan], index) => {
              const isPopular = key === 'starter';
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="relative"
                >
                  {isPopular && (
                    <div className="absolute -top-5 left-0 right-0 flex justify-center">
                      <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                        가장 인기
                      </span>
                    </div>
                  )}
                  <div className={`h-full bg-white rounded-2xl shadow-lg border-2 ${
                    isPopular ? 'border-blue-500' : 'border-gray-200'
                  } p-8 hover:shadow-xl transition-shadow duration-300`}>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <div className="mb-6">
                      <div className="text-4xl font-bold text-gray-900">
                        {plan.price_per_user === 0 ? '무료' : formatPrice(plan.price_per_user)}
                      </div>
                      {plan.price_per_user > 0 && (
                        <div className="text-gray-500">월/1인</div>
                      )}
                    </div>
                    
                    <div className="mb-6 pb-6 border-b border-gray-200">
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-semibold">포함 AI 토큰:</span>
                      </div>
                      <div className="text-lg font-semibold text-blue-600">
                        월 {new Intl.NumberFormat('ko-KR').format(plan.included_tokens)} 토큰
                      </div>
                      {plan.token_discount > 0 && (
                        <div className="text-sm text-green-600 mt-1">
                          추가 토큰 {(plan.token_discount * 100).toFixed(0)}% 할인
                        </div>
                      )}
                    </div>
                    
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-600">{feature}</span>
                        </li>
                      ))}
                      {plan.max_users > 0 && (
                        <li className="flex items-start gap-2">
                          <Users className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-600">최대 {plan.max_users}명</span>
                        </li>
                      )}
                      {plan.max_users === -1 && (
                        <li className="flex items-start gap-2">
                          <Users className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-600">인원 무제한</span>
                        </li>
                      )}
                    </ul>
                    
                    <button
                      onClick={() => navigate('/login')}
                      className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 ${
                        isPopular
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:scale-105'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {plan.price_per_user === 0 ? '무료로 시작하기' : '선택하기'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* AI Token Pricing Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mt-16 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">AI 토큰 사용 요금</h3>
            <p className="text-sm text-gray-600 mb-6 text-center">10,000 토큰당 요금 (VAT 포함)</p>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* GPT Models */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-600" />
                  OpenAI GPT 모델
                </h4>
                <div className="space-y-3">
                  {/* 주요 모델 (항상 표시) */}
                  {Object.entries(PRICING.ai_tokens.gpt).slice(0, 6).map(([model, prices]) => (
                    <div key={model} className={`bg-white rounded-lg p-4 border ${
                      model === 'GPT-5-mini' ? 'border-green-400 ring-2 ring-green-100' : 'border-gray-200'
                    } hover:border-blue-300 transition-colors`}>
                      <div className="font-medium text-gray-900 mb-2">
                        {model}
                        {model === 'GPT-5' && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">최신</span>}
                        {model === 'GPT-5-mini' && (
                          <>
                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">챗봇 기본</span>
                            <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">추천</span>
                          </>
                        )}
                        {model === 'GPT-5-nano' && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">경제적</span>}
                        {model === 'GPT-4o' && <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">빠른 속도</span>}
                        {model === 'GPT-4o-mini' && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">효율적</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">입력:</span>
                          <span className="ml-2 font-semibold text-gray-700">
                            {formatPrice(prices.input)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">출력:</span>
                          <span className="ml-2 font-semibold text-gray-700">
                            {formatPrice(prices.output)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* 추가 모델 (더보기 클릭 시) */}
                  {showMoreGPT && Object.entries(PRICING.ai_tokens.gpt).slice(6).map(([model, prices]) => (
                    <div key={model} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors">
                      <div className="font-medium text-gray-900 mb-2">
                        {model}
                        {model === 'o3' && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">최고급 추론</span>}
                        {model === 'o3-mini' && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">효율적 추론</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">입력:</span>
                          <span className="ml-2 font-semibold text-gray-700">
                            {formatPrice(prices.input)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">출력:</span>
                          <span className="ml-2 font-semibold text-gray-700">
                            {formatPrice(prices.output)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* 더보기 버튼 */}
                  <button
                    onClick={() => setShowMoreGPT(!showMoreGPT)}
                    className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    {showMoreGPT ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        접기
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        추론 모델 더보기
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Claude Models */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Anthropic Claude 모델
                </h4>
                <div className="space-y-3">
                  {/* 주요 모델 (항상 표시) - Opus 4.1 제외 */}
                  {Object.entries(PRICING.ai_tokens.claude).slice(1, 4).map(([model, prices]) => (
                    <div key={model} className={`bg-white rounded-lg p-4 border ${
                      model === 'Claude Sonnet 4' ? 'border-purple-400 ring-2 ring-purple-100' : 'border-gray-200'
                    } hover:border-purple-300 transition-colors`}>
                      <div className="font-medium text-gray-900 mb-2">
                        {model}
                        {model === 'Claude Opus 4' && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">고성능</span>}
                        {model === 'Claude Sonnet 4' && (
                          <>
                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">챗봇 기본</span>
                            <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">추천</span>
                          </>
                        )}
                        {model === 'Claude Haiku 3.5' && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">경제적</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">입력:</span>
                          <span className="ml-2 font-semibold text-gray-700">
                            {formatPrice(prices.input)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">출력:</span>
                          <span className="ml-2 font-semibold text-gray-700">
                            {formatPrice(prices.output)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* 추가 모델 (더보기 클릭 시) - Opus 4.1과 레거시 모델들 */}
                  {showMoreClaude && (
                    <>
                      {/* Opus 4.1 */}
                      {Object.entries(PRICING.ai_tokens.claude).slice(0, 1).map(([model, prices]) => (
                        <div key={model} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
                          <div className="font-medium text-gray-900 mb-2">
                            {model}
                            <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">최신</span>
                            <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">최고 성능</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">입력:</span>
                              <span className="ml-2 font-semibold text-gray-700">
                                {formatPrice(prices.input)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">출력:</span>
                              <span className="ml-2 font-semibold text-gray-700">
                                {formatPrice(prices.output)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {/* 레거시 모델들 */}
                      {Object.entries(PRICING.ai_tokens.claude).slice(4).map(([model, prices]) => (
                        <div key={model} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
                          <div className="font-medium text-gray-900 mb-2">
                            {model}
                            {model === 'Claude Sonnet 3.7' && <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">레거시</span>}
                            {model === 'Claude Opus 3' && <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">레거시</span>}
                            {model === 'Claude Haiku 3' && <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">레거시</span>}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">입력:</span>
                              <span className="ml-2 font-semibold text-gray-700">
                                {formatPrice(prices.input)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">출력:</span>
                              <span className="ml-2 font-semibold text-gray-700">
                                {formatPrice(prices.output)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  
                  {/* 더보기 버튼 */}
                  <button
                    onClick={() => setShowMoreClaude(!showMoreClaude)}
                    className="w-full py-2 text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    {showMoreClaude ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        접기
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        더 많은 모델 보기
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-8 space-y-3">
              <div className="p-4 bg-blue-100 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>💡 Tip:</strong> 상위 플랜일수록 더 많은 무료 토큰과 추가 토큰 할인 혜택을 받으실 수 있습니다.
                </p>
              </div>
              <div className="p-4 bg-green-100 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>🎯 챗봇 기본 모델:</strong> GPT-5-mini와 Claude Sonnet 4는 TeamPulse 챗봇의 기본 모델로, 성능과 비용의 균형이 가장 좋습니다.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Additional Services */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mt-12"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">추가 서비스</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(PRICING.addons).map(([key, addon]) => (
                <div key={key} className="bg-white rounded-lg p-6 border border-gray-200 hover:border-blue-300 transition-colors duration-300">
                  <h4 className="font-semibold text-gray-900 mb-2">{addon.name}</h4>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatPrice('price' in addon ? addon.price : addon.price_per_gb || 0)}
                    {'price_per_gb' in addon && <span className="text-sm font-normal">/GB</span>}
                    {'price' in addon && <span className="text-sm font-normal">/월</span>}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              지금 바로 시작하세요
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              14일 무료 체험으로 TeamPulse의 모든 기능을 경험해보세요
            </p>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center px-8 py-4 rounded-xl bg-white text-blue-600 font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-300 shadow-lg"
            >
              무료 체험 시작하기
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>
            <p className="text-sm text-blue-100 mt-4">
              신용카드 없이 시작 가능 • 언제든 취소 가능
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;