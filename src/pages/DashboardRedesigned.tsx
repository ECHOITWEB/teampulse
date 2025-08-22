import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUpRight, ArrowDownRight, Calendar, Users, 
  Briefcase, CheckCircle, Activity, TrendingUp,
  MessageSquare, Target, Clock, BarChart3, Zap,
  AlertCircle, ChevronRight
} from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { colors, typography, spacing, componentStyles, roleColors, animations, shadows } from '../styles/DesignSystem';

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  gradient: string;
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
  role?: 'owner' | 'admin' | 'member';
}

interface ProjectProgress {
  id: number;
  name: string;
  progress: number;
  deadline: string;
  team: string;
  status: 'on-track' | 'at-risk' | 'delayed';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon, gradient, delay = 0 }) => {
  const isPositive = change >= 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5, scale: 1.02 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <motion.div
          whileHover={{ scale: 1.1, rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.5 }}
          className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg`}
        >
          {icon}
        </motion.div>
        <div className={`flex items-center text-sm font-semibold ${
          isPositive ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
        } px-3 py-1 rounded-full`}>
          {isPositive ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
          <span>{Math.abs(change)}%</span>
        </div>
      </div>
      <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
        {value}
      </p>
    </motion.div>
  );
};

const DashboardRedesigned: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
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
      icon: <Briefcase className="w-7 h-7" />,
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      title: '완료된 업무',
      value: '156',
      change: 8,
      icon: <CheckCircle className="w-7 h-7" />,
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      title: '팀 효율성',
      value: '87%',
      change: -3,
      icon: <Zap className="w-7 h-7" />,
      gradient: 'from-purple-500 to-indigo-500'
    },
    {
      title: '팀원 참여도',
      value: '92%',
      change: 5,
      icon: <Users className="w-7 h-7" />,
      gradient: 'from-orange-500 to-amber-500'
    }
  ];

  const recentActivities: ActivityItem[] = [
    {
      id: 1,
      user: '김지훈',
      action: '새 업무를 생성했습니다',
      target: 'Q1 마케팅 전략',
      time: '5분 전',
      avatar: 'JH',
      type: 'task',
      role: 'owner'
    },
    {
      id: 2,
      user: '이서연',
      action: '목표를 완료했습니다',
      target: '웹사이트 리디자인',
      time: '1시간 전',
      avatar: 'SY',
      type: 'goal',
      role: 'admin'
    },
    {
      id: 3,
      user: '박민수',
      action: '회의를 예약했습니다',
      target: '주간 스프린트 리뷰',
      time: '2시간 전',
      avatar: 'MS',
      type: 'meeting',
      role: 'member'
    },
    {
      id: 4,
      user: '최유진',
      action: '메시지를 남겼습니다',
      target: '디자인 피드백 채널',
      time: '3시간 전',
      avatar: 'YJ',
      type: 'chat',
      role: 'member'
    }
  ];

  const projects: ProjectProgress[] = [
    {
      id: 1,
      name: '모바일 앱 개발',
      progress: 78,
      deadline: '2024-02-15',
      team: '개발팀',
      status: 'on-track'
    },
    {
      id: 2,
      name: '브랜드 리뉴얼',
      progress: 45,
      deadline: '2024-03-01',
      team: '디자인팀',
      status: 'at-risk'
    },
    {
      id: 3,
      name: '고객 데이터 분석',
      progress: 92,
      deadline: '2024-01-31',
      team: '데이터팀',
      status: 'on-track'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'at-risk':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'delayed':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case 'goal':
        return <Target className="w-4 h-4 text-green-600" />;
      case 'meeting':
        return <Calendar className="w-4 h-4 text-purple-600" />;
      case 'chat':
        return <MessageSquare className="w-4 h-4 text-orange-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleStyle = (role?: 'owner' | 'admin' | 'member') => {
    if (!role) return 'bg-gray-500';
    
    switch (role) {
      case 'owner':
        return 'bg-gradient-to-br from-amber-500 to-orange-500';
      case 'admin':
        return 'bg-gradient-to-br from-purple-500 to-indigo-500';
      default:
        return 'bg-gradient-to-br from-gray-400 to-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                안녕하세요, {user?.displayName || '사용자'}님 👋
              </h1>
              <p className="text-gray-600 mt-2">
                {currentWorkspace?.name} 워크스페이스의 현황을 확인하세요
              </p>
            </div>
            
            {/* Period Selector */}
            <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-200">
              {['week', 'month'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    selectedPeriod === period
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {period === 'week' ? '주간' : '월간'}
                </button>
              ))}
            </div>
          </div>
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

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Projects & Charts */}
          <div className="lg:col-span-2 space-y-8">
            {/* Performance Chart */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">팀 성과 추이</h2>
                <BarChart3 className="w-5 h-5 text-gray-400" />
              </div>
              
              <div className="h-64 flex items-end justify-between gap-2">
                <AnimatePresence>
                  {chartData.map((value, index) => (
                    <motion.div
                      key={index}
                      initial={{ height: 0 }}
                      animate={{ height: `${value}%` }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      className="flex-1 bg-gradient-to-t from-blue-600 to-purple-600 rounded-t-lg hover:opacity-80 cursor-pointer relative group"
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {value}%
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              
              <div className="flex justify-between mt-4 text-xs text-gray-500">
                {selectedPeriod === 'week' 
                  ? ['월', '화', '수', '목', '금', '토', '일'].map((day, i) => (
                      <span key={i}>{day}</span>
                    ))
                  : ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'].map((month, i) => (
                      <span key={i} className="text-[10px]">{month.slice(0, 1)}</span>
                    ))
                }
              </div>
            </motion.div>

            {/* Projects Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">진행중인 프로젝트</h2>
                <Link
                  to={`/workspaces/${currentWorkspace?.id}/tasks`}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                >
                  전체보기
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="space-y-4">
                {projects.map((project) => (
                  <motion.div
                    key={project.id}
                    whileHover={{ x: 5 }}
                    className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{project.name}</h3>
                        <p className="text-sm text-gray-500">{project.team}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                        {project.status === 'on-track' ? '정상' : project.status === 'at-risk' ? '주의' : '지연'}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">진행률</span>
                        <span className="font-medium text-gray-900">{project.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${project.progress}%` }}
                          transition={{ duration: 1, delay: 0.2 }}
                          className={`h-2.5 rounded-full ${
                            project.status === 'on-track' 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                              : project.status === 'at-risk'
                              ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                              : 'bg-gradient-to-r from-red-500 to-pink-500'
                          }`}
                        />
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="w-3 h-3 mr-1" />
                        마감일: {new Date(project.deadline).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Column - Activity Feed */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white"
            >
              <h2 className="text-xl font-semibold mb-4">빠른 실행</h2>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to={`/workspaces/${currentWorkspace?.id}/tasks`}
                  className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center hover:bg-white/30 transition-all duration-200"
                >
                  <CheckCircle className="w-6 h-6 mx-auto mb-1" />
                  <span className="text-xs">새 업무</span>
                </Link>
                <Link
                  to={`/workspaces/${currentWorkspace?.id}/meetings`}
                  className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center hover:bg-white/30 transition-all duration-200"
                >
                  <Calendar className="w-6 h-6 mx-auto mb-1" />
                  <span className="text-xs">회의 예약</span>
                </Link>
                <Link
                  to={`/workspaces/${currentWorkspace?.id}/goals`}
                  className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center hover:bg-white/30 transition-all duration-200"
                >
                  <Target className="w-6 h-6 mx-auto mb-1" />
                  <span className="text-xs">목표 설정</span>
                </Link>
                <Link
                  to={`/workspaces/${currentWorkspace?.id}/team-chat`}
                  className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center hover:bg-white/30 transition-all duration-200"
                >
                  <MessageSquare className="w-6 h-6 mx-auto mb-1" />
                  <span className="text-xs">팀 채팅</span>
                </Link>
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">최근 활동</h2>
              
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.8 + index * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${getRoleStyle(activity.role)}`}>
                      {activity.avatar}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm">
                            <span className="font-medium text-gray-900">{activity.user}</span>
                            <span className="text-gray-600"> {activity.action}</span>
                          </p>
                          <p className="text-sm font-medium text-gray-900 mt-0.5">
                            {activity.target}
                          </p>
                        </div>
                        {getActivityIcon(activity.type)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <button className="w-full mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                모든 활동 보기
              </button>
            </motion.div>

            {/* Team Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">팀 현황</h2>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-gray-700">온라인</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">8명</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    <span className="text-sm text-gray-700">회의중</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">3명</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    <span className="text-sm text-gray-700">오프라인</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">4명</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardRedesigned;