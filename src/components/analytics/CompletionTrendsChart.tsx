import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface CompletionTrendsData {
  date: string;
  completed: number;
  inProgress: number;
  atRisk: number;
  notStarted: number;
}

interface CompletionTrendsChartProps {
  data: CompletionTrendsData[];
  height?: number;
  showLegend?: boolean;
}

const CompletionTrendsChart: React.FC<CompletionTrendsChartProps> = ({
  data,
  height = 300,
  showLegend = true
}) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}개
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            tick={{ fontSize: 12 }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
            />
          )}
          
          <Area
            type="monotone"
            dataKey="completed"
            stackId="1"
            stroke="#10B981"
            fill="#10B981"
            fillOpacity={0.7}
            name="완료"
          />
          <Area
            type="monotone"
            dataKey="inProgress"
            stackId="1"
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.7}
            name="진행중"
          />
          <Area
            type="monotone"
            dataKey="atRisk"
            stackId="1"
            stroke="#F59E0B"
            fill="#F59E0B"
            fillOpacity={0.7}
            name="위험"
          />
          <Area
            type="monotone"
            dataKey="notStarted"
            stackId="1"
            stroke="#6B7280"
            fill="#6B7280"
            fillOpacity={0.7}
            name="시작전"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CompletionTrendsChart;