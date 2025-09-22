import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, TrendingUp, Users, Trophy, Calendar, ChevronRight,
  CheckCircle, Clock, AlertTriangle, BarChart3, Flag, Zap
} from 'lucide-react';

interface KeyResult {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  progress: number;
  status: 'on-track' | 'at-risk' | 'behind' | 'completed';
}

interface Objective {
  id: string;
  title: string;
  description: string;
  type: 'company' | 'team' | 'individual';
  owner: string;
  period: string;
  progress: number;
  keyResults: KeyResult[];
  status: 'on-track' | 'at-risk' | 'behind' | 'completed';
}

const OKRShowcase: React.FC = () => {
  const [selectedObjective, setSelectedObjective] = useState<string>('obj1');

  // Sample OKR data
  const objectives: Objective[] = [
    {
      id: 'obj1',
      title: '글로벌 시장 진출 기반 마련',
      description: '해외 시장 진출을 위한 제품 현지화 및 파트너십 구축',
      type: 'company',
      owner: '경영전략팀',
      period: '2024 Q4',
      progress: 68,
      status: 'on-track',
      keyResults: [
        {
          id: 'kr1',
          title: '영어/일본어 버전 출시',
          currentValue: 1,
          targetValue: 2,
          unit: '개',
          progress: 50,
          status: 'on-track'
        },
        {
          id: 'kr2',
          title: '해외 파트너사 계약 체결',
          currentValue: 3,
          targetValue: 5,
          unit: '개사',
          progress: 60,
          status: 'on-track'
        },
        {
          id: 'kr3',
          title: '글로벌 고객 확보',
          currentValue: 85,
          targetValue: 100,
          unit: '개사',
          progress: 85,
          status: 'on-track'
        }
      ]
    },
    {
      id: 'obj2',
      title: '제품 사용성 혁신으로 고객 만족도 향상',
      description: 'UI/UX 개선 및 AI 기능 강화를 통한 사용자 경험 혁신',
      type: 'team',
      owner: '제품개발팀',
      period: '2024 Q4',
      progress: 75,
      status: 'on-track',
      keyResults: [
        {
          id: 'kr4',
          title: 'NPS 점수 향상',
          currentValue: 72,
          targetValue: 80,
          unit: '점',
          progress: 90,
          status: 'on-track'
        },
        {
          id: 'kr5',
          title: '월간 활성 사용자(MAU) 증가',
          currentValue: 18000,
          targetValue: 25000,
          unit: '명',
          progress: 72,
          status: 'on-track'
        },
        {
          id: 'kr6',
          title: 'AI 기능 활용률',
          currentValue: 45,
          targetValue: 70,
          unit: '%',
          progress: 64,
          status: 'at-risk'
        }
      ]
    },
    {
      id: 'obj3',
      title: '개발 프로세스 효율화',
      description: '자동화 도구 도입 및 프로세스 개선으로 개발 속도 향상',
      type: 'individual',
      owner: '김개발',
      period: '2024 Q4',
      progress: 82,
      status: 'on-track',
      keyResults: [
        {
          id: 'kr7',
          title: '배포 자동화 구축',
          currentValue: 90,
          targetValue: 100,
          unit: '%',
          progress: 90,
          status: 'on-track'
        },
        {
          id: 'kr8',
          title: '코드 리뷰 소요 시간 단축',
          currentValue: 4,
          targetValue: 2,
          unit: '시간',
          progress: 50,
          status: 'at-risk'
        },
        {
          id: 'kr9',
          title: '테스트 커버리지 향상',
          currentValue: 85,
          targetValue: 90,
          unit: '%',
          progress: 94,
          status: 'completed'
        }
      ]
    }
  ];

  const selectedObj = objectives.find(obj => obj.id === selectedObjective);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'on-track': return 'text-blue-600 bg-blue-100';
      case 'at-risk': return 'text-yellow-600 bg-yellow-100';
      case 'behind': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'on-track': return <TrendingUp className="w-4 h-4" />;
      case 'at-risk': return <AlertTriangle className="w-4 h-4" />;
      case 'behind': return <Clock className="w-4 h-4" />;
      default: return <Flag className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'company': return <Trophy className="w-5 h-5 text-purple-600" />;
      case 'team': return <Users className="w-5 h-5 text-blue-600" />;
      case 'individual': return <Target className="w-5 h-5 text-green-600" />;
      default: return <Flag className="w-5 h-5 text-gray-600" />;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-3xl" />
      <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-4 sm:p-6 lg:p-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center justify-center p-2 bg-purple-100 rounded-full mb-4">
            <Target className="w-6 h-6 text-purple-600" />
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              OKR 목표 관리
            </span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-4 sm:px-0">
            조직과 개인의 목표를 체계적으로 관리하고 추적하여 성과를 극대화하세요
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Objectives List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                현재 진행 중인 목표
              </h3>
              <div className="space-y-3">
                {objectives.map((obj) => (
                  <motion.button
                    key={obj.id}
                    onClick={() => setSelectedObjective(obj.id)}
                    className={`w-full text-left p-3 sm:p-4 rounded-xl transition-all ${
                      selectedObjective === obj.id
                        ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2">
                        {getTypeIcon(obj.type)}
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-xs sm:text-sm line-clamp-2">
                            {obj.title}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">{obj.owner}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(obj.status)}`}>
                        {getStatusIcon(obj.status)}
                        {obj.progress}%
                      </span>
                      <span className="text-xs text-gray-500 hidden sm:inline">{obj.period}</span>
                    </div>
                    <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className={getProgressColor(obj.progress)}
                        style={{ width: `${obj.progress}%` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${obj.progress}%` }}
                        transition={{ duration: 1, delay: 0.2 }}
                      />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Selected Objective Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-2"
          >
            {selectedObj && (
              <div className="bg-white rounded-2xl shadow-xl p-8">
                {/* Objective Header */}
                <div className="mb-8">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {getTypeIcon(selectedObj.type)}
                        <span className="text-sm font-medium text-gray-500">
                          {selectedObj.type === 'company' ? '회사 목표' : 
                           selectedObj.type === 'team' ? '팀 목표' : '개인 목표'}
                        </span>
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-500">{selectedObj.period}</span>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {selectedObj.title}
                      </h3>
                      <p className="text-gray-600 mb-4">{selectedObj.description}</p>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {selectedObj.owner.charAt(0)}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-700">{selectedObj.owner}</span>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedObj.status)}`}>
                          {getStatusIcon(selectedObj.status)}
                          <span>
                            {selectedObj.status === 'on-track' ? '정상 진행' :
                             selectedObj.status === 'at-risk' ? '주의 필요' :
                             selectedObj.status === 'behind' ? '지연' : '완료'}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="relative w-24 h-24">
                        <svg className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 transform -rotate-90">
                          <circle
                            cx="48"
                            cy="48"
                            r="36"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            className="text-gray-200"
                          />
                          <circle
                            cx="48"
                            cy="48"
                            r="36"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={`${selectedObj.progress * 2.26} 226`}
                            className={selectedObj.progress >= 80 ? 'text-green-500' :
                                     selectedObj.progress >= 60 ? 'text-blue-500' :
                                     selectedObj.progress >= 40 ? 'text-yellow-500' : 'text-red-500'}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{selectedObj.progress}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Results */}
                <div>
                  <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    핵심 결과 (Key Results)
                  </h4>
                  <div className="space-y-4">
                    <AnimatePresence mode="wait">
                      {selectedObj.keyResults.map((kr, index) => (
                        <motion.div
                          key={kr.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="bg-gray-50 rounded-xl p-3 sm:p-4 lg:p-5"
                        >
                          <div className="flex flex-col sm:flex-row items-start justify-between mb-2 sm:mb-3 gap-2 sm:gap-0">
                            <div className="flex-1">
                              <h5 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">{kr.title}</h5>
                              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                                <span className="text-gray-600">
                                  현재: <span className="font-semibold text-gray-900">{kr.currentValue}{kr.unit}</span>
                                </span>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">
                                  목표: <span className="font-semibold text-blue-600">{kr.targetValue}{kr.unit}</span>
                                </span>
                              </div>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${getStatusColor(kr.status)}`}>
                              {getStatusIcon(kr.status)}
                              {kr.progress}%
                            </span>
                          </div>
                          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                            <motion.div
                              className={getProgressColor(kr.progress)}
                              style={{ width: `${kr.progress}%` }}
                              initial={{ width: 0 }}
                              animate={{ width: `${kr.progress}%` }}
                              transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 sm:mt-6 lg:mt-8 flex flex-col sm:flex-row gap-2 sm:gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 py-2 sm:py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    목표 업데이트
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 py-2 sm:py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl text-sm sm:text-base font-semibold hover:bg-gray-50 transition-all"
                  >
                    상세 보기
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-16 grid md:grid-cols-4 gap-6"
        >
          {[
            { icon: Target, title: '목표 정렬', desc: '회사-팀-개인 목표 연계' },
            { icon: TrendingUp, title: '실시간 추적', desc: '진행 상황 모니터링' },
            { icon: Trophy, title: '성과 측정', desc: '객관적 지표 기반 평가' },
            { icon: Users, title: '협업 강화', desc: '팀 목표 공유 및 협력' }
          ].map((feature, index) => (
            <motion.div
              key={index}
              whileHover={{ y: -5 }}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">{feature.title}</h4>
              <p className="text-sm text-gray-600">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default OKRShowcase;