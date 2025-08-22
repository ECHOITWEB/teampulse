import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  Target, 
  User, 
  Clock, 
  MoreVertical, 
  Edit, 
  MessageCircle,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ChevronRight
} from 'lucide-react';
import useMobileDetection from '../../hooks/useMobileDetection';
import HapticFeedback from '../../utils/hapticFeedback';

export interface KeyResult {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  progress: number;
  status: 'not_started' | 'on_track' | 'at_risk' | 'behind' | 'completed';
  owner: string;
}

export interface MobileGoal {
  id: string;
  title: string;
  description: string;
  progress: number;
  status: 'active' | 'at_risk' | 'completed' | 'paused';
  owner: string;
  team?: string;
  dueDate: string;
  keyResults: KeyResult[];
  commentCount: number;
  lastUpdate: string;
}

interface MobileGoalCardProps {
  goal: MobileGoal;
  onQuickUpdate: (goalId: string) => void;
  onViewDetails: (goalId: string) => void;
  onSwipeAction?: (goalId: string, action: 'edit' | 'complete' | 'comment') => void;
  isSelected?: boolean;
  showSwipeHint?: boolean;
}

const MobileGoalCard: React.FC<MobileGoalCardProps> = ({
  goal,
  onQuickUpdate,
  onViewDetails,
  onSwipeAction,
  isSelected = false,
  showSwipeHint = false
}) => {
  const { isMobile, isOneHandedMode, hasTouch } = useMobileDetection();
  const [isExpanded, setIsExpanded] = useState(false);
  const [swipeState, setSwipeState] = useState<'none' | 'left' | 'right'>('none');
  const [dragX, setDragX] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Swipe thresholds
  const SWIPE_THRESHOLD = 80;
  const SWIPE_VELOCITY_THRESHOLD = 500;

  const handlePanStart = useCallback(() => {
    if (hasTouch && HapticFeedback.supported) {
      HapticFeedback.light();
    }
  }, [hasTouch]);

  const handlePan = useCallback((_event: any, info: PanInfo) => {
    setDragX(info.offset.x);
    
    // Determine swipe state
    if (Math.abs(info.offset.x) > 20) {
      const newSwipeState = info.offset.x > 0 ? 'right' : 'left';
      if (newSwipeState !== swipeState) {
        setSwipeState(newSwipeState);
        if (hasTouch && HapticFeedback.supported) {
          HapticFeedback.selection();
        }
      }
    } else {
      setSwipeState('none');
    }
  }, [swipeState, hasTouch]);

  const handlePanEnd = useCallback((_event: any, info: PanInfo) => {
    const shouldTriggerAction = 
      Math.abs(info.offset.x) > SWIPE_THRESHOLD || 
      Math.abs(info.velocity.x) > SWIPE_VELOCITY_THRESHOLD;

    if (shouldTriggerAction) {
      const action = info.offset.x > 0 ? 'edit' : 'comment';
      
      if (hasTouch && HapticFeedback.supported) {
        HapticFeedback.medium();
      }
      
      onSwipeAction?.(goal.id, action);
    }

    // Reset states
    setSwipeState('none');
    setDragX(0);
  }, [goal.id, onSwipeAction, hasTouch]);

  const handleCardPress = useCallback(() => {
    if (hasTouch && HapticFeedback.supported) {
      HapticFeedback.light();
    }
    setIsExpanded(!isExpanded);
  }, [isExpanded, hasTouch]);

  const handleQuickUpdate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasTouch && HapticFeedback.supported) {
      HapticFeedback.medium();
    }
    onQuickUpdate(goal.id);
  }, [goal.id, onQuickUpdate, hasTouch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'active': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'at_risk': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'paused': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getProgressColor = (progress: number, status: string) => {
    if (status === 'completed') return 'bg-green-500';
    if (status === 'at_risk') return 'bg-yellow-500';
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getKeyResultIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'at_risk': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'on_track': return <TrendingUp className="w-4 h-4 text-blue-600" />;
      default: return <Target className="w-4 h-4 text-gray-400" />;
    }
  };

  // Swipe action backgrounds
  const leftAction = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: swipeState === 'right' ? 1 : 0 }}
      className="absolute left-0 top-0 h-full w-20 bg-blue-500 flex items-center justify-center rounded-l-xl"
    >
      <Edit className="w-6 h-6 text-white" />
    </motion.div>
  );

  const rightAction = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: swipeState === 'left' ? 1 : 0 }}
      className="absolute right-0 top-0 h-full w-20 bg-purple-500 flex items-center justify-center rounded-r-xl"
    >
      <MessageCircle className="w-6 h-6 text-white" />
    </motion.div>
  );

  return (
    <div className="relative mb-4">
      {/* Swipe action backgrounds */}
      {hasTouch && (
        <>
          {leftAction}
          {rightAction}
        </>
      )}

      {/* Main card */}
      <motion.div
        ref={cardRef}
        drag={hasTouch ? "x" : false}
        dragConstraints={{ left: -120, right: 120 }}
        dragElastic={0.2}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        animate={{ x: 0 }}
        whileTap={{ scale: 0.98 }}
        className={`
          relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden
          ${isSelected ? 'ring-2 ring-blue-500' : ''}
          ${hasTouch ? 'cursor-pointer' : 'cursor-default'}
        `}
        style={{ 
          transform: hasTouch ? `translateX(${dragX}px)` : undefined,
          touchAction: 'pan-y'
        }}
      >
        {/* Card Header */}
        <div 
          className="p-4 pb-3"
          onClick={handleCardPress}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(goal.status)}`}>
                  {goal.status === 'active' ? '진행중' : 
                   goal.status === 'completed' ? '완료' : 
                   goal.status === 'at_risk' ? '위험' : '일시정지'}
                </span>
                {goal.team && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {goal.team}
                  </span>
                )}
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
                {goal.title}
              </h3>
              
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {goal.description}
              </p>
            </div>
            
            <div className="flex-shrink-0 ml-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasTouch && HapticFeedback.supported) {
                    HapticFeedback.light();
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Progress Section */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">전체 진행률</span>
              <span className="text-lg font-bold text-gray-900">{goal.progress}%</span>
            </div>
            
            {/* Progress Bar */}
            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${goal.progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${getProgressColor(goal.progress, goal.status)}`}
              />
            </div>
          </div>

          {/* Meta Information */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {goal.owner}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {goal.dueDate}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>{goal.commentCount}</span>
            </div>
          </div>
        </div>

        {/* Expanded Key Results */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-gray-100 bg-gray-50"
            >
              <div className="p-4 pt-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  주요 결과 ({goal.keyResults.length})
                </h4>
                
                <div className="space-y-3">
                  {goal.keyResults.slice(0, isOneHandedMode ? 2 : 3).map((kr) => (
                    <div key={kr.id} className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-2 flex-1">
                          {getKeyResultIcon(kr.status)}
                          <div className="min-w-0 flex-1">
                            <h5 className="text-sm font-medium text-gray-900 line-clamp-2">
                              {kr.title}
                            </h5>
                            <p className="text-xs text-gray-600 mt-1">
                              {kr.owner}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right ml-2">
                          <div className="text-sm font-medium text-gray-900">
                            {kr.currentValue}/{kr.targetValue}
                          </div>
                          <div className="text-xs text-gray-500">{kr.unit}</div>
                        </div>
                      </div>
                      
                      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${kr.progress}%` }}
                          transition={{ duration: 0.6, delay: 0.1 }}
                          className={`h-full rounded-full ${getProgressColor(kr.progress, kr.status)}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {goal.keyResults.length > (isOneHandedMode ? 2 : 3) && (
                  <button 
                    onClick={() => onViewDetails(goal.id)}
                    className="w-full mt-3 py-2 text-sm text-blue-600 font-medium flex items-center justify-center gap-1"
                  >
                    <span>더보기 ({goal.keyResults.length - (isOneHandedMode ? 2 : 3)}개)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Action Bar */}
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleQuickUpdate}
              className="flex-1 py-2 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 min-h-[44px]"
            >
              <TrendingUp className="w-4 h-4" />
              업데이트
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onViewDetails(goal.id)}
              className="py-2 px-4 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium min-h-[44px]"
            >
              상세보기
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Swipe hint */}
      {showSwipeHint && hasTouch && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: 2 }}
          className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded"
        >
          ← 편집 | 댓글 →
        </motion.div>
      )}
    </div>
  );
};

export default MobileGoalCard;