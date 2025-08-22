import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, MessageSquare, Target, CheckSquare, Bot, Calendar, FileText, Globe } from 'lucide-react';

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  demo: {
    type: 'chat' | 'kanban' | 'goal' | 'ai' | 'meeting';
    steps: string[];
  };
}

const FeatureShowcase: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<string>('chat');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const features: Feature[] = [
    {
      id: 'chat',
      title: '팀 채팅',
      description: 'AI와 함께하는 실시간 협업',
      icon: <MessageSquare className="w-6 h-6" />,
      color: 'from-blue-500 to-cyan-400',
      demo: {
        type: 'chat',
        steps: [
          '팀원이 프로젝트 질문을 입력합니다',
          'AI가 즉시 관련 정보를 분석합니다',
          '팀원들과 인사이트를 공유합니다',
          '대화 내용이 자동으로 저장됩니다'
        ]
      }
    },
    {
      id: 'goals',
      title: '목표 관리',
      description: '연간 목표를 체계적으로 추적',
      icon: <Target className="w-6 h-6" />,
      color: 'from-purple-500 to-pink-400',
      demo: {
        type: 'goal',
        steps: [
          '연간 목표를 설정합니다',
          '부서별 세부 목표로 분해합니다',
          '진행 상황을 실시간으로 추적합니다',
          '목표 달성시 팀에 알림이 전송됩니다'
        ]
      }
    },
    {
      id: 'tasks',
      title: '업무 관리',
      description: '칸반 보드로 효율적인 업무 추적',
      icon: <CheckSquare className="w-6 h-6" />,
      color: 'from-green-500 to-emerald-400',
      demo: {
        type: 'kanban',
        steps: [
          '새로운 업무를 생성합니다',
          '팀원에게 업무를 할당합니다',
          '드래그로 진행 상태를 변경합니다',
          '완료시 자동으로 리포트가 생성됩니다'
        ]
      }
    },
    {
      id: 'ai',
      title: 'AI 도구',
      description: '8가지 전문 AI 도구',
      icon: <Bot className="w-6 h-6" />,
      color: 'from-orange-500 to-red-400',
      demo: {
        type: 'ai',
        steps: [
          '필요한 AI 도구를 선택합니다',
          '문서나 데이터를 업로드합니다',
          'AI가 즉시 분석을 시작합니다',
          '결과를 팀과 공유할 수 있습니다'
        ]
      }
    }
  ];

  const activeFeatureData = features.find(f => f.id === activeFeature);

  React.useEffect(() => {
    if (isPlaying && activeFeatureData) {
      const interval = setInterval(() => {
        setCurrentStep((prev) => 
          prev < activeFeatureData.demo.steps.length - 1 ? prev + 1 : 0
        );
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [isPlaying, activeFeatureData]);

  const renderDemo = () => {
    if (!activeFeatureData) return null;

    const { demo } = activeFeatureData;

    switch (demo.type) {
      case 'chat':
        return (
          <div className="bg-gray-50 rounded-xl p-6 h-full">
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {currentStep === 0 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-start space-x-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">👤</div>
                    <div className="bg-white rounded-lg p-3 shadow-sm flex-1">
                      <p className="text-sm text-gray-700">케이팝데몬헌터스 론처 전략은 어떻게 진행되고 있나요?</p>
                    </div>
                  </motion.div>
                )}
                {currentStep === 1 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-center py-4"
                  >
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
                    </div>
                  </motion.div>
                )}
                {currentStep === 2 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-start space-x-3 justify-end"
                  >
                    <div className="bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg p-3 shadow-sm max-w-xs">
                      <p className="text-sm">현재 3단계 마케팅 전략 중 2단계까지 완료되었습니다. SNS 캠페인은 152% 목표 달성률을 보이고 있습니다.</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">🤖</div>
                  </motion.div>
                )}
                {currentStep === 3 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-blue-50 rounded-lg p-3 text-center"
                  >
                    <p className="text-sm text-blue-700">대화가 자동으로 저장되었습니다 ✓</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );

      case 'kanban':
        return (
          <div className="bg-gray-50 rounded-xl p-6 h-full">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-700">할 일</h4>
                <AnimatePresence>
                  {currentStep === 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="bg-white rounded-lg p-3 shadow-sm border-2 border-dashed border-primary"
                    >
                      <p className="text-sm font-medium">새 UI 디자인</p>
                      <p className="text-xs text-gray-500 mt-1">담당: 김지은</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-700">진행 중</h4>
                <AnimatePresence>
                  {(currentStep === 1 || currentStep === 2) && (
                    <motion.div
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 50 }}
                      drag
                      className="bg-yellow-50 rounded-lg p-3 shadow-sm cursor-move"
                    >
                      <p className="text-sm font-medium">API 개발</p>
                      <p className="text-xs text-gray-500 mt-1">담당: 이준호</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-700">완료</h4>
                <AnimatePresence>
                  {currentStep === 3 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 1.2 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-green-50 rounded-lg p-3 shadow-sm"
                    >
                      <p className="text-sm font-medium">데이터베이스 설계</p>
                      <p className="text-xs text-gray-500 mt-1">✓ 완료됨</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        );

      case 'goal':
        return (
          <div className="bg-gray-50 rounded-xl p-6 h-full">
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h4 className="text-lg font-semibold text-gray-800">2024년 연간 목표</h4>
              </div>
              <AnimatePresence mode="wait">
                {currentStep >= 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">매출 성장</span>
                        <span className="text-sm font-semibold text-primary">73%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: currentStep >= 2 ? '73%' : '0%' }}
                          transition={{ duration: 1, delay: 0.5 }}
                          className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-400"
                        />
                      </div>
                    </div>
                    {currentStep >= 1 && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-purple-50 rounded-lg p-3 text-sm"
                      >
                        <p className="font-medium text-purple-700">부서별 세부 목표</p>
                        <p className="text-purple-600 text-xs mt-1">마케팅: 85% | 개발: 92% | 영업: 67%</p>
                      </motion.div>
                    )}
                    {currentStep === 3 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-green-100 rounded-lg p-3 text-center"
                      >
                        <p className="text-sm font-medium text-green-700">🎉 분기 목표 달성!</p>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );

      case 'ai':
        return (
          <div className="bg-gray-50 rounded-xl p-6 h-full">
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {currentStep === 0 && (
                  <motion.div
                    key="ai-step1"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="grid grid-cols-2 gap-3"
                  >
                    {['문서 분석', '데이터 분석', '번역', 'PPT 기획'].map((tool, idx) => (
                      <div key={idx} className={`bg-white rounded-lg p-3 text-center shadow-sm hover:shadow-md transition-shadow cursor-pointer ${idx === 0 ? 'border-2 border-primary' : ''}`}>
                        <p className="text-sm font-medium">{tool}</p>
                      </div>
                    ))}
                  </motion.div>
                )}
                {currentStep === 1 && (
                  <motion.div
                    key="ai-step2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
                  >
                    <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">문서를 드래그하여 업로드</p>
                  </motion.div>
                )}
                {currentStep === 2 && (
                  <motion.div
                    key="ai-step3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-white rounded-lg p-4 shadow-sm"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <div>
                        <p className="text-sm font-medium">AI 분석 중...</p>
                        <p className="text-xs text-gray-500">계약서 주요 조항 추출 중</p>
                      </div>
                    </div>
                  </motion.div>
                )}
                {currentStep === 3 && (
                  <motion.div
                    key="ai-step4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4"
                  >
                    <p className="text-sm font-medium text-gray-800 mb-2">분석 완료!</p>
                    <p className="text-xs text-gray-600">15개의 주요 조항 발견</p>
                    <button className="mt-3 text-xs bg-primary text-white px-3 py-1 rounded-lg">팀과 공유하기</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">실시간 기능 데모</h2>
        <p className="text-gray-600">TeamPulse의 주요 기능을 직접 확인해보세요</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Feature Selector */}
        <div className="space-y-3">
          {features.map((feature) => (
            <motion.button
              key={feature.id}
              whileHover={{ x: 5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setActiveFeature(feature.id);
                setCurrentStep(0);
                setIsPlaying(false);
              }}
              className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${
                activeFeature === feature.id
                  ? `bg-gradient-to-r ${feature.color} text-white shadow-lg`
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  activeFeature === feature.id ? 'bg-white/20' : 'bg-white'
                }`}>
                  <div className={`w-6 h-6 ${activeFeature === feature.id ? 'text-white' : 'text-gray-700'}`}>
                    {feature.icon}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className={`text-sm mt-1 ${
                    activeFeature === feature.id ? 'text-white/80' : 'text-gray-500'
                  }`}>
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Demo Area */}
        <div className="space-y-4">
          <div className="h-64 relative">
            {renderDemo()}
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? '일시정지' : '자동 재생'}</span>
              </button>
              <div className="text-sm text-gray-600">
                단계 {currentStep + 1} / {activeFeatureData?.demo.steps.length || 0}
              </div>
            </div>

            {/* Step Indicators */}
            <div className="flex space-x-2">
              {activeFeatureData?.demo.steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? 'w-8 bg-primary'
                      : 'w-2 bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>

            {/* Current Step Description */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                {activeFeatureData?.demo.steps[currentStep]}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureShowcase;