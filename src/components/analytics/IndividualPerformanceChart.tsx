import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface IndividualPerformanceData {
  userId: number;
  userName: string;
  avatar: string;
  totalObjectives: number;
  completedObjectives: number;
  averageProgress: number;
  completionRate: string;
  keyResultsOwned: number;
  keyResultsCompleted: number;
  performanceScore: number;
  streak: number;
  lastActivity: string;
}

interface IndividualPerformanceChartProps {
  data: IndividualPerformanceData[];
  height?: number;
  xMetric?: 'averageProgress' | 'completionRate' | 'keyResultsOwned';
  yMetric?: 'performanceScore' | 'streak' | 'totalObjectives';
}

const IndividualPerformanceChart: React.FC<IndividualPerformanceChartProps> = ({
  data,
  height = 400,
  xMetric = 'averageProgress',
  yMetric = 'performanceScore'
}) => {
  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'averageProgress': return '평균 진행률 (%)';
      case 'completionRate': return '완료율 (%)';
      case 'keyResultsOwned': return '담당 핵심결과 수';
      case 'performanceScore': return '성과 점수';
      case 'streak': return '연속 달성 일수';
      case 'totalObjectives': return '전체 목표 수';
      default: return metric;
    }
  };

  const getMetricValue = (user: IndividualPerformanceData, metric: string) => {
    switch (metric) {
      case 'averageProgress': return user.averageProgress;
      case 'completionRate': return parseFloat(user.completionRate);
      case 'keyResultsOwned': return user.keyResultsOwned;
      case 'performanceScore': return user.performanceScore;
      case 'streak': return user.streak;
      case 'totalObjectives': return user.totalObjectives;
      default: return 0;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10B981'; // Green
    if (score >= 80) return '#3B82F6'; // Blue
    if (score >= 70) return '#F59E0B'; // Yellow
    if (score >= 60) return '#EF4444'; // Red
    return '#6B7280'; // Gray
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const user = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-center space-x-3 mb-3">
            <img 
              src={user.avatar} 
              alt={user.userName}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <p className="font-medium text-gray-900">{user.userName}</p>
              <p className="text-sm text-gray-500">성과 점수: {user.performanceScore}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">목표 수</p>
              <p className="font-medium">{user.totalObjectives}개</p>
            </div>
            <div>
              <p className="text-gray-500">완료 목표</p>
              <p className="font-medium">{user.completedObjectives}개</p>
            </div>
            <div>
              <p className="text-gray-500">평균 진행률</p>
              <p className="font-medium">{user.averageProgress}%</p>
            </div>
            <div>
              <p className="text-gray-500">완료율</p>
              <p className="font-medium">{user.completionRate}%</p>
            </div>
            <div>
              <p className="text-gray-500">담당 KR</p>
              <p className="font-medium">{user.keyResultsOwned}개</p>
            </div>
            <div>
              <p className="text-gray-500">연속 달성</p>
              <p className="font-medium">{user.streak}일</p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const chartData = data.map(user => ({
    ...user,
    x: getMetricValue(user, xMetric),
    y: getMetricValue(user, yMetric),
    size: Math.max(user.totalObjectives * 10, 50) // Bubble size based on total objectives
  }));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart
          margin={{
            top: 20,
            right: 20,
            bottom: 60,
            left: 60,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            type="number"
            dataKey="x"
            name={getMetricLabel(xMetric)}
            tick={{ fontSize: 12 }}
            label={{
              value: getMetricLabel(xMetric),
              position: 'insideBottom',
              offset: -5,
              style: { textAnchor: 'middle' }
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={getMetricLabel(yMetric)}
            tick={{ fontSize: 12 }}
            label={{
              value: getMetricLabel(yMetric),
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle' }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          
          <Scatter
            data={chartData}
            fill="#3B82F6"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getScoreColor(entry.performanceScore)}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Performance legend */}
      <div className="mt-4 flex items-center justify-center space-x-6">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">성과 점수:</span>
          <div className="flex items-center space-x-2">
            {[
              { color: '#10B981', label: '90+' },
              { color: '#3B82F6', label: '80-89' },
              { color: '#F59E0B', label: '70-79' },
              { color: '#EF4444', label: '60-69' },
              { color: '#6B7280', label: '<60' }
            ].map((item, index) => (
              <div key={index} className="flex items-center space-x-1">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-xs text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndividualPerformanceChart;