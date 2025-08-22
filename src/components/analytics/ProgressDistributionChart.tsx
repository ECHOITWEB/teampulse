import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

interface ProgressDistributionData {
  byStatus: Array<{
    status: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  byProgress: Array<{
    range: string;
    count: number;
    objectives: string[];
  }>;
  byType: Array<{
    type: string;
    count: number;
    color: string;
  }>;
}

interface ProgressDistributionChartProps {
  data: ProgressDistributionData;
  height?: number;
  view?: 'status' | 'progress' | 'type';
}

const ProgressDistributionChart: React.FC<ProgressDistributionChartProps> = ({
  data,
  height = 300,
  view = 'status'
}) => {
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return '완료';
      case 'on_track': return '정상';
      case 'at_risk': return '위험';
      case 'behind': return '지연';
      default: return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'company': return '회사';
      case 'team': return '팀';
      case 'individual': return '개인';
      default: return type;
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">
            {view === 'status' && getStatusLabel(data.status)}
            {view === 'type' && getTypeLabel(data.type)}
            {view === 'progress' && data.range}
          </p>
          <p className="text-sm text-gray-600">
            개수: {data.count}
            {view === 'status' && data.percentage && ` (${data.percentage}%)`}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderPieChart = (data: any[], dataKey: string, nameKey: string) => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percentage }: any) => `${name} ${percentage}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey={dataKey}
          nameKey={nameKey}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderBarChart = (data: any[], dataKey: string, nameKey: string) => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
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
          dataKey={nameKey} 
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar 
          dataKey={dataKey}
          fill="#3B82F6"
          radius={[4, 4, 0, 0]}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || '#3B82F6'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const renderContent = () => {
    switch (view) {
      case 'status':
        const statusData = data.byStatus.map(item => ({
          ...item,
          name: getStatusLabel(item.status)
        }));
        return renderPieChart(statusData, 'count', 'name');
      
      case 'type':
        const typeData = data.byType.map(item => ({
          ...item,
          name: getTypeLabel(item.type)
        }));
        return renderPieChart(typeData, 'count', 'name');
      
      case 'progress':
        const progressData = data.byProgress.map(item => ({
          ...item,
          name: item.range,
          color: '#3B82F6'
        }));
        return renderBarChart(progressData, 'count', 'name');
      
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      {renderContent()}
    </div>
  );
};

export default ProgressDistributionChart;