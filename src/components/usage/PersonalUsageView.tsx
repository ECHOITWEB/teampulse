import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import usageTrackerService, { AggregatedUsage } from '../../services/usageTrackerService';
import { auth } from '../../config/firebase';
import { getModelDisplayName } from '../../config/apiPricing';

const PersonalUsageView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [monthlyUsage, setMonthlyUsage] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [periodUsage, setPeriodUsage] = useState<AggregatedUsage | null>(null);
  const [dailyData, setDailyData] = useState<any[]>([]);

  useEffect(() => {
    loadUsageData();
  }, [selectedMonth]);

  const loadUsageData = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    setLoading(true);
    try {
      // Get monthly usage
      const monthly = await usageTrackerService.getUserMonthlyUsage(
        user.uid,
        selectedMonth || undefined
      );
      setMonthlyUsage(monthly);

      // Get period usage for detailed view
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (selectedMonth) {
        const year = parseInt(selectedMonth.substring(0, 4));
        const month = parseInt(selectedMonth.substring(4, 6)) - 1;
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0);
      } else {
        // Current month
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
      
      const usage = await usageTrackerService.getUserUsage(
        user.uid,
        startDate,
        endDate
      );
      setPeriodUsage(usage);

      // Generate daily data for chart (mock for now - would need daily aggregates)
      const days = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        days.push({
          date: currentDate.toLocaleDateString('ko-KR'),
          cost: Math.random() * 5000, // Mock data - replace with real daily data
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      setDailyData(days);
      
    } catch (error) {
      console.error('Error loading personal usage:', error);
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const modelData = monthlyUsage?.models ? 
    Object.entries(monthlyUsage.models).map(([model, data]: [string, any]) => ({
      model: getModelDisplayName(model),
      inputTokens: data.inputTokens || 0,
      outputTokens: data.outputTokens || 0,
      cost: data.costKRW || 0,
      count: data.count || 0
    })) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold mb-4">나의 API 사용량</h3>
        
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
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
            <div className="text-sm text-gray-600">이번 달 총 비용</div>
            <div className="text-xl font-bold text-blue-700">
              {formatCost(monthlyUsage?.totalCostKRW || 0)}
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
            <div className="text-sm text-gray-600">입력 토큰</div>
            <div className="text-xl font-bold text-green-700">
              {formatTokens(monthlyUsage?.totalInputTokens || 0)}
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
            <div className="text-sm text-gray-600">출력 토큰</div>
            <div className="text-xl font-bold text-purple-700">
              {formatTokens(monthlyUsage?.totalOutputTokens || 0)}
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg">
            <div className="text-sm text-gray-600">API 호출</div>
            <div className="text-xl font-bold text-yellow-700">
              {monthlyUsage?.count || 0}회
            </div>
          </div>
        </div>
      </div>

      {/* Daily Usage Trend */}
      {dailyData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h4 className="text-lg font-semibold mb-4">일별 사용량 추이</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCost(value)} />
              <Legend />
              <Line type="monotone" dataKey="cost" stroke="#3B82F6" name="비용" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Model Usage */}
      {modelData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h4 className="text-lg font-semibold mb-4">모델별 사용량</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={modelData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="model" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(value: number) => formatTokens(value)} />
              <Legend />
              <Bar dataKey="inputTokens" fill="#8884d8" name="입력 토큰" />
              <Bar dataKey="outputTokens" fill="#82ca9d" name="출력 토큰" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detailed Table */}
      {modelData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h4 className="text-lg font-semibold mb-4">상세 사용 내역</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    모델
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    입력 토큰
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    출력 토큰
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    호출 수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    비용
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {modelData.map((model) => (
                  <tr key={model.model}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {model.model}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTokens(model.inputTokens)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTokens(model.outputTokens)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {model.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {formatCost(model.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cost Breakdown */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h4 className="text-lg font-semibold mb-4">비용 안내</h4>
        <div className="text-sm text-gray-600 space-y-2">
          <p>• 비용은 실시간으로 계산되며, 한국 원화(KRW)로 표시됩니다.</p>
          <p>• 환율: 1 USD = 1,300 KRW 기준</p>
          <p>• 토큰 단위: 1K = 1,000토큰, 1M = 1,000,000토큰</p>
          <p>• 실제 청구 금액은 사용한 API 제공사의 정책에 따라 다를 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
};

export default PersonalUsageView;