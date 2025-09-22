import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import usageTrackerService, { AggregatedUsage } from '../../services/usageTrackerService';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getModelDisplayName } from '../../config/apiPricing';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

interface CompanyUsageDashboardProps {
  companyId: string;
  workspaceIds: string[];
}

const CompanyUsageDashboard: React.FC<CompanyUsageDashboardProps> = ({ companyId, workspaceIds }) => {
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [aggregatedUsage, setAggregatedUsage] = useState<any>({
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUSD: 0,
    totalCostKRW: 0,
    count: 0,
    byModel: {},
    byWorkspace: {},
    byUser: {}
  });
  const [dailyTrend, setDailyTrend] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);

  useEffect(() => {
    if (workspaceIds && workspaceIds.length > 0) {
      loadCompanyUsage();
    }
  }, [workspaceIds, selectedMonth]);

  const loadCompanyUsage = async () => {
    setLoading(true);
    try {
      const monthKey = selectedMonth || getCurrentMonthKey();
      
      // Aggregate usage from all workspaces
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalCostUSD = 0;
      let totalCostKRW = 0;
      let totalCount = 0;
      const modelAggregates: Record<string, any> = {};
      const workspaceAggregates: Record<string, any> = {};
      const userAggregates: Record<string, any> = {};

      // Get usage for each workspace
      for (const workspaceId of workspaceIds) {
        const usage = await usageTrackerService.getWorkspaceMonthlyUsage(workspaceId, monthKey);
        
        if (usage) {
          totalInputTokens += usage.totalInputTokens || 0;
          totalOutputTokens += usage.totalOutputTokens || 0;
          totalCostUSD += usage.totalCostUSD || 0;
          totalCostKRW += usage.totalCostKRW || 0;
          totalCount += usage.count || 0;

          // Aggregate by workspace
          workspaceAggregates[workspaceId] = {
            inputTokens: usage.totalInputTokens || 0,
            outputTokens: usage.totalOutputTokens || 0,
            costUSD: usage.totalCostUSD || 0,
            costKRW: usage.totalCostKRW || 0,
            count: usage.count || 0
          };

          // Aggregate by model
          if (usage.models) {
            Object.entries(usage.models).forEach(([model, data]: [string, any]) => {
              if (!modelAggregates[model]) {
                modelAggregates[model] = {
                  inputTokens: 0,
                  outputTokens: 0,
                  costUSD: 0,
                  costKRW: 0,
                  count: 0,
                  displayName: getModelDisplayName(model)
                };
              }
              modelAggregates[model].inputTokens += data.inputTokens || 0;
              modelAggregates[model].outputTokens += data.outputTokens || 0;
              modelAggregates[model].costUSD += data.costUSD || 0;
              modelAggregates[model].costKRW += data.costKRW || 0;
              modelAggregates[model].count += data.count || 0;
            });
          }

          // Aggregate by user
          if (usage.users) {
            Object.entries(usage.users).forEach(([userId, data]: [string, any]) => {
              if (!userAggregates[userId]) {
                userAggregates[userId] = {
                  userName: data.userName || userId,
                  inputTokens: 0,
                  outputTokens: 0,
                  costUSD: 0,
                  costKRW: 0,
                  count: 0
                };
              }
              userAggregates[userId].inputTokens += data.inputTokens || 0;
              userAggregates[userId].outputTokens += data.outputTokens || 0;
              userAggregates[userId].costUSD += data.costUSD || 0;
              userAggregates[userId].costKRW += data.costKRW || 0;
              userAggregates[userId].count += data.count || 0;
            });
          }
        }
      }

      setAggregatedUsage({
        totalInputTokens,
        totalOutputTokens,
        totalCostUSD,
        totalCostKRW,
        count: totalCount,
        byModel: modelAggregates,
        byWorkspace: workspaceAggregates,
        byUser: userAggregates
      });

      // Get top users
      const sortedUsers = Object.entries(userAggregates)
        .map(([userId, data]: [string, any]) => ({
          userId,
          ...data
        }))
        .sort((a, b) => b.costKRW - a.costKRW)
        .slice(0, 10);
      setTopUsers(sortedUsers);

      // Generate daily trend (mock data for now - would need daily aggregates)
      generateDailyTrend(monthKey);

    } catch (error) {
      console.error('Error loading company usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentMonthKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}${month}`;
  };

  const generateDailyTrend = (monthKey: string) => {
    const year = parseInt(monthKey.substring(0, 4));
    const month = parseInt(monthKey.substring(4, 6)) - 1;
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    
    const trend = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      trend.push({
        date: currentDate.toLocaleDateString('ko-KR'),
        cost: Math.random() * 50000 + 10000, // Mock data
        tokens: Math.random() * 100000 + 50000
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    setDailyTrend(trend);
  };

  const formatCost = (costKRW: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(costKRW);
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(2)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const modelData = Object.entries(aggregatedUsage.byModel).map(([model, data]: [string, any]) => ({
    name: data.displayName || model,
    inputTokens: data.inputTokens,
    outputTokens: data.outputTokens,
    cost: data.costKRW,
    count: data.count
  }));

  const pieData = modelData.map(m => ({
    name: m.name,
    value: m.cost
  }));

  return (
    <div className="space-y-6">
      {/* Header with Month Selector */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">회사 전체 API 사용량</h3>
          <input
            type="month"
            value={selectedMonth ? `${selectedMonth.substring(0, 4)}-${selectedMonth.substring(4, 6)}` : ''}
            onChange={(e) => {
              if (e.target.value) {
                const [year, month] = e.target.value.split('-');
                setSelectedMonth(`${year}${month}`);
              } else {
                setSelectedMonth('');
              }
            }}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
            <div className="text-sm text-gray-600">총 비용</div>
            <div className="text-2xl font-bold text-blue-700">
              {formatCost(aggregatedUsage.totalCostKRW)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ${aggregatedUsage.totalCostUSD.toFixed(2)} USD
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
            <div className="text-sm text-gray-600">총 입력 토큰</div>
            <div className="text-2xl font-bold text-green-700">
              {formatTokens(aggregatedUsage.totalInputTokens)}
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
            <div className="text-sm text-gray-600">총 출력 토큰</div>
            <div className="text-2xl font-bold text-purple-700">
              {formatTokens(aggregatedUsage.totalOutputTokens)}
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg">
            <div className="text-sm text-gray-600">총 API 호출</div>
            <div className="text-2xl font-bold text-yellow-700">
              {aggregatedUsage.count.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h4 className="text-lg font-semibold mb-4">일별 비용 추이</h4>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCost(value)} />
              <Area type="monotone" dataKey="cost" stroke="#3B82F6" fill="#93C5FD" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Model Distribution Pie Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h4 className="text-lg font-semibold mb-4">모델별 비용 분포</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCost(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Users Table */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h4 className="text-lg font-semibold mb-4">상위 사용자 (Top 10)</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  순위
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사용자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  입력 토큰
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  출력 토큰
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  API 호출
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  비용
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topUsers.map((user, index) => (
                <tr key={user.userId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    #{index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.userName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatTokens(user.inputTokens)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatTokens(user.outputTokens)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {formatCost(user.costKRW)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Usage Details */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h4 className="text-lg font-semibold mb-4">모델별 상세 사용량</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={modelData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip formatter={(value: number) => formatTokens(value)} />
            <Legend />
            <Bar dataKey="inputTokens" fill="#8884d8" name="입력 토큰" />
            <Bar dataKey="outputTokens" fill="#82ca9d" name="출력 토큰" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CompanyUsageDashboard;