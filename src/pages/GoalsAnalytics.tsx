import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target, 
  Download,
  Calendar,
  Filter,
  RefreshCw,
  AlertCircle,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CompletionTrendsChart,
  TeamPerformanceChart,
  ProgressDistributionChart,
  KeyResultHeatMap,
  IndividualPerformanceChart
} from '../components/analytics';

interface AnalyticsFilters {
  startDate: string;
  endDate: string;
  teamId?: number;
  userId?: number;
  status?: string;
  type?: string;
}

interface DashboardOverview {
  summary: {
    totalObjectives: number;
    completedObjectives: number;
    totalKeyResults: number;
    completedKeyResults: number;
    averageProgress: number;
    onTrackCount: number;
    atRiskCount: number;
    behindCount: number;
    completionRate: number;
  };
  trends: {
    progressTrend: number;
    completionTrend: number;
    velocityTrend: number;
    engagementTrend: number;
  };
  topPerformers: Array<{
    name: string;
    score: number;
    avatar: string;
  }>;
  recentActivity: Array<{
    type: string;
    user: string;
    objective?: string;
    keyResult?: string;
    progress?: number;
    timestamp: string;
  }>;
}

const GoalsAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters state
  const [filters, setFilters] = useState<AnalyticsFilters>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    teamId: undefined,
    userId: undefined,
    status: undefined,
    type: undefined
  });

  // Data states
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [completionTrends, setCompletionTrends] = useState([]);
  const [teamPerformance, setTeamPerformance] = useState([]);
  const [individualPerformance, setIndividualPerformance] = useState([]);
  const [progressDistribution, setProgressDistribution] = useState<any>(null);
  const [keyResultHeatMap, setKeyResultHeatMap] = useState<any>(null);

  useEffect(() => {
    loadAnalyticsData();
  }, [filters]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      // Load all analytics data in parallel
      const [
        overviewRes,
        trendsRes,
        teamRes,
        individualRes,
        distributionRes,
        heatMapRes
      ] = await Promise.all([
        fetch(`${baseUrl}/api/analytics/goals/dashboard-overview?${queryParams}`),
        fetch(`${baseUrl}/api/analytics/goals/completion-trends?${queryParams}`),
        fetch(`${baseUrl}/api/analytics/goals/team-performance?${queryParams}`),
        fetch(`${baseUrl}/api/analytics/goals/individual-performance?${queryParams}`),
        fetch(`${baseUrl}/api/analytics/goals/progress-distribution?${queryParams}`),
        fetch(`${baseUrl}/api/analytics/goals/key-result-heatmap?${queryParams}`)
      ]);

      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        setOverview(overviewData.data);
      }

      if (trendsRes.ok) {
        const trendsData = await trendsRes.json();
        setCompletionTrends(trendsData.data);
      }

      if (teamRes.ok) {
        const teamData = await teamRes.json();
        setTeamPerformance(teamData.data);
      }

      if (individualRes.ok) {
        const individualData = await individualRes.json();
        setIndividualPerformance(individualData.data);
      }

      if (distributionRes.ok) {
        const distributionData = await distributionRes.json();
        setProgressDistribution(distributionData.data);
      }

      if (heatMapRes.ok) {
        const heatMapData = await heatMapRes.json();
        setKeyResultHeatMap(heatMapData.data);
      }

    } catch (err) {
      console.error('Error loading analytics data:', err);
      setError('분석 데이터를 불러오는 중 오류가 발생했습니다.');
      
      // Load mock data as fallback
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    // Mock data for demonstration
    setOverview({
      summary: {
        totalObjectives: 85,
        completedObjectives: 24,
        totalKeyResults: 312,
        completedKeyResults: 178,
        averageProgress: 67,
        onTrackCount: 31,
        atRiskCount: 15,
        behindCount: 5,
        completionRate: 74.2
      },
      trends: {
        progressTrend: 12,
        completionTrend: 8,
        velocityTrend: -3,
        engagementTrend: 15
      },
      topPerformers: [
        { name: '김개발', score: 92, avatar: 'https://ui-avatars.com/api/?name=김개발' },
        { name: '이기획', score: 89, avatar: 'https://ui-avatars.com/api/?name=이기획' },
        { name: '박마케팅', score: 87, avatar: 'https://ui-avatars.com/api/?name=박마케팅' }
      ],
      recentActivity: [
        {
          type: 'objective_completed',
          user: '김개발',
          objective: '케이팝데몬헌터스 글로벌 런칭 성공',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          type: 'key_result_updated',
          user: '박마케팅',
          keyResult: 'MAU 500만 달성',
          progress: 76,
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
        }
      ]
    });

    // Mock chart data would be set here
    setCompletionTrends([]);
    setTeamPerformance([]);
    setIndividualPerformance([]);
    setProgressDistribution(null);
    setKeyResultHeatMap(null);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  const handleExport = async (type: string) => {
    try {
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
      
      queryParams.append('type', type);

      const response = await fetch(`${baseUrl}/api/analytics/goals/export?${queryParams}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `goals_${type}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Export failed');
      }
    } catch (err) {
      console.error('Error exporting data:', err);
      alert('데이터 내보내기 중 오류가 발생했습니다.');
    }
  };

  const updateFilters = (newFilters: Partial<AnalyticsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const tabs = [
    { id: 'overview', name: '개요', icon: BarChart3 },
    { id: 'trends', name: '트렌드', icon: TrendingUp },
    { id: 'teams', name: '팀 성과', icon: Users },
    { id: 'individuals', name: '개인 성과', icon: Target },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">분석 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">목표 분석 대시보드</h1>
              <p className="text-gray-600 mt-2">팀과 개인의 목표 달성 현황을 분석하세요</p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>새로고침</span>
              </button>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleExport('objectives')}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>내보내기</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <h3 className="font-medium text-gray-900">필터</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시작 날짜</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => updateFilters({ startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">종료 날짜</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => updateFilters({ endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
              <select
                value={filters.status || ''}
                onChange={(e) => updateFilters({ status: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">전체</option>
                <option value="completed">완료</option>
                <option value="on_track">정상</option>
                <option value="at_risk">위험</option>
                <option value="behind">지연</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
              <select
                value={filters.type || ''}
                onChange={(e) => updateFilters({ type: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">전체</option>
                <option value="company">회사</option>
                <option value="team">팀</option>
                <option value="individual">개인</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        {/* Overview Cards */}
        {overview && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">전체 목표</p>
                  <p className="text-2xl font-bold text-gray-900">{overview.summary.totalObjectives}</p>
                </div>
                <div className="flex items-center text-green-600">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">+{overview.trends.progressTrend}%</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>완료: {overview.summary.completedObjectives}</span>
                  <span>{overview.summary.completionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${overview.summary.completionRate}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">평균 진행률</p>
                  <p className="text-2xl font-bold text-gray-900">{overview.summary.averageProgress}%</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">정상 진행</p>
                  <p className="text-2xl font-bold text-green-600">{overview.summary.onTrackCount}</p>
                </div>
                <div className="flex space-x-1">
                  <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    위험: {overview.summary.atRiskCount}
                  </div>
                  <div className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                    지연: {overview.summary.behindCount}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">핵심 결과</p>
                  <p className="text-2xl font-bold text-gray-900">{overview.summary.totalKeyResults}</p>
                </div>
                <div className="text-sm text-gray-500">
                  완료: {overview.summary.completedKeyResults}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">목표 완료 트렌드</h3>
                  <CompletionTrendsChart data={completionTrends} height={300} />
                </div>

                {progressDistribution && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">상태별 분포</h3>
                      <ProgressDistributionChart 
                        data={progressDistribution} 
                        view="status" 
                        height={250}
                      />
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">유형별 분포</h3>
                      <ProgressDistributionChart 
                        data={progressDistribution} 
                        view="type" 
                        height={250}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'trends' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">목표 완료 트렌드</h3>
                  <CompletionTrendsChart data={completionTrends} height={400} />
                </div>

                {progressDistribution && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">진행률 분포</h3>
                    <ProgressDistributionChart 
                      data={progressDistribution} 
                      view="progress" 
                      height={300}
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'teams' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">팀별 성과</h3>
                  <TeamPerformanceChart data={teamPerformance} height={400} />
                </div>

                {keyResultHeatMap && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">팀별 핵심결과 히트맵</h3>
                    <KeyResultHeatMap data={keyResultHeatMap.data} height={400} />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'individuals' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">개인별 성과 분포</h3>
                  <IndividualPerformanceChart 
                    data={individualPerformance} 
                    height={400}
                    xMetric="averageProgress"
                    yMetric="performanceScore"
                  />
                </div>

                {overview && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">우수 성과자</h3>
                    <div className="space-y-3">
                      {overview.topPerformers.map((performer, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <img 
                              src={performer.avatar} 
                              alt={performer.name}
                              className="w-10 h-10 rounded-full"
                            />
                            <span className="font-medium text-gray-900">{performer.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">성과 점수:</span>
                            <span className="font-bold text-primary">{performer.score}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Export Options */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">데이터 내보내기</h3>
              <p className="text-gray-600 text-sm">분석 데이터를 CSV 형식으로 내보낼 수 있습니다.</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleExport('objectives')}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>목표 데이터</span>
              </button>
              <button
                onClick={() => handleExport('keyResults')}
                className="flex items-center space-x-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>핵심결과 데이터</span>
              </button>
              <button
                onClick={() => handleExport('performance')}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>성과 데이터</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalsAnalytics;