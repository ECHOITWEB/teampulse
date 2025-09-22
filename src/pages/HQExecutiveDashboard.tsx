import React, { useState, useEffect } from 'react';
import {
  Building2, Users, Target, CreditCard, TrendingUp,
  Package, BarChart3, Brain, Coins, Settings,
  Filter, Download, Calendar, ArrowUp, ArrowDown,
  Activity, Zap, Shield, ChevronRight, Globe,
  DollarSign, Wallet, ShoppingCart, CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import hqService, { CompanyHQ, HQMember, CompanyObjective } from '../services/hqService';
import workspaceService from '../services/workspaceService';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface AIUsageMetrics {
  workspace_id: string;
  workspace_name: string;
  period: string;
  input_tokens: number;
  output_tokens: number;
  total_cost: number;
  model_breakdown: {
    model: string;
    input_tokens: number;
    output_tokens: number;
    cost: number;
  }[];
  daily_usage: {
    date: string;
    input_tokens: number;
    output_tokens: number;
    cost: number;
  }[];
}

interface PulsePlan {
  id: string;
  name: string;
  pulses: number;
  price: number;
  discount?: number;
  popular?: boolean;
  features: string[];
}

const HQExecutiveDashboard: React.FC = () => {
  const { user } = useAuth();
  const { currentWorkspace, currentCompany } = useWorkspace();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [hqData, setHQData] = useState<CompanyHQ | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'objectives' | 'usage' | 'billing' | 'settings'>('overview');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [aiUsageMetrics, setAIUsageMetrics] = useState<AIUsageMetrics[]>([]);
  const [companyObjectives, setCompanyObjectives] = useState<CompanyObjective[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [realtimeStats, setRealtimeStats] = useState({
    totalMembers: 0,
    activeWorkspaces: 0,
    totalPulses: 1000,
    usedPulses: 342,
    monthlyGrowth: 15.3,
    aiCost: 0
  });

  // Pulse 구매 플랜
  const pulsePlans: PulsePlan[] = [
    {
      id: 'starter',
      name: 'Starter Pack',
      pulses: 100,
      price: 10,
      features: ['기본 AI 모델 접근', '이메일 지원']
    },
    {
      id: 'growth',
      name: 'Growth Pack',
      pulses: 500,
      price: 45,
      discount: 10,
      features: ['모든 AI 모델 접근', '우선 지원', '사용량 분석']
    },
    {
      id: 'pro',
      name: 'Professional',
      pulses: 1000,
      price: 80,
      discount: 20,
      popular: true,
      features: ['모든 AI 모델 접근', '전담 지원', '고급 분석', 'API 접근']
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      pulses: 5000,
      price: 350,
      discount: 30,
      features: ['무제한 AI 모델', '24/7 지원', '커스텀 통합', 'SLA 보장']
    }
  ];

  useEffect(() => {
    loadExecutiveData();
    setupRealtimeListeners();
  }, [currentCompany, selectedWorkspace, dateRange]);

  const setupRealtimeListeners = () => {
    if (!currentCompany) return;

    // AI 사용량 실시간 모니터링
    const aiUsageQuery = query(
      collection(db, 'ai_usage'),
      where('company_id', '==', currentCompany.id),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(aiUsageQuery, (snapshot) => {
      const usage = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      calculateAIMetrics(usage);
    });

    return () => unsubscribe();
  };

  const loadExecutiveData = async () => {
    if (!currentCompany || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // HQ 데이터 로드
      let hq = await hqService.getCompanyHQ(currentCompany.id);
      if (!hq) {
        const hqId = await hqService.initializeHQ(
          currentCompany.id,
          currentCompany.name_ko || currentCompany.name_en,
          user.firebase_uid
        );
        hq = await hqService.getCompanyHQ(currentCompany.id);
      }
      setHQData(hq);

      // 워크스페이스 및 목표 데이터 로드
      const [objectives, companyWorkspaces] = await Promise.all([
        hqService.getCompanyObjectives(currentCompany.id),
        workspaceService.getCompanyWorkspaces(currentCompany.id)
      ]);

      setCompanyObjectives(objectives);
      setWorkspaces(companyWorkspaces);

      // AI 사용량 메트릭 로드
      await loadAIUsageMetrics();

    } catch (error) {
      console.error('Error loading executive data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAIUsageMetrics = async () => {
    if (!currentCompany) return;

    try {
      const metricsQuery = query(
        collection(db, 'ai_usage_metrics'),
        where('company_id', '==', currentCompany.id),
        where('period', '==', dateRange)
      );

      const snapshot = await getDocs(metricsQuery);
      const metrics = snapshot.docs.map(doc => {
        const data = doc.data() as Omit<AIUsageMetrics, 'id'>;
        return {
          ...data,
          id: doc.id
        };
      });

      setAIUsageMetrics(metrics);

      // 총 AI 비용 계산
      const totalCost = metrics.reduce((sum, m) => sum + m.total_cost, 0);
      setRealtimeStats(prev => ({ ...prev, aiCost: totalCost }));

    } catch (error) {
      console.error('Error loading AI metrics:', error);
    }
  };

  const calculateAIMetrics = (usage: any[]) => {
    // AI 사용량 메트릭 계산 로직
    const totalInputTokens = usage.reduce((sum, u) => sum + (u.input_tokens || 0), 0);
    const totalOutputTokens = usage.reduce((sum, u) => sum + (u.output_tokens || 0), 0);
    
    // 토큰당 비용 계산 (예시)
    const inputCost = totalInputTokens * 0.00001; // $0.01 per 1K tokens
    const outputCost = totalOutputTokens * 0.00003; // $0.03 per 1K tokens
    
    setRealtimeStats(prev => ({
      ...prev,
      aiCost: inputCost + outputCost
    }));
  };

  const handlePurchasePulse = async (planId: string) => {
    // Toss 결제 연동 (실제 구현 시 Toss Payments SDK 사용)
    console.log('Purchasing pulse plan:', planId);
    // TODO: Toss MCP 연동 구현
  };

  const getWorkspaceFilteredObjectives = () => {
    if (selectedWorkspace === 'all') {
      return companyObjectives;
    }
    return companyObjectives.filter(obj => 
      obj.cascaded_to?.includes(selectedWorkspace)
    );
  };

  const getWorkspaceFilteredMetrics = () => {
    if (selectedWorkspace === 'all') {
      return aiUsageMetrics;
    }
    return aiUsageMetrics.filter(m => m.workspace_id === selectedWorkspace);
  };

  // 차트 데이터 준비
  const prepareChartData = () => {
    const metrics = getWorkspaceFilteredMetrics();
    const dailyData: any[] = [];

    metrics.forEach(m => {
      if (m.daily_usage) {
        dailyData.push(...m.daily_usage);
      }
    });

    return dailyData.slice(0, 30); // 최근 30일 데이터
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Executive Header */}
      <div className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Building2 className="w-10 h-10 text-primary mr-4" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {currentCompany?.name_ko || currentCompany?.name_en} Executive HQ
                </h1>
                <p className="text-sm text-gray-600 mt-1">회사 전략 및 성과 관리 대시보드</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm text-gray-600">남은 Pulse</p>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <span className="text-2xl font-bold text-gray-900">
                    {realtimeStats.totalPulses - realtimeStats.usedPulses}
                  </span>
                  <span className="text-sm text-gray-500">/ {realtimeStats.totalPulses}</span>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('billing')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                <ShoppingCart className="w-4 h-4" />
                Pulse 구매
              </button>
            </div>
          </div>

          {/* Executive Tabs */}
          <div className="flex space-x-8 border-t -mb-px">
            {[
              { id: 'overview', label: 'Executive Overview', icon: BarChart3 },
              { id: 'objectives', label: '전략 목표', icon: Target },
              { id: 'usage', label: 'AI 사용 분석', icon: Brain },
              { id: 'billing', label: 'Pulse & 결제', icon: Wallet },
              { id: 'settings', label: '거버넌스', icon: Shield }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Workspace Filter */}
        {(activeTab === 'objectives' || activeTab === 'usage') && (
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={selectedWorkspace}
                onChange={(e) => setSelectedWorkspace(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="all">전체 워크스페이스</option>
                {workspaces.map(ws => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </select>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="7d">최근 7일</option>
                <option value="30d">최근 30일</option>
                <option value="90d">최근 90일</option>
                <option value="1y">최근 1년</option>
              </select>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              보고서 다운로드
            </button>
          </div>
        )}

        {/* Executive Overview */}
        {activeTab === 'overview' && (
          <div>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <ArrowUp className="w-4 h-4" />
                    <span className="text-sm font-semibold">{realtimeStats.monthlyGrowth}%</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{realtimeStats.totalMembers}</h3>
                <p className="text-sm text-gray-600 mt-1">전체 구성원</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Package className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <ArrowUp className="w-4 h-4" />
                    <span className="text-sm font-semibold">+2</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{realtimeStats.activeWorkspaces}</h3>
                <p className="text-sm text-gray-600 mt-1">활성 워크스페이스</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Brain className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex items-center gap-1 text-red-600">
                    <ArrowUp className="w-4 h-4" />
                    <span className="text-sm font-semibold">23%</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">${realtimeStats.aiCost.toFixed(2)}</h3>
                <p className="text-sm text-gray-600 mt-1">월간 AI 사용 비용</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Target className="w-6 h-6 text-yellow-600" />
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{companyObjectives.length}</h3>
                <p className="text-sm text-gray-600 mt-1">진행 중인 목표</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">AI 사용량 추이</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={prepareChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="input_tokens" stackId="1" stroke="#3B82F6" fill="#3B82F6" />
                    <Area type="monotone" dataKey="output_tokens" stackId="1" stroke="#10B981" fill="#10B981" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">워크스페이스별 활동</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={workspaces.map((ws, idx) => ({
                        name: ws.name,
                        value: ws.stats?.member_count || 0
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {workspaces.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                <h3 className="text-lg font-semibold mb-2">목표 설정</h3>
                <p className="text-sm opacity-90 mb-4">회사 전략 목표를 설정하고 관리하세요</p>
                <button
                  onClick={() => setActiveTab('objectives')}
                  className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-gray-100"
                >
                  목표 관리
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                <h3 className="text-lg font-semibold mb-2">AI 사용 분석</h3>
                <p className="text-sm opacity-90 mb-4">AI 사용 패턴과 비용을 분석하세요</p>
                <button
                  onClick={() => setActiveTab('usage')}
                  className="flex items-center gap-2 bg-white text-purple-600 px-4 py-2 rounded-lg hover:bg-gray-100"
                >
                  분석 보기
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
                <h3 className="text-lg font-semibold mb-2">Pulse 충전</h3>
                <p className="text-sm opacity-90 mb-4">AI 사용을 위한 Pulse를 구매하세요</p>
                <button
                  onClick={() => setActiveTab('billing')}
                  className="flex items-center gap-2 bg-white text-green-600 px-4 py-2 rounded-lg hover:bg-gray-100"
                >
                  구매하기
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Strategic Objectives Tab */}
        {activeTab === 'objectives' && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">회사 전략 목표 관리</h2>
              <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark">
                <Target className="w-5 h-5" />
                새 목표 설정
              </button>
            </div>

            <div className="grid gap-6">
              {getWorkspaceFilteredObjectives().map((objective) => (
                <div key={objective.id} className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">{objective.title}</h3>
                      <p className="text-gray-600 mt-2">{objective.description}</p>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                      objective.priority === 'critical' ? 'bg-red-100 text-red-700' :
                      objective.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      objective.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {objective.priority === 'critical' ? '전략적 핵심' :
                       objective.priority === 'high' ? '높은 우선순위' :
                       objective.priority === 'medium' ? '중간 우선순위' : '낮은 우선순위'}
                    </span>
                  </div>

                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">진행률</span>
                      <span className="font-semibold">{objective.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${objective.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-gray-600">연도</p>
                      <p className="font-semibold">{objective.year}년</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">분기</p>
                      <p className="font-semibold">{objective.quarter ? `Q${objective.quarter}` : '연간'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">전파된 워크스페이스</p>
                      <p className="font-semibold">{objective.cascaded_to?.length || 0}개</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Usage Analytics Tab */}
        {activeTab === 'usage' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">AI 사용량 상세 분석</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <Brain className="w-8 h-8 text-blue-500" />
                  <span className="text-sm text-gray-500">이번 달</span>
                </div>
                <h3 className="text-2xl font-bold">2.4M</h3>
                <p className="text-sm text-gray-600">입력 토큰</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <Brain className="w-8 h-8 text-green-500" />
                  <span className="text-sm text-gray-500">이번 달</span>
                </div>
                <h3 className="text-2xl font-bold">1.8M</h3>
                <p className="text-sm text-gray-600">출력 토큰</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-8 h-8 text-purple-500" />
                  <span className="text-sm text-gray-500">이번 달</span>
                </div>
                <h3 className="text-2xl font-bold">${realtimeStats.aiCost.toFixed(2)}</h3>
                <p className="text-sm text-gray-600">총 비용</p>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-8 h-8 text-yellow-500" />
                  <span className="text-sm text-gray-500">일평균</span>
                </div>
                <h3 className="text-2xl font-bold">145</h3>
                <p className="text-sm text-gray-600">API 호출</p>
              </div>
            </div>

            {/* Model Breakdown */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h3 className="text-lg font-semibold mb-4">모델별 사용량</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { model: 'GPT-4o', input: 800000, output: 600000 },
                  { model: 'Claude-3.5', input: 700000, output: 500000 },
                  { model: 'GPT-4o-mini', input: 500000, output: 400000 },
                  { model: 'Claude-3-Haiku', input: 400000, output: 300000 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="model" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="input" fill="#3B82F6" name="입력 토큰" />
                  <Bar dataKey="output" fill="#10B981" name="출력 토큰" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Workspace Usage Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      워크스페이스
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      입력 토큰
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      출력 토큰
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      비용
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      추세
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {getWorkspaceFilteredMetrics().map((metric) => (
                    <tr key={metric.workspace_id}>
                      <td className="px-6 py-4">
                        <p className="font-medium">{metric.workspace_name}</p>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {(metric.input_tokens / 1000).toFixed(1)}K
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {(metric.output_tokens / 1000).toFixed(1)}K
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold">
                        ${metric.total_cost.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <ArrowUp className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600">12%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pulse & Billing Tab */}
        {activeTab === 'billing' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Pulse 구매 & 결제 관리</h2>

            {/* Current Pulse Status */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-8 mb-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold mb-2">현재 Pulse 잔액</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Zap className="w-8 h-8 text-yellow-300" />
                      <span className="text-4xl font-bold">{realtimeStats.totalPulses - realtimeStats.usedPulses}</span>
                    </div>
                    <div className="text-white/80">
                      <p>사용: {realtimeStats.usedPulses} Pulse</p>
                      <p>총 구매: {realtimeStats.totalPulses} Pulse</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white/80 mb-2">예상 소진일</p>
                  <p className="text-2xl font-bold">23일 후</p>
                </div>
              </div>
            </div>

            {/* Pulse Plans */}
            <h3 className="text-xl font-semibold mb-4">Pulse 구매 플랜</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {pulsePlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`bg-white rounded-xl shadow-lg p-6 relative ${
                    plan.popular ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-primary text-white px-3 py-1 rounded-full text-sm">
                        인기
                      </span>
                    </div>
                  )}
                  
                  <h4 className="text-lg font-semibold mb-2">{plan.name}</h4>
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">${plan.price}</span>
                      {plan.discount && (
                        <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded">
                          {plan.discount}% 할인
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mt-1">
                      <Zap className="w-4 h-4 inline text-yellow-500" />
                      {plan.pulses.toLocaleString()} Pulse
                    </p>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handlePurchasePulse(plan.id)}
                    className={`w-full py-3 rounded-lg font-semibold transition-all ${
                      plan.popular
                        ? 'bg-primary text-white hover:bg-primary-dark'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    구매하기
                  </button>
                </div>
              ))}
            </div>

            {/* Purchase History */}
            <h3 className="text-xl font-semibold mb-4">구매 내역</h3>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      구매일
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      플랜
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pulse
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      금액
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      결제 방법
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 text-sm">2025-01-10</td>
                    <td className="px-6 py-4 text-sm font-medium">Professional</td>
                    <td className="px-6 py-4 text-sm">1,000</td>
                    <td className="px-6 py-4 text-sm font-semibold">$80</td>
                    <td className="px-6 py-4 text-sm">Toss Pay</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm">2024-12-15</td>
                    <td className="px-6 py-4 text-sm font-medium">Growth Pack</td>
                    <td className="px-6 py-4 text-sm">500</td>
                    <td className="px-6 py-4 text-sm font-semibold">$45</td>
                    <td className="px-6 py-4 text-sm">신용카드</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Governance Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">거버넌스 & 정책 설정</h2>

            <div className="grid gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">AI 사용 정책</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">일일 토큰 제한</p>
                      <p className="text-sm text-gray-500">워크스페이스당 일일 최대 토큰 사용량</p>
                    </div>
                    <input
                      type="number"
                      className="px-4 py-2 border rounded-lg w-32"
                      placeholder="100000"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">고급 모델 접근 제한</p>
                      <p className="text-sm text-gray-500">GPT-4o, Claude-3.5 등 고급 모델 사용 권한</p>
                    </div>
                    <select className="px-4 py-2 border rounded-lg">
                      <option>모든 멤버</option>
                      <option>관리자만</option>
                      <option>승인된 사용자</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">보안 정책</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">2단계 인증 강제</p>
                      <p className="text-sm text-gray-500">모든 HQ 멤버에게 2FA 필수</p>
                    </div>
                    <input type="checkbox" className="toggle" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">IP 화이트리스트</p>
                      <p className="text-sm text-gray-500">특정 IP에서만 HQ 접근 허용</p>
                    </div>
                    <input type="checkbox" className="toggle" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">감사 로그 보관 기간</p>
                      <p className="text-sm text-gray-500">모든 활동 로그 보관 기간</p>
                    </div>
                    <select className="px-4 py-2 border rounded-lg">
                      <option>90일</option>
                      <option>180일</option>
                      <option>1년</option>
                      <option>무제한</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HQExecutiveDashboard;