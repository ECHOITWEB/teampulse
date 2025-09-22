import React, { useMemo } from 'react';
import { Objective } from '../../services/okrService';
import { Calendar, Target, Users, User, Trophy } from 'lucide-react';

interface GanttChartProps {
  objectives: Objective[];
  year: string;
  onObjectiveClick?: (objective: Objective) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({ objectives, year, onObjectiveClick }) => {
  // 월 이름 배열
  const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  
  // 분기별 기본 날짜 매핑
  const quarterDates = {
    'Q1': { start: `${year}-01-01`, end: `${year}-03-31` },
    'Q2': { start: `${year}-04-01`, end: `${year}-06-30` },
    'Q3': { start: `${year}-07-01`, end: `${year}-09-30` },
    'Q4': { start: `${year}-10-01`, end: `${year}-12-31` }
  };

  // 목표별 날짜 계산
  const objectivesWithDates = useMemo(() => {
    return objectives.map(obj => {
      let startDate: Date;
      let endDate: Date;
      
      if (obj.period?.start_date && obj.period?.end_date) {
        // 커스텀 날짜가 있으면 사용
        startDate = obj.period.start_date.toDate();
        endDate = obj.period.end_date.toDate();
      } else {
        // 없으면 분기별 기본 날짜 사용
        const quarterKey = `Q${obj.period?.quarter || 1}` as keyof typeof quarterDates;
        const dates = quarterDates[quarterKey];
        startDate = new Date(dates.start);
        endDate = new Date(dates.end);
      }
      
      return {
        ...obj,
        startDate,
        endDate,
        startMonth: startDate.getMonth(),
        endMonth: endDate.getMonth(),
        startYear: startDate.getFullYear(),
        endYear: endDate.getFullYear()
      };
    });
  }, [objectives, year]);

  // 타입별로 목표 그룹화
  const groupedObjectives = useMemo(() => {
    const grouped = {
      company: [] as typeof objectivesWithDates,
      team: [] as typeof objectivesWithDates,
      individual: [] as typeof objectivesWithDates
    };
    
    objectivesWithDates.forEach(obj => {
      grouped[obj.type].push(obj);
    });
    
    return grouped;
  }, [objectivesWithDates]);

  // 진행률에 따른 색상 결정
  const getProgressColor = (progress: number, status: string) => {
    if (status === 'completed') return 'bg-green-500';
    if (progress >= 70) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // 목표 바 렌더링
  const renderObjectiveBar = (obj: typeof objectivesWithDates[0]) => {
    const currentYear = parseInt(year);
    const isCurrentYear = obj.startYear === currentYear && obj.endYear === currentYear;
    const startMonth = obj.startYear < currentYear ? 0 : obj.startMonth;
    const endMonth = obj.endYear > currentYear ? 11 : obj.endMonth;
    
    // 현재 연도에 해당하는 부분만 표시
    if (obj.startYear > currentYear || obj.endYear < currentYear) {
      if (obj.startYear !== currentYear && obj.endYear !== currentYear) {
        return null; // 이 연도에 해당하지 않음
      }
    }
    
    const leftPosition = (startMonth / 12) * 100;
    const width = ((endMonth - startMonth + 1) / 12) * 100;
    
    return (
      <div
        key={obj.id}
        className="relative h-10 mb-2 group cursor-pointer"
        onClick={() => {
          const originalObj = objectives.find(o => o.id === obj.id);
          if (originalObj) onObjectiveClick?.(originalObj);
        }}
      >
        <div
          className={`absolute h-full rounded-lg ${getProgressColor(obj.progress, obj.status)} bg-opacity-20 border-2 border-current`}
          style={{
            left: `${leftPosition}%`,
            width: `${width}%`
          }}
        >
          <div
            className={`h-full rounded-lg ${getProgressColor(obj.progress, obj.status)} bg-opacity-60`}
            style={{ width: `${obj.progress}%` }}
          />
          <div className="absolute inset-0 flex items-center px-2">
            <span className="text-xs font-medium text-gray-800 truncate">
              {obj.title}
            </span>
          </div>
        </div>
        
        {/* 호버 시 상세 정보 */}
        <div className="absolute left-0 -top-16 bg-gray-900 text-white p-2 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
          <div className="font-semibold">{obj.title}</div>
          <div>진행률: {obj.progress}%</div>
          <div>기간: {obj.startDate.toLocaleDateString()} ~ {obj.endDate.toLocaleDateString()}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary" />
          {year}년 OKR 간트차트
        </h2>
      </div>

      {/* 월 헤더 */}
      <div className="relative mb-4">
        <div className="grid grid-cols-12 text-center text-sm font-medium text-gray-600 border-b border-gray-200 pb-2">
          {months.map((month, index) => (
            <div key={index} className="px-1">
              {month}
            </div>
          ))}
        </div>
      </div>

      {/* 회사 목표 */}
      {groupedObjectives.company.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-700">회사 목표</h3>
          </div>
          <div className="pl-7">
            {groupedObjectives.company.map(renderObjectiveBar)}
          </div>
        </div>
      )}

      {/* 팀 목표 */}
      {groupedObjectives.team.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-700">팀 목표</h3>
          </div>
          <div className="pl-7">
            {groupedObjectives.team.map(renderObjectiveBar)}
          </div>
        </div>
      )}

      {/* 개인 목표 */}
      {groupedObjectives.individual.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-5 h-5 text-green-600" />
            <h3 className="text-sm font-semibold text-gray-700">개인 목표</h3>
          </div>
          <div className="pl-7">
            {groupedObjectives.individual.map(renderObjectiveBar)}
          </div>
        </div>
      )}

      {/* 범례 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-6 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>완료/순조</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>진행중 (70%+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>주의 (40-70%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>위험 (&lt;40%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;