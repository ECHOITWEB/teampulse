import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: string;
  color: string;
}

interface ActivityItem {
  id: number;
  user: string;
  action: string;
  target: string;
  time: string;
  avatar: string;
}

interface ProjectProgress {
  id: number;
  name: string;
  progress: number;
  deadline: string;
  team: string;
  status: 'on-track' | 'at-risk' | 'delayed';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon, color }) => {
  const isPositive = change >= 0;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-white text-2xl`}>
          {icon}
        </div>
        <div className={`flex items-center text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          <span>{isPositive ? '↑' : '↓'}</span>
          <span className="ml-1">{Math.abs(change)}%</span>
        </div>
      </div>
      <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [chartData, setChartData] = useState<number[]>([]);

  useEffect(() => {
    // Simulate fetching chart data
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
      avatar: '👩'
    },
    {
      id: 2,
      user: '이준호',
      action: '프로젝트를 완료했습니다',
      target: '고객 데이터 분석 보고서',
      time: '23분 전',
      avatar: '👨'
    },
    {
      id: 3,
      user: '박서연',
      action: '댓글을 남겼습니다',
      target: '마케팅 캠페인 기획안',
      time: '1시간 전',
      avatar: '👩'
    },
    {
      id: 4,
      user: '최민준',
      action: '파일을 업로드했습니다',
      target: '2024 Q1 실적 보고서',
      time: '2시간 전',
      avatar: '👨'
    }
  ];

  const projectProgress: ProjectProgress[] = [
    {
      id: 1,
      name: '케이팝데몬헌터스 런처 개발',
      progress: 75,
      deadline: '2024-03-15',
      team: '개발팀',
      status: 'on-track'
    },
    {
      id: 2,
      name: '글로벌 마케팅 캠페인',
      progress: 45,
      deadline: '2024-02-28',
      team: '마케팅팀',
      status: 'at-risk'
    },
    {
      id: 3,
      name: '신규 고객 CRM 시스템',
      progress: 90,
      deadline: '2024-02-15',
      team: '영업팀',
      status: 'on-track'
    },
    {
      id: 4,
      name: '보안 인프라 업그레이드',
      progress: 30,
      deadline: '2024-03-30',
      team: 'IT팀',
      status: 'delayed'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track': return 'text-green-600 bg-green-100';
      case 'at-risk': return 'text-yellow-600 bg-yellow-100';
      case 'delayed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'on-track': return '정상 진행';
      case 'at-risk': return '주의 필요';
      case 'delayed': return '지연됨';
      default: return '알 수 없음';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
          <p className="text-gray-600 mt-2">팀의 성과와 진행 상황을 한눈에 확인하세요</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => (
            <MetricCard key={index} {...metric} />
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section - Takes 2 columns */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">팀 성과 추이</h2>
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
            <div className="relative h-64">
              <div className="absolute inset-0 flex items-end justify-between space-x-2">
                {chartData.map((value, index) => (
                  <div
                    key={index}
                    className="flex-1 bg-gradient-to-t from-primary to-primary-dark rounded-t-lg transition-all duration-300 hover:opacity-80"
                    style={{ height: `${value}%` }}
                  >
                    <div className="text-xs text-white font-medium text-center pt-2">
                      {value}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between mt-4 text-xs text-gray-500">
              {selectedPeriod === 'week' 
                ? ['월', '화', '수', '목', '금', '토', '일'].map((day, index) => (
                    <span key={index}>{day}</span>
                  ))
                : ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'].map((month, index) => (
                    <span key={index} className="text-xs">{month}</span>
                  ))
              }
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">최근 활동</h2>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="text-2xl flex-shrink-0">{activity.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.user}</span>
                      <span className="text-gray-600"> {activity.action}</span>
                    </p>
                    <p className="text-sm text-primary truncate">{activity.target}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/activities"
              className="block mt-6 text-center text-sm text-primary hover:text-primary-dark font-medium"
            >
              모든 활동 보기 →
            </Link>
          </div>
        </div>

        {/* Project Progress Section */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">프로젝트 진행 현황</h2>
            <Link
              to="/tasks"
              className="text-sm text-primary hover:text-primary-dark font-medium"
            >
              모두 보기 →
            </Link>
          </div>
          <div className="space-y-4">
            {projectProgress.map((project) => (
              <div key={project.id} className="border border-gray-100 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{project.name}</h3>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(project.status)}`}>
                    {getStatusText(project.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>{project.team}</span>
                  <span>마감: {new Date(project.deadline).toLocaleDateString('ko-KR')}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-primary to-primary-dark h-2 rounded-full transition-all duration-300"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <div className="mt-1 text-right text-xs text-gray-600">{project.progress}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/team-chat"
            className="flex items-center justify-center space-x-2 p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-primary hover:shadow-md transition-all"
          >
            <span className="text-2xl">💬</span>
            <span className="font-medium text-gray-900">팀 채팅 시작</span>
          </Link>
          <Link
            to="/tasks"
            className="flex items-center justify-center space-x-2 p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-primary hover:shadow-md transition-all"
          >
            <span className="text-2xl">➕</span>
            <span className="font-medium text-gray-900">새 업무 추가</span>
          </Link>
          <Link
            to="/goals"
            className="flex items-center justify-center space-x-2 p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-primary hover:shadow-md transition-all"
          >
            <span className="text-2xl">🎯</span>
            <span className="font-medium text-gray-900">목표 확인</span>
          </Link>
          <Link
            to="/ai-tools"
            className="flex items-center justify-center space-x-2 p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-primary hover:shadow-md transition-all"
          >
            <span className="text-2xl">🤖</span>
            <span className="font-medium text-gray-900">AI 도구 사용</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;