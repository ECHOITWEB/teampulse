import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, User, Users, Building, 
  Target, ChevronRight, ChevronDown 
} from 'lucide-react';
import { Objective } from '../../services/okrService';

interface OKRGanttChartProps {
  objectives: Objective[];
  year: string;
  onObjectiveClick?: (objective: Objective) => void;
}

const OKRGanttChart: React.FC<OKRGanttChartProps> = ({ 
  objectives, 
  year,
  onObjectiveClick 
}) => {
  const [expandedTypes, setExpandedTypes] = React.useState<Set<string>>(
    new Set(['company', 'team', 'individual'])
  );

  // Group objectives by type
  const groupedObjectives = useMemo(() => {
    const groups = {
      company: objectives.filter(o => o.type === 'company'),
      team: objectives.filter(o => o.type === 'team'),
      individual: objectives.filter(o => o.type === 'individual')
    };
    return groups;
  }, [objectives]);

  // Get quarter position and width for Gantt chart
  const getQuarterPosition = (quarter: string) => {
    const quarterMap: Record<string, number> = { Q1: 0, Q2: 1, Q3: 2, Q4: 3 };
    return (quarterMap[quarter] || 0) * 25; // Each quarter is 25% width
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'on_track': return 'bg-blue-500';
      case 'at_risk': return 'bg-yellow-500';
      case 'behind': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'company': return <Building className="w-5 h-5" />;
      case 'team': return <Users className="w-5 h-5" />;
      case 'individual': return <User className="w-5 h-5" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'company': return '회사 목표';
      case 'team': return '팀 목표';
      case 'individual': return '개인 목표';
      default: return '목표';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'company': return 'text-purple-600 bg-purple-50';
      case 'team': return 'text-blue-600 bg-blue-50';
      case 'individual': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const toggleType = (type: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedTypes(newExpanded);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-gray-900">간트 차트 보기</h2>
            <span className="text-sm text-gray-600">({year}년)</span>
          </div>
        </div>
      </div>

      {/* Timeline Header */}
      <div className="px-6 py-3 bg-gray-50 border-b">
        <div className="flex">
          <div className="w-64 font-medium text-gray-700">목표</div>
          <div className="flex-1 grid grid-cols-4 text-center text-sm font-medium text-gray-600">
            <div className="border-l border-gray-300 px-2">Q1 (1-3월)</div>
            <div className="border-l border-gray-300 px-2">Q2 (4-6월)</div>
            <div className="border-l border-gray-300 px-2">Q3 (7-9월)</div>
            <div className="border-l border-gray-300 px-2">Q4 (10-12월)</div>
          </div>
        </div>
      </div>

      {/* Gantt Chart Body */}
      <div className="max-h-[600px] overflow-y-auto">
        {(['company', 'team', 'individual'] as const).map(type => {
          const typeObjectives = groupedObjectives[type];
          if (typeObjectives.length === 0) return null;

          return (
            <div key={type} className="border-b border-gray-200">
              {/* Type Header */}
              <button
                onClick={() => toggleType(type)}
                className={`w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${getTypeColor(type)}`}
              >
                <div className="flex items-center gap-3">
                  {expandedTypes.has(type) ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                  {getTypeIcon(type)}
                  <span className="font-semibold">{getTypeLabel(type)}</span>
                  <span className="text-sm opacity-75">({typeObjectives.length}개)</span>
                </div>
              </button>

              {/* Objectives */}
              {expandedTypes.has(type) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {typeObjectives.map((objective) => (
                    <div
                      key={objective.id}
                      className="flex hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => onObjectiveClick?.(objective)}
                    >
                      {/* Objective Name */}
                      <div className="w-64 px-6 py-3 border-r border-gray-200">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 text-sm truncate">
                            {objective.title}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{objective.user_id || objective.workspace_id || '회사'}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              objective.progress >= 70 ? 'bg-green-100 text-green-700' :
                              objective.progress >= 40 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {objective.progress}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="flex-1 relative grid grid-cols-4">
                        {/* Quarter Grid Lines */}
                        <div className="border-l border-gray-200"></div>
                        <div className="border-l border-gray-200"></div>
                        <div className="border-l border-gray-200"></div>
                        <div className="border-l border-gray-200"></div>

                        {/* Gantt Bar */}
                        <div
                          className="absolute top-3 h-8"
                          style={{
                            left: `${getQuarterPosition(`Q${objective.period?.quarter || 1}`)}%`,
                            width: '25%'
                          }}
                        >
                          <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className={`h-full rounded-md ${getStatusColor(objective.status)} bg-opacity-80 shadow-sm`}
                            style={{ transformOrigin: 'left' }}
                          >
                            <div className="h-full flex items-center px-2">
                              <div
                                className="h-1 bg-white bg-opacity-50 rounded-full"
                                style={{ width: `${objective.progress}%` }}
                              />
                            </div>
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-6 py-3 bg-gray-50 border-t">
        <div className="flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>완료</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>순조롭게 진행</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>위험</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>지연</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded"></div>
            <span>시작 전</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OKRGanttChart;