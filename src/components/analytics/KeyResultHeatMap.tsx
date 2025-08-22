import React from 'react';

interface HeatMapData {
  team: string;
  quarter: string;
  performance: number;
  keyResultsCount: number;
  completionRate: number;
  color: string;
}

interface KeyResultHeatMapProps {
  data: HeatMapData[];
  height?: number;
}

const KeyResultHeatMap: React.FC<KeyResultHeatMapProps> = ({
  data,
  height = 400
}) => {
  const teams = Array.from(new Set(data.map(d => d.team)));
  const quarters = Array.from(new Set(data.map(d => d.quarter)));

  const getIntensity = (performance: number) => {
    if (performance >= 80) return 1.0;
    if (performance >= 60) return 0.7;
    if (performance >= 40) return 0.5;
    if (performance >= 20) return 0.3;
    return 0.1;
  };

  const getColor = (performance: number) => {
    const intensity = getIntensity(performance);
    if (performance >= 80) return `rgba(16, 185, 129, ${intensity})`; // Green
    if (performance >= 60) return `rgba(59, 130, 246, ${intensity})`; // Blue
    if (performance >= 40) return `rgba(245, 158, 11, ${intensity})`; // Yellow
    return `rgba(239, 68, 68, ${intensity})`; // Red
  };

  const getCellData = (team: string, quarter: string) => {
    return data.find(d => d.team === team && d.quarter === quarter);
  };

  const getPerformanceText = (performance: number) => {
    if (performance >= 80) return '우수';
    if (performance >= 60) return '양호';
    if (performance >= 40) return '보통';
    if (performance >= 20) return '개선필요';
    return '미흡';
  };

  return (
    <div className="w-full" style={{ height }}>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Header */}
          <div className="grid grid-cols-5 gap-1 mb-2">
            <div className="p-2"></div>
            {quarters.map(quarter => (
              <div key={quarter} className="p-2 text-center font-medium text-gray-700 text-sm">
                {quarter}
              </div>
            ))}
          </div>

          {/* Heat map rows */}
          {teams.map(team => (
            <div key={team} className="grid grid-cols-5 gap-1 mb-1">
              <div className="p-2 text-right font-medium text-gray-700 text-sm border-r border-gray-200">
                {team}
              </div>
              {quarters.map(quarter => {
                const cellData = getCellData(team, quarter);
                const performance = cellData?.performance || 0;
                const keyResultsCount = cellData?.keyResultsCount || 0;
                const completionRate = cellData?.completionRate || 0;

                return (
                  <div
                    key={`${team}-${quarter}`}
                    className="relative group p-3 text-center rounded-lg border border-gray-200 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all duration-200"
                    style={{
                      backgroundColor: getColor(performance),
                      minHeight: '60px'
                    }}
                  >
                    <div className="text-sm font-bold text-gray-900">
                      {performance}%
                    </div>
                    <div className="text-xs text-gray-700 mt-1">
                      {keyResultsCount}개 KR
                    </div>

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
                      <div className="font-medium">{team} - {quarter}</div>
                      <div>성과: {performance}% ({getPerformanceText(performance)})</div>
                      <div>핵심결과: {keyResultsCount}개</div>
                      <div>완료율: {completionRate}%</div>
                      
                      {/* Arrow */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center space-x-6">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">성과도:</span>
          <div className="flex items-center space-x-1">
            {[
              { color: 'rgba(239, 68, 68, 0.7)', label: '미흡' },
              { color: 'rgba(245, 158, 11, 0.7)', label: '보통' },
              { color: 'rgba(59, 130, 246, 0.7)', label: '양호' },
              { color: 'rgba(16, 185, 129, 0.7)', label: '우수' }
            ].map((item, index) => (
              <div key={index} className="flex items-center space-x-1">
                <div 
                  className="w-4 h-4 rounded border border-gray-300"
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

export default KeyResultHeatMap;