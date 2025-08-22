import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Calendar, Users, CheckCircle } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: string;
  color: string;
  delay?: number;
}

interface ActivityItem {
  id: number;
  user: string;
  action: string;
  target: string;
  time: string;
  avatar: string;
  type: 'task' | 'goal' | 'meeting' | 'chat';
}

interface ProjectProgress {
  id: number;
  name: string;
  progress: number;
  deadline: string;
  team: string;
  status: 'on-track' | 'at-risk' | 'delayed';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon, color, delay = 0 }) => {
  const isPositive = change >= 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <motion.div
          whileHover={{ scale: 1.1, rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.5 }}
          className={`w-14 h-14 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white text-2xl shadow-lg`}
        >
          {icon}
        </motion.div>
        <div className={`flex items-center text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
          <span>{Math.abs(change)}%</span>
        </div>
      </div>
      <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </motion.div>
  );
};

const Dashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [chartData, setChartData] = useState<number[]>([]);

  useEffect(() => {
    const data = selectedPeriod === 'week' 
      ? [65, 78, 90, 67, 84, 88, 92]
      : [70, 75, 82, 78, 85, 88, 91, 87, 90, 92, 88, 95];
    setChartData(data);
  }, [selectedPeriod]);

  const metrics = [
    {
      title: '활성 프로젝트',
      value: '24',
      change: 12,
      icon: '📊',
      color: 'from-blue-500 to-cyan-400'
    },
    {
      title: '완료된 업무',
      value: '156',
      change: 8,
      icon: '✅',
      color: 'from-green-500 to-emerald-400'
    },
    {
      title: '팀 효율성',
      value: '87%',
      change: -3,
      icon: '⚡',
      color: 'from-purple-500 to-pink-400'
    },
    {
      title: '팀원 참여도',
      value: '92%',
      change: 5,
      icon: '👥',
      color: 'from-orange-500 to-red-400'
    }
  ];

  const recentActivities: ActivityItem[] = [
    {
      id: 1,
      user: '김지은',
      action: '새 업무를 생성했습니다',
      target: '모바일 앱 UI 개선',
      time: '5분 전',
      avatar: '👩',
      type: 'task'
    },
    {
      id: 2,
      user: '이준호',
      action: '회의를 예약했습니다',
      target: '주간 스프린트 리뷰',
      time: '15분 전',
      avatar: '👨',
      type: 'meeting'
    },
    {
      id: 3,
      user: '박서연',
      action: '목표를 달성했습니다',
      target: 'Q1 매출 목표',
      time: '1시간 전',
      avatar: '👩',
      type: 'goal'
    },
    {
      id: 4,
      user: '최민수',
      action: '팀 채팅에 메시지를 남겼습니다',
      target: '마케팅팀 채널',
      time: '2시간 전',
      avatar: '👨',
      type: 'chat'
    }
  ];

  const projectProgress: ProjectProgress[] = [
    {
      id: 1,
      name: '신규 웹사이트 개발',
      progress: 75,
      deadline: '2024-03-15',
      team: '개발팀',
      status: 'on-track'
    },
    {
      id: 2,
      name: '마케팅 캠페인',
      progress: 45,
      deadline: '2024-02-28',
      team: '마케팅팀',
      status: 'at-risk'
    },
    {
      id: 3,
      name: '고객 서비스 개선',
      progress: 90,
      deadline: '2024-02-20',
      team: '운영팀',
      status: 'on-track'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track': return 'text-green-600 bg-green-50';
      case 'at-risk': return 'text-yellow-600 bg-yellow-50';
      case 'delayed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task': return '📋';
      case 'goal': return '🎯';
      case 'meeting': return '📅';
      case 'chat': return '💬';
      default: return '📌';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            대시보드
          </h1>
          <p className="text-lg text-gray-600">
            팀의 성과와 진행 상황을 한눈에 확인하세요
          </p>
        </motion.div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => (
            <MetricCard
              key={index}
              {...metric}
              delay={index * 0.1}
            />
          ))}
        </div>

        {/* Charts and Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Performance Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">팀 성과 추이</h2>
                <p className="text-sm text-gray-600 mt-1">일일 완료율 추적</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedPeriod('week')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    selectedPeriod === 'week'
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  주간
                </button>
                <button
                  onClick={() => setSelectedPeriod('month')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    selectedPeriod === 'month'
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  월간
                </button>
              </div>
            </div>
            
            {/* Simple Chart Visualization */}
            <div className="h-64 flex items-end justify-between space-x-2">
              {chartData.map((value, index) => (
                <motion.div
                  key={index}
                  initial={{ height: 0 }}
                  animate={{ height: `${value}%` }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.05 }}
                  className="flex-1 bg-gradient-to-t from-primary to-primary-light rounded-t-lg hover:opacity-80 transition-opacity cursor-pointer relative group"
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded">
                    {value}%
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-xs text-gray-500">
              {(selectedPeriod === 'week' 
                ? ['월', '화', '수', '목', '금', '토', '일']
                : ['1주', '2주', '3주', '4주', '5주', '6주', '7주', '8주', '9주', '10주', '11주', '12주']
              ).map((label, index) => (
                <span key={index}>{label}</span>
              ))}
            </div>
          </motion.div>

          {/* Recent Activities */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">최근 활동</h2>
              <Link to="/activities" className="text-sm text-primary hover:text-primary-dark transition-colors">
                전체보기 →
              </Link>
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                  className="flex items-start space-x-3 group cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                      {activity.avatar}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold text-gray-900">{activity.user}</span>
                      <span className="text-gray-600"> {activity.action}</span>
                    </p>
                    <p className="text-sm font-medium text-primary mt-1">{activity.target}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                  <div className="text-xl opacity-50">
                    {getActivityIcon(activity.type)}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Projects Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">프로젝트 진행 상황</h2>
              <p className="text-sm text-gray-600 mt-1">현재 진행 중인 주요 프로젝트</p>
            </div>
            <Link to="/projects" className="text-sm text-primary hover:text-primary-dark transition-colors">
              전체 프로젝트 →
            </Link>
          </div>
          
          <div className="space-y-4">
            {projectProgress.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.8 + index * 0.1 }}
                className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="inline-flex items-center">
                        <Users className="w-3 h-3 mr-1" />
                        {project.team}
                      </span>
                      <span className="mx-2">•</span>
                      <span className="inline-flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(project.deadline).toLocaleDateString('ko-KR')}
                      </span>
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                    {project.status === 'on-track' ? '정상 진행' : project.status === 'at-risk' ? '주의 필요' : '지연'}
                  </span>
                </div>
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${project.progress}%` }}
                      transition={{ duration: 1, delay: 0.9 + index * 0.1 }}
                      className={`h-2 rounded-full ${
                        project.status === 'on-track' ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                        project.status === 'at-risk' ? 'bg-gradient-to-r from-yellow-500 to-orange-400' :
                        'bg-gradient-to-r from-red-500 to-pink-400'
                      }`}
                    />
                  </div>
                  <span className="absolute right-0 -top-6 text-sm font-semibold text-gray-700">
                    {project.progress}%
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Link
            to="/tasks"
            className="group bg-gradient-to-r from-blue-500 to-cyan-400 text-white rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">새 업무 생성</h3>
                <p className="text-blue-100 text-sm mt-1">업무를 추가하고 팀원에게 할당하세요</p>
              </div>
              <div className="text-4xl opacity-80 group-hover:scale-110 transition-transform">📝</div>
            </div>
          </Link>
          
          <Link
            to="/meetings"
            className="group bg-gradient-to-r from-purple-500 to-pink-400 text-white rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">회의 예약</h3>
                <p className="text-purple-100 text-sm mt-1">팀 회의를 예약하고 관리하세요</p>
              </div>
              <div className="text-4xl opacity-80 group-hover:scale-110 transition-transform">📅</div>
            </div>
          </Link>
          
          <Link
            to="/ai-tools"
            className="group bg-gradient-to-r from-orange-500 to-red-400 text-white rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">AI 도구 사용</h3>
                <p className="text-orange-100 text-sm mt-1">AI로 업무 효율을 높이세요</p>
              </div>
              <div className="text-4xl opacity-80 group-hover:scale-110 transition-transform">🤖</div>
            </div>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;