import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import usageTrackerService, { AggregatedUsage } from '../../services/usageTrackerService';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const WorkspaceUsageDashboard: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [monthlyUsage, setMonthlyUsage] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [detailedUsage, setDetailedUsage] = useState<AggregatedUsage | null>(null);

  useEffect(() => {
    if (currentWorkspace) {
      loadMonthlyUsage();
    }
  }, [currentWorkspace, selectedMonth]);

  const loadMonthlyUsage = async () => {
    if (!currentWorkspace) return;
    
    setLoading(true);
    try {
      // Get current month usage
      const usage = await usageTrackerService.getWorkspaceMonthlyUsage(
        currentWorkspace.id,
        selectedMonth || undefined
      );
      setMonthlyUsage(usage);

      // Get detailed usage for date range if needed
      if (selectedMonth) {
        const year = parseInt(selectedMonth.substring(0, 4));
        const month = parseInt(selectedMonth.substring(4, 6)) - 1;
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        
        const detailed = await usageTrackerService.getWorkspaceUsage(
          currentWorkspace.id,
          startDate,
          endDate
        );
        setDetailedUsage(detailed);
      }
    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCost = (costPulse: number) => {
    return `${Math.floor(costPulse || 0)} Pulse`;
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
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!monthlyUsage) {
    return (
      <div className="p-6 text-center text-gray-500">
        사용량 데이터가 없습니다.
      </div>
    );
  }

  // Prepare data for charts
  const modelData = Object.entries(monthlyUsage.models || {}).map(([model, data]: [string, any]) => ({
    name: model,
    inputTokens: data.inputTokens || 0,
    outputTokens: data.outputTokens || 0,
    cost: data.costPulse || 0,
    count: data.count || 0
  }));

  const userData = Object.entries(monthlyUsage.users || {}).map(([userId, data]: [string, any]) => ({
    userId,
    name: data.userName || userId,
    inputTokens: data.inputTokens || 0,
    outputTokens: data.outputTokens || 0,
    cost: data.costPulse || 0,
    count: data.count || 0
  }));

  const pieData = modelData.map(m => ({
    name: m.name,
    value: m.cost
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">워크스페이스 API 사용량</h2>
        
        {/* Month Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            조회 기간
          </label>
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">사용한 Pulse</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCost(monthlyUsage.totalCostPulse)}
            </div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">남은 Pulse</div>
            <div className="text-2xl font-bold text-orange-600">
              {Math.floor(monthlyUsage.remainingPulse || 10000)} Pulse
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">입력 토큰</div>
            <div className="text-2xl font-bold text-green-600">
              {formatTokens(monthlyUsage.totalInputTokens)}
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">출력 토큰</div>
            <div className="text-2xl font-bold text-purple-600">
              {formatTokens(monthlyUsage.totalOutputTokens)}
            </div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">총 요청</div>
            <div className="text-2xl font-bold text-yellow-600">
              {monthlyUsage.count}
            </div>
          </div>
        </div>
      </div>

      {/* Model Usage Chart */}
      {modelData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">모델별 사용량</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div>
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

            {/* Pie Chart */}
            <div>
              <ResponsiveContainer width="100%" height={300}>
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
        </div>
      )}

      {/* User Usage Table */}
      {userData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">사용자별 사용량</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
                    요청 수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    비용
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userData
                  .sort((a, b) => b.cost - a.cost)
                  .map((user) => (
                    <tr key={user.userId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.name}
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
                        {formatCost(user.cost)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceUsageDashboard;