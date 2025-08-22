import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, TrendingUp, CheckCircle, Circle, Clock, Users, BarChart3 } from 'lucide-react';
import useMobileDetection from '../hooks/useMobileDetection';
import '../styles/mobile-goals.css';

interface Goal {
  id: string;
  title: string;
  progress: number;
  status: 'on-track' | 'at-risk' | 'completed';
  keyResults: {
    id: string;
    title: string;
    progress: number;
    completed: boolean;
  }[];
  owner: string;
  dueDate: string;
}

const GoalsPreview: React.FC = () => {
  const { isMobile, isOneHandedMode } = useMobileDetection();
  const [selectedGoal, setSelectedGoal] = useState<string>('goal1');
  const [animatedProgress, setAnimatedProgress] = useState<{ [key: string]: number }>({});

  const goals: Goal[] = [
    {
      id: 'goal1',
      title: '분기 매출 목표 달성',
      progress: 75,
      status: 'on-track',
      owner: '김영업',
      dueDate: 'Q4 2024',
      keyResults: [
        { id: 'kr1', title: '신규 고객 30개 확보', progress: 80, completed: false },
        { id: 'kr2', title: '기존 고객 갱신율 90% 달성', progress: 95, completed: true },
        { id: 'kr3', title: '평균 계약 규모 20% 증가', progress: 50, completed: false }
      ]
    },
    {
      id: 'goal2',
      title: '제품 품질 개선',
      progress: 60,
      status: 'at-risk',
      owner: '박개발',
      dueDate: 'Q4 2024',
      keyResults: [
        { id: 'kr4', title: '버그 발생률 50% 감소', progress: 40, completed: false },
        { id: 'kr5', title: '고객 만족도 4.5점 달성', progress: 70, completed: false },
        { id: 'kr6', title: '코드 커버리지 80% 달성', progress: 85, completed: false }
      ]
    },
    {
      id: 'goal3',
      title: '팀 역량 강화',
      progress: 90,
      status: 'completed',
      owner: '이인사',
      dueDate: 'Q3 2024',
      keyResults: [
        { id: 'kr7', title: '전 직원 교육 프로그램 이수', progress: 100, completed: true },
        { id: 'kr8', title: '팀 만족도 85% 달성', progress: 88, completed: true },
        { id: 'kr9', title: '이직률 5% 이하 유지', progress: 100, completed: true }
      ]
    }
  ];

  useEffect(() => {
    // 프로그레스 바 애니메이션
    const timer = setTimeout(() => {
      const newProgress: { [key: string]: number } = {};
      goals.forEach(goal => {
        newProgress[goal.id] = goal.progress;
        goal.keyResults.forEach(kr => {
          newProgress[kr.id] = kr.progress;
        });
      });
      setAnimatedProgress(newProgress);
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedGoal, goals]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track': return 'text-green-600 bg-green-100';
      case 'at-risk': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const selectedGoalData = goals.find(g => g.id === selectedGoal)!;

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-4 sm:p-8 shadow-lg">
      <div className="mb-4 sm:mb-6">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">목표 및 진행 상황 추적</h3>
        <p className="text-sm sm:text-base text-gray-600">OKR 방식으로 팀의 목표를 체계적으로 관리하세요</p>
      </div>

      <div className={`grid gap-4 sm:gap-6 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
        {/* Goals List */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
            분기 목표
          </h4>
          {goals.map((goal) => (
            <motion.div
              key={goal.id}
              whileHover={{ scale: isMobile ? 1 : 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedGoal(goal.id)}
              className={`p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all touch-target ${
                selectedGoal === goal.id
                  ? 'border-blue-500 bg-white shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <h5 className={`font-semibold text-gray-900 ${isMobile ? 'text-sm line-clamp-2' : ''}`}>{goal.title}</h5>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(goal.status)}`}>
                  {goal.status === 'on-track' ? '순조롭게 진행' : 
                   goal.status === 'at-risk' ? '주의 필요' : '완료'}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {goal.owner}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {goal.dueDate}
                </span>
              </div>

              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${animatedProgress[goal.id] || 0}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={getProgressColor(goal.progress)}
                  style={{ height: '100%' }}
                />
              </div>
              <div className="mt-1 text-right text-sm font-medium text-gray-700">
                {goal.progress}%
              </div>
            </motion.div>
          ))}
        </div>

        {/* Selected Goal Details */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedGoal}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
          >
            <div className="mb-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                주요 결과 (Key Results)
              </h4>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BarChart3 className="w-4 h-4" />
                <span>전체 진행률: {selectedGoalData.progress}%</span>
              </div>
            </div>

            <div className="space-y-4">
              {selectedGoalData.keyResults.map((kr, index) => (
                <motion.div
                  key={kr.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-50 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2">
                      {kr.completed ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400 mt-0.5" />
                      )}
                      <h5 className={`font-medium ${kr.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        {kr.title}
                      </h5>
                    </div>
                  </div>
                  
                  <div className="ml-7">
                    <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${animatedProgress[kr.id] || 0}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 + index * 0.1 }}
                        className={getProgressColor(kr.progress)}
                        style={{ height: '100%' }}
                      />
                    </div>
                    <div className="mt-1 text-right text-sm font-medium text-gray-600">
                      {kr.progress}%
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className={`mt-6 flex gap-3 ${isMobile && isOneHandedMode ? 'flex-col' : ''}`}>
              <motion.button
                whileHover={{ scale: isMobile ? 1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors touch-target"
              >
                결과 업데이트
              </motion.button>
              <motion.button
                whileHover={{ scale: isMobile ? 1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors touch-target"
              >
                상세 보기
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6">
        <motion.div
          whileHover={{ y: isMobile ? 0 : -2 }}
          className="bg-white rounded-lg p-3 sm:p-4 text-center shadow-sm"
        >
          <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 mx-auto mb-2" />
          <div className="text-lg sm:text-2xl font-bold text-gray-900">73%</div>
          <div className="text-xs sm:text-sm text-gray-600">평균 달성률</div>
        </motion.div>
        <motion.div
          whileHover={{ y: isMobile ? 0 : -2 }}
          className="bg-white rounded-lg p-3 sm:p-4 text-center shadow-sm"
        >
          <Target className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mx-auto mb-2" />
          <div className="text-lg sm:text-2xl font-bold text-gray-900">12</div>
          <div className="text-xs sm:text-sm text-gray-600">활성 목표</div>
        </motion.div>
        <motion.div
          whileHover={{ y: isMobile ? 0 : -2 }}
          className="bg-white rounded-lg p-3 sm:p-4 text-center shadow-sm"
        >
          <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 mx-auto mb-2" />
          <div className="text-lg sm:text-2xl font-bold text-gray-900">28</div>
          <div className="text-xs sm:text-sm text-gray-600">완료된 KR</div>
        </motion.div>
      </div>
    </div>
  );
};

export default GoalsPreview;