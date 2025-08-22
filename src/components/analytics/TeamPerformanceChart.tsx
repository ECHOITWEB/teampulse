import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface TeamPerformanceData {
  teamId: number;
  teamName: string;
  color: string;
  totalObjectives: number;
  completedObjectives: number;
  averageProgress: number;
  onTrackCount: number;
  atRiskCount: number;
  completionRate: string;
  velocity: number;
  memberCount: number;
  keyResultsCompleted: number;
}

interface TeamPerformanceChartProps {
  data: TeamPerformanceData[];
  height?: number;
  metric?: 'progress' | 'completion' | 'velocity';
}

const TeamPerformanceChart: React.FC<TeamPerformanceChartProps> = ({
  data,
  height = 300,
  metric = 'progress'
}) => {
  const getMetricData = (team: TeamPerformanceData) => {
    switch (metric) {
      case 'completion':
        return parseFloat(team.completionRate);
      case 'velocity':
        return team.velocity;
      default:
        return team.averageProgress;
    }
  };

  const getMetricLabel = () => {
    switch (metric) {
      case 'completion':
        return '완료율 (%)';
      case 'velocity':
        return '속도 (점수)';
      default:
        return '평균 진행률 (%)';
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const team = data.find(t => t.teamName === label);
      if (!team) return null;

      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{team.teamName}</p>
          <div className="space-y-1 text-sm">
            <p>전체 목표: {team.totalObjectives}개</p>
            <p>완료된 목표: {team.completedObjectives}개</p>
            <p>평균 진행률: {team.averageProgress}%</p>
            <p>완료율: {team.completionRate}%</p>
            <p>팀원 수: {team.memberCount}명</p>
            <div className="flex space-x-4 mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                정상: {team.onTrackCount}
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                위험: {team.atRiskCount}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const chartData = data.map(team => ({
    ...team,
    value: getMetricData(team)
  }));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="teamName" 
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            label={{ 
              value: getMetricLabel(), 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle' }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          
          <Bar 
            dataKey="value" 
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TeamPerformanceChart;