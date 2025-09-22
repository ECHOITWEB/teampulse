import React, { useState, useEffect } from 'react';
import {
  Building2, Users, Target, BarChart3, Brain,
  Package, Activity, Zap, Shield, ChevronRight,
  DollarSign, Wallet, ShoppingCart, CheckCircle,
  Filter, Download, Search, Edit2, Trash2,
  UserPlus, UserCheck, UserX, Eye, Mail,
  Phone, Calendar, TrendingUp, TrendingDown,
  AlertCircle, Settings, Key, Clock, Globe, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import hqService, { CompanyHQ, CompanyObjective } from '../services/hqService';
import workspaceService from '../services/workspaceService';
import memberManagementService, { CompanyMember, MemberStats } from '../services/memberManagementService';
import aiUsageService from '../services/aiUsageService';
import PulsePurchase from '../components/billing/PulsePurchase';
import PulseManagement from '../components/hq/PulseManagement';
import CompanyUsageDashboard from '../components/usage/CompanyUsageDashboard';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, 
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Area, AreaChart 
} from 'recharts';

interface AIUsageData {
  date: string;
  openai: number;
  anthropic: number;
  total_cost: number;
}

interface ModelUsageBreakdown {
  name: string;
  value: number;
  provider: string;
  color: string;
}

const HQExecutiveDashboardEnhanced: React.FC = () => {
  const { user } = useAuth();
  const { currentCompany } = useWorkspace();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'ai-usage' | 'billing' | 'pulse' | 'settings'>('overview');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  
  // Members data
  const [companyMembers, setCompanyMembers] = useState<CompanyMember[]>([]);
  const [memberStats, setMemberStats] = useState<MemberStats | null>(null);
  const [selectedMember, setSelectedMember] = useState<CompanyMember | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'super_admin' | 'admin' | 'member'>('all');
  
  // AI Usage data
  const [aiUsageData, setAiUsageData] = useState<AIUsageData[]>([]);
  const [modelBreakdown, setModelBreakdown] = useState<ModelUsageBreakdown[]>([]);
  const [totalAICost, setTotalAICost] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  
  // Real-time stats
  const [realtimeStats, setRealtimeStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    totalWorkspaces: 0,
    monthlyGrowth: 0,
    totalPulses: 10000,
    usedPulses: 0,
    aiCostThisMonth: 0,
    aiRequestsToday: 0
  });

  // Workspace data
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [companyObjectives, setCompanyObjectives] = useState<CompanyObjective[]>([]);

  useEffect(() => {
    if (currentCompany) {
      loadDashboardData();
      setupRealtimeListeners();
    }
  }, [currentCompany, dateRange, selectedWorkspace]);

  const loadDashboardData = async () => {
    if (!currentCompany || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Load all data in parallel
      const [
        members,
        stats,
        workspacesList,
        objectives
      ] = await Promise.all([
        memberManagementService.getCompanyMembers(currentCompany.id),
        memberManagementService.getCompanyMemberStats(currentCompany.id),
        workspaceService.getCompanyWorkspaces(currentCompany.id),
        hqService.getCompanyObjectives(currentCompany.id)
      ]);

      setCompanyMembers(members);
      setMemberStats(stats);
      setWorkspaces(workspacesList);
      setCompanyObjectives(objectives);

      // Update realtime stats
      setRealtimeStats(prev => ({
        ...prev,
        totalMembers: stats.total_members,
        activeMembers: stats.active_members,
        totalWorkspaces: workspacesList.length,
        monthlyGrowth: stats.growth_rate
      }));

      // Load AI usage data
      await loadAIUsageData();

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAIUsageData = async () => {
    if (!currentCompany) return;

    try {
      // Get AI usage for the selected period
      const now = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      const usageQuery = query(
        collection(db, 'ai_usage'),
        where('company_id', '==', currentCompany.id),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(usageQuery);
      const records = snapshot.docs.map(doc => doc.data());

      // Process data for charts
      const dailyUsage = new Map<string, { openai: number; anthropic: number; cost: number }>();
      const modelUsage = new Map<string, { provider: string; tokens: number; cost: number }>();
      
      let totalCost = 0;
      let totalTokensUsed = 0;

      records.forEach(record => {
        const date = record.timestamp.toDate().toISOString().split('T')[0];
        const provider = record.provider || 'openai';
        const model = record.model;
        const tokens = (record.input_tokens || 0) + (record.output_tokens || 0);
        const cost = record.cost || 0;

        // Daily aggregation
        if (!dailyUsage.has(date)) {
          dailyUsage.set(date, { openai: 0, anthropic: 0, cost: 0 });
        }
        const daily = dailyUsage.get(date)!;
        if (provider === 'openai') {
          daily.openai += tokens;
        } else if (provider === 'anthropic') {
          daily.anthropic += tokens;
        }
        daily.cost += cost;

        // Model breakdown
        const modelKey = `${provider}-${model}`;
        if (!modelUsage.has(modelKey)) {
          modelUsage.set(modelKey, { provider, tokens: 0, cost: 0 });
        }
        const modelData = modelUsage.get(modelKey)!;
        modelData.tokens += tokens;
        modelData.cost += cost;

        totalCost += cost;
        totalTokensUsed += tokens;
      });

      // Convert to chart data
      const chartData: AIUsageData[] = Array.from(dailyUsage.entries())
        .map(([date, data]) => ({
          date,
          openai: data.openai,
          anthropic: data.anthropic,
          total_cost: data.cost
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30); // Last 30 data points

      const modelBreakdownData: ModelUsageBreakdown[] = Array.from(modelUsage.entries())
        .map(([model, data]) => ({
          name: model.split('-').slice(1).join('-'),
          value: data.tokens,
          provider: data.provider,
          color: data.provider === 'openai' ? '#10B981' : '#8B5CF6'
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10 models

      setAiUsageData(chartData);
      setModelBreakdown(modelBreakdownData);
      setTotalAICost(totalCost);
      setTotalTokens(totalTokensUsed);
      
      setRealtimeStats(prev => ({
        ...prev,
        aiCostThisMonth: totalCost,
        usedPulses: Math.floor(totalTokensUsed / 100) // Approximate pulse usage
      }));

    } catch (error) {
      console.error('Error loading AI usage data:', error);
    }
  };

  const setupRealtimeListeners = () => {
    if (!currentCompany) return;

    // Listen to member changes
    const membersQuery = query(
      collection(db, 'users'),
      where('company_id', '==', currentCompany.id)
    );

    const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
      loadDashboardData(); // Reload when members change
    });

    // Listen to AI usage changes
    const aiUsageQuery = query(
      collection(db, 'ai_usage'),
      where('company_id', '==', currentCompany.id),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribeAI = onSnapshot(aiUsageQuery, (snapshot) => {
      const todayCount = snapshot.docs.filter(doc => {
        const timestamp = doc.data().timestamp.toDate();
        const today = new Date();
        return timestamp.toDateString() === today.toDateString();
      }).length;

      setRealtimeStats(prev => ({
        ...prev,
        aiRequestsToday: todayCount
      }));
    });

    return () => {
      unsubscribeMembers();
      unsubscribeAI();
    };
  };

  const handleMemberRoleUpdate = async (memberId: string, newRole: 'super_admin' | 'admin' | 'member') => {
    if (!currentCompany) return;

    try {
      await memberManagementService.updateMemberRole(memberId, currentCompany.id, newRole);
      await loadDashboardData();
    } catch (error) {
      console.error('Error updating member role:', error);
    }
  };

  const handleMemberStatusUpdate = async (memberId: string, status: 'active' | 'inactive' | 'suspended') => {
    if (!currentCompany) return;

    try {
      await memberManagementService.updateMemberStatus(memberId, currentCompany.id, status);
      await loadDashboardData();
    } catch (error) {
      console.error('Error updating member status:', error);
    }
  };

  const handleExportData = async (type: 'members' | 'usage' | 'all') => {
    if (!currentCompany) return;

    try {
      if (type === 'members' || type === 'all') {
        const csv = await memberManagementService.exportMembersData(currentCompany.id);
        downloadCSV(csv, `members-${new Date().toISOString()}.csv`);
      }
      // Add more export types as needed
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredMembers = companyMembers.filter(member => {
    const matchesSearch = searchTerm === '' || 
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || member.company_role === filterRole;
    
    const matchesWorkspace = selectedWorkspace === 'all' || 
      member.workspaces.some(w => w.workspace_id === selectedWorkspace);
    
    return matchesSearch && matchesRole && matchesWorkspace;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">경영진 대시보드</h1>
                <p className="text-sm text-gray-600">{currentCompany?.name_ko || currentCompany?.name_en}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Date Range Selector */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                <option value="7d">최근 7일</option>
                <option value="30d">최근 30일</option>
                <option value="90d">최근 90일</option>
                <option value="1y">최근 1년</option>
              </select>
              
              {/* Export Button */}
              <button
                onClick={() => handleExportData('all')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download className="w-4 h-4" />
                데이터 내보내기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8">
            {[
              { id: 'overview', label: '개요', icon: BarChart3 },
              { id: 'members', label: '멤버 관리', icon: Users },
              { id: 'ai-usage', label: 'AI 사용량', icon: Brain },
              { id: 'billing', label: 'Pulse 충전', icon: Wallet },
              { id: 'pulse', label: 'Pulse 관리', icon: Zap },
              { id: 'settings', label: '설정', icon: Settings }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8 text-blue-600" />
                  <span className={`text-sm font-medium ${realtimeStats.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {realtimeStats.monthlyGrowth >= 0 ? '+' : ''}{realtimeStats.monthlyGrowth.toFixed(1)}%
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{realtimeStats.totalMembers}</h3>
                <p className="text-sm text-gray-600 mt-1">전체 멤버</p>
                <p className="text-xs text-gray-500 mt-2">{realtimeStats.activeMembers}명 활동중</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <Building2 className="w-8 h-8 text-green-600" />
                  <Activity className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{realtimeStats.totalWorkspaces}</h3>
                <p className="text-sm text-gray-600 mt-1">워크스페이스</p>
                <p className="text-xs text-gray-500 mt-2">모두 활성</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <Brain className="w-8 h-8 text-purple-600" />
                  <span className="text-sm font-medium text-purple-600">
                    {realtimeStats.aiRequestsToday}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">₩{(realtimeStats.aiCostThisMonth * 1300).toFixed(0)}</h3>
                <p className="text-sm text-gray-600 mt-1">이번달 AI 비용</p>
                <p className="text-xs text-gray-500 mt-2">오늘 {realtimeStats.aiRequestsToday}건 요청</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <Wallet className="w-8 h-8 text-yellow-600" />
                  <div className="text-right">
                    <span className="text-xs text-gray-500">사용량</span>
                    <div className="text-sm font-medium text-yellow-600">
                      {((realtimeStats.usedPulses / realtimeStats.totalPulses) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {realtimeStats.totalPulses - realtimeStats.usedPulses}
                </h3>
                <p className="text-sm text-gray-600 mt-1">남은 Pulse</p>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-600 h-2 rounded-full"
                    style={{ width: `${(realtimeStats.usedPulses / realtimeStats.totalPulses) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* AI Usage Trend */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">AI 사용 추이</h3>
                {aiUsageData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={aiUsageData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="openai" 
                        stackId="1"
                        stroke="#10B981" 
                        fill="#10B981" 
                        fillOpacity={0.6}
                        name="OpenAI"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="anthropic" 
                        stackId="1"
                        stroke="#8B5CF6" 
                        fill="#8B5CF6" 
                        fillOpacity={0.6}
                        name="Anthropic"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500">
                    사용 데이터 없음
                  </div>
                )}
              </div>

              {/* Model Usage Breakdown */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">모델별 사용량</h3>
                {modelBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={modelBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {modelBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500">
                    모델 사용 데이터 없음
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 min-w-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="이름 또는 이메일로 멤버 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value as any)}
                    className="px-4 py-2 border rounded-lg min-w-[140px] whitespace-nowrap"
                  >
                    <option value="all">모든 역할</option>
                    <option value="super_admin">최고 관리자</option>
                    <option value="admin">관리자</option>
                    <option value="member">멤버</option>
                  </select>
                  
                  <select
                    value={selectedWorkspace}
                    onChange={(e) => setSelectedWorkspace(e.target.value)}
                    className="px-4 py-2 border rounded-lg min-w-[180px] whitespace-nowrap"
                  >
                    <option value="all">모든 워크스페이스</option>
                    {workspaces.map(ws => (
                      <option key={ws.id} value={ws.id}>{ws.name}</option>
                    ))}
                  </select>
                  
                  <button
                    onClick={() => handleExportData('members')}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 whitespace-nowrap"
                  >
                    <Download className="w-4 h-4 flex-shrink-0" />
                    <span>내보내기</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Members List */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        멤버
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        역할
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        워크스페이스
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        AI 사용량
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        가입일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredMembers.map(member => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              {member.profile_image ? (
                                <img 
                                  className="h-10 w-10 rounded-full" 
                                  src={member.profile_image} 
                                  alt="" 
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <span className="text-gray-600 font-medium">
                                    {member.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {member.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {member.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={member.company_role}
                            onChange={(e) => handleMemberRoleUpdate(member.user_id, e.target.value as any)}
                            className="text-sm border rounded px-2 py-1"
                          >
                            <option value="super_admin">최고 관리자</option>
                            <option value="admin">관리자</option>
                            <option value="member">멤버</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {member.workspaces.length}개 워크스페이스
                          </div>
                          <div className="text-sm text-gray-500">
                            {member.workspaces.slice(0, 2).map(w => w.workspace_name).join(', ')}
                            {member.workspaces.length > 2 && '...'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {member.ai_usage_total.toLocaleString()} 토큰
                          </div>
                          <div className="text-sm text-gray-500">
                            ₩{(member.ai_cost_total * 1300).toFixed(0)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            member.status === 'active' ? 'bg-green-100 text-green-800' :
                            member.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.joined_at.toDate().toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => setSelectedMember(member)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMemberStatusUpdate(
                              member.user_id,
                              member.status === 'active' ? 'suspended' : 'active'
                            )}
                            className="text-red-600 hover:text-red-900"
                          >
                            {member.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* AI Usage Tab */}
        {activeTab === 'ai-usage' && (
          <CompanyUsageDashboard 
            companyId={currentCompany?.id || ''} 
            workspaceIds={workspaces.map(w => w.id)} 
          />
        )}

        {/* Old AI Usage Tab - Removed */}
        {false && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">총 토큰</span>
                  <Brain className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {totalTokens.toLocaleString()}
                </p>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">총 비용</span>
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  ₩{(totalAICost * 1300).toFixed(0)}
                </p>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">사용자당 평균 비용</span>
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  ₩{realtimeStats.totalMembers > 0 ? ((totalAICost * 1300) / realtimeStats.totalMembers).toFixed(0) : '0'}
                </p>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">오늘 요청</span>
                  <Activity className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {realtimeStats.aiRequestsToday}
                </p>
              </div>
            </div>

            {/* Usage Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Usage Trend */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">일별 토큰 사용량</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={aiUsageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="openai" 
                      stroke="#10B981" 
                      name="OpenAI"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="anthropic" 
                      stroke="#8B5CF6" 
                      name="Anthropic"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Cost Trend */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">일별 비용 추이</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={aiUsageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `₩${(value * 1300).toFixed(0)}`} />
                    <Area 
                      type="monotone" 
                      dataKey="total_cost" 
                      stroke="#EF4444" 
                      fill="#FEE2E2"
                      name="비용"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Model Breakdown Table */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">모델별 사용 세부사항</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">모델</th>
                      <th className="text-left py-2 px-4">제공자</th>
                      <th className="text-right py-2 px-4">토큰</th>
                      <th className="text-right py-2 px-4">비율</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelBreakdown.map((model, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-2 px-4">{model.name}</td>
                        <td className="py-2 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            model.provider === 'openai' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {model.provider}
                          </span>
                        </td>
                        <td className="text-right py-2 px-4">{model.value.toLocaleString()}</td>
                        <td className="text-right py-2 px-4">
                          {totalTokens > 0 ? ((model.value / totalTokens) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Billing Tab - Pulse Purchase */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            {/* Current Balance */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
              <h3 className="text-xl font-semibold mb-4">현재 Pulse 잔액</h3>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold">
                    {realtimeStats.totalPulses - realtimeStats.usedPulses}
                  </p>
                  <p className="text-blue-100 mt-1">남은 Pulse</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-100">이번달 사용량</p>
                  <p className="text-xl font-semibold">{realtimeStats.usedPulses}</p>
                </div>
              </div>
              <div className="mt-4 bg-blue-800/30 rounded-full h-3">
                <div
                  className="bg-white h-3 rounded-full"
                  style={{ width: `${((realtimeStats.totalPulses - realtimeStats.usedPulses) / realtimeStats.totalPulses) * 100}%` }}
                />
              </div>
              <button
                onClick={() => setShowPurchaseModal(true)}
                className="mt-4 w-full py-2 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
              >
                <ShoppingCart className="w-5 h-5 inline mr-2" />
                Pulse 충전하기
              </button>
            </div>

            {/* Usage History */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">최근 충전 내역</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium">프로 패키지</p>
                    <p className="text-sm text-gray-500">2024년 1월 15일</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">10,000 Pulse</p>
                    <p className="text-sm text-gray-500">₩100,000</p>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium">베이직 패키지</p>
                    <p className="text-sm text-gray-500">2024년 1월 5일</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">5,000 Pulse</p>
                    <p className="text-sm text-gray-500">₩50,000</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">결제 수단</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Wallet className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="font-medium">Toss Payments</p>
                      <p className="text-sm text-gray-500">간편 결제</p>
                    </div>
                  </div>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">준비중</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pulse Management Tab */}
        {activeTab === 'pulse' && (
          <div className="space-y-6">
            <PulseManagement />
          </div>
        )}
      </div>

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">멤버 상세정보</h3>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Profile Info */}
                <div className="flex items-start gap-4">
                  {selectedMember.profile_image ? (
                    <img 
                      src={selectedMember.profile_image} 
                      alt="" 
                      className="w-20 h-20 rounded-full"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-2xl font-medium text-gray-600">
                        {selectedMember.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold">{selectedMember.name}</h4>
                    <p className="text-gray-600">{selectedMember.email}</p>
                    {selectedMember.position && (
                      <p className="text-sm text-gray-500">{selectedMember.position}</p>
                    )}
                    {selectedMember.department && (
                      <p className="text-sm text-gray-500">{selectedMember.department}</p>
                    )}
                  </div>
                </div>
                
                {/* Contact Info */}
                {selectedMember.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{selectedMember.phone}</span>
                  </div>
                )}
                
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">가입일</p>
                    <p className="font-semibold">
                      {selectedMember.joined_at.toDate().toLocaleDateString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">마지막 활동</p>
                    <p className="font-semibold">
                      {selectedMember.last_active.toDate().toLocaleDateString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">AI 사용량</p>
                    <p className="font-semibold">
                      {selectedMember.ai_usage_total.toLocaleString()} 토큰
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">AI 비용</p>
                    <p className="font-semibold">
                      ₩{(selectedMember.ai_cost_total * 1300).toFixed(0)}
                    </p>
                  </div>
                </div>
                
                {/* Workspaces */}
                <div>
                  <h5 className="font-semibold mb-2">워크스페이스</h5>
                  <div className="space-y-2">
                    {selectedMember.workspaces.map(ws => (
                      <div key={ws.workspace_id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <span className="text-sm">{ws.workspace_name}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          ws.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                          ws.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {ws.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pulse Purchase Modal */}
      {showPurchaseModal && (
        <PulsePurchase onClose={() => setShowPurchaseModal(false)} />
      )}
    </div>
  );
};

export default HQExecutiveDashboardEnhanced;