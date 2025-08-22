import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  X, 
  TrendingUp, 
  MessageCircle, 
  CheckCircle, 
  Plus,
  Minus,
  Target,
  Save
} from 'lucide-react';
import useMobileDetection from '../../hooks/useMobileDetection';
import HapticFeedback from '../../utils/hapticFeedback';
import { MobileGoal, KeyResult } from './MobileGoalCard';

interface QuickProgressUpdateProps {
  goal: MobileGoal;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (goalId: string, updates: ProgressUpdate) => void;
}

interface ProgressUpdate {
  progress?: number;
  keyResultUpdates?: {
    id: string;
    currentValue: number;
    progress: number;
  }[];
  comment?: string;
  markComplete?: boolean;
}

interface SliderProps {
  value: number;
  max: number;
  min?: number;
  step?: number;
  label: string;
  unit?: string;
  onChange: (value: number) => void;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
}

const TouchSlider: React.FC<SliderProps> = ({
  value,
  max,
  min = 0,
  step = 1,
  label,
  unit = '',
  onChange,
  onTouchStart,
  onTouchEnd
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(value);
  const sliderRef = useRef<HTMLDivElement>(null);
  const { hasTouch } = useMobileDetection();

  const updateValue = useCallback((clientX: number) => {
    if (!sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newValue = Math.round((min + percentage * (max - min)) / step) * step;
    
    if (newValue !== dragValue) {
      setDragValue(newValue);
      if (hasTouch && HapticFeedback.supported) {
        HapticFeedback.selection();
      }
    }
  }, [min, max, step, dragValue, hasTouch]);

  const handlePanStart = useCallback(() => {
    setIsDragging(true);
    onTouchStart?.();
    if (hasTouch && HapticFeedback.supported) {
      HapticFeedback.light();
    }
  }, [onTouchStart, hasTouch]);

  const handlePan = useCallback((_event: any, info: PanInfo) => {
    if (!sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const clientX = rect.left + info.point.x - rect.left;
    updateValue(clientX);
  }, [updateValue]);

  const handlePanEnd = useCallback(() => {
    setIsDragging(false);
    onChange(dragValue);
    onTouchEnd?.();
    if (hasTouch && HapticFeedback.supported) {
      HapticFeedback.medium();
    }
  }, [dragValue, onChange, onTouchEnd, hasTouch]);

  useEffect(() => {
    if (!isDragging) {
      setDragValue(value);
    }
  }, [value, isDragging]);

  const percentage = ((dragValue - min) / (max - min)) * 100;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm font-bold text-gray-900">
          {dragValue}{unit}
          {max && ` / ${max}${unit}`}
        </span>
      </div>
      
      <div 
        ref={sliderRef}
        className="relative h-12 bg-gray-200 rounded-full cursor-pointer select-none"
        style={{ touchAction: 'none' }}
      >
        {/* Progress track */}
        <div 
          className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-200 ease-out"
          style={{ width: `${percentage}%` }}
        />
        
        {/* Drag handle */}
        <motion.div
          drag="x"
          dragConstraints={sliderRef}
          dragElastic={0}
          onPanStart={handlePanStart}
          onPan={handlePan}
          onPanEnd={handlePanEnd}
          animate={{ 
            x: percentage * (sliderRef.current?.clientWidth || 0) / 100 - 16 
          }}
          whileDrag={{ scale: 1.2 }}
          className={`
            absolute top-1/2 transform -translate-y-1/2 w-8 h-8 bg-white border-2 
            border-blue-500 rounded-full shadow-lg cursor-grab active:cursor-grabbing
            flex items-center justify-center
            ${isDragging ? 'shadow-xl' : ''}
          `}
        >
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
        </motion.div>
        
        {/* Value indicators */}
        <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
          <span className="text-xs font-medium text-gray-600">{min}{unit}</span>
          <span className="text-xs font-medium text-gray-600">{max}{unit}</span>
        </div>
      </div>
      
      {/* Quick increment/decrement buttons */}
      <div className="flex justify-center gap-4 mt-2">
        <button
          onClick={() => onChange(Math.max(min, dragValue - step * 5))}
          onTouchStart={() => hasTouch && HapticFeedback.light()}
          className="p-2 bg-gray-100 rounded-full"
          disabled={dragValue <= min}
        >
          <Minus className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={() => onChange(Math.min(max, dragValue + step * 5))}
          onTouchStart={() => hasTouch && HapticFeedback.light()}
          className="p-2 bg-gray-100 rounded-full"
          disabled={dragValue >= max}
        >
          <Plus className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
};

const QuickProgressUpdate: React.FC<QuickProgressUpdateProps> = ({
  goal,
  isOpen,
  onClose,
  onUpdate
}) => {
  const { isMobile, hasTouch, isOneHandedMode } = useMobileDetection();
  const [updates, setUpdates] = useState<ProgressUpdate>({});
  const [comment, setComment] = useState('');
  const [selectedKeyResults, setSelectedKeyResults] = useState<string[]>([]);
  const [keyResultUpdates, setKeyResultUpdates] = useState<{ [key: string]: { currentValue: number; progress: number } }>({});

  // Initialize key result updates when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialUpdates: { [key: string]: { currentValue: number; progress: number } } = {};
      goal.keyResults.forEach(kr => {
        initialUpdates[kr.id] = {
          currentValue: kr.currentValue,
          progress: kr.progress
        };
      });
      setKeyResultUpdates(initialUpdates);
      setComment('');
      setUpdates({});
    }
  }, [isOpen, goal.keyResults]);

  const handleClose = useCallback(() => {
    if (hasTouch && HapticFeedback.supported) {
      HapticFeedback.light();
    }
    onClose();
  }, [onClose, hasTouch]);

  const handleKeyResultUpdate = useCallback((krId: string, field: 'currentValue' | 'progress', value: number) => {
    setKeyResultUpdates(prev => ({
      ...prev,
      [krId]: {
        ...prev[krId],
        [field]: value
      }
    }));
  }, []);

  const toggleKeyResultSelection = useCallback((krId: string) => {
    if (hasTouch && HapticFeedback.supported) {
      HapticFeedback.light();
    }
    
    setSelectedKeyResults(prev => 
      prev.includes(krId) 
        ? prev.filter(id => id !== krId)
        : [...prev, krId]
    );
  }, [hasTouch]);

  const handleSubmit = useCallback(() => {
    const updateData: ProgressUpdate = {
      comment: comment.trim() || undefined,
      keyResultUpdates: selectedKeyResults.map(krId => ({
        id: krId,
        currentValue: keyResultUpdates[krId].currentValue,
        progress: keyResultUpdates[krId].progress
      })).filter(update => {
        const original = goal.keyResults.find(kr => kr.id === update.id);
        return original && (
          original.currentValue !== update.currentValue || 
          original.progress !== update.progress
        );
      })
    };

    // Calculate overall progress if any key results were updated
    if (updateData.keyResultUpdates && updateData.keyResultUpdates.length > 0) {
      const totalProgress = goal.keyResults.reduce((sum, kr) => {
        const update = updateData.keyResultUpdates?.find(u => u.id === kr.id);
        return sum + (update?.progress ?? kr.progress);
      }, 0);
      updateData.progress = Math.round(totalProgress / goal.keyResults.length);
    }

    if (hasTouch && HapticFeedback.supported) {
      HapticFeedback.success();
    }

    onUpdate(goal.id, updateData);
    onClose();
  }, [goal, selectedKeyResults, keyResultUpdates, comment, onUpdate, onClose, hasTouch]);

  const handleMarkComplete = useCallback(() => {
    if (hasTouch && HapticFeedback.supported) {
      HapticFeedback.success();
    }
    
    onUpdate(goal.id, { 
      progress: 100, 
      markComplete: true,
      comment: comment.trim() || '목표가 완료되었습니다!'
    });
    onClose();
  }, [goal.id, comment, onUpdate, onClose, hasTouch]);

  const hasChanges = selectedKeyResults.length > 0 || comment.trim().length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={`
              w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl
              max-h-[90vh] overflow-hidden flex flex-col
              ${isOneHandedMode ? 'max-h-[80vh]' : ''}
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">진행 상황 업데이트</h3>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Goal Title */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="font-medium text-gray-900 mb-1">{goal.title}</h4>
                <p className="text-sm text-gray-600">현재 진행률: {goal.progress}%</p>
              </div>

              {/* Key Results */}
              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-3">
                  주요 결과 업데이트 ({goal.keyResults.length})
                </h5>
                
                <div className="space-y-3">
                  {goal.keyResults.map((kr) => {
                    const isSelected = selectedKeyResults.includes(kr.id);
                    const currentUpdate = keyResultUpdates[kr.id];
                    
                    return (
                      <div
                        key={kr.id}
                        className={`
                          border rounded-lg p-3 transition-all duration-200
                          ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                        `}
                      >
                        <div 
                          className="flex items-start justify-between mb-2 cursor-pointer"
                          onClick={() => toggleKeyResultSelection(kr.id)}
                        >
                          <div className="flex items-start gap-2 flex-1">
                            <div className={`
                              w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5
                              ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}
                            `}>
                              {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h6 className="text-sm font-medium text-gray-900 line-clamp-2">
                                {kr.title}
                              </h6>
                              <p className="text-xs text-gray-600 mt-1">{kr.owner}</p>
                            </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="mt-3 space-y-3"
                            >
                              {/* Current Value Slider */}
                              <TouchSlider
                                value={currentUpdate?.currentValue ?? kr.currentValue}
                                max={kr.targetValue}
                                min={0}
                                step={kr.targetValue > 100 ? 5 : 1}
                                label="현재 값"
                                unit={kr.unit}
                                onChange={(value) => {
                                  const progress = Math.round((value / kr.targetValue) * 100);
                                  handleKeyResultUpdate(kr.id, 'currentValue', value);
                                  handleKeyResultUpdate(kr.id, 'progress', progress);
                                }}
                                onTouchStart={() => hasTouch && HapticFeedback.light()}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Comment Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  업데이트 코멘트 (선택사항)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="진행 상황이나 특이사항을 입력하세요..."
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  maxLength={500}
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {comment.length}/500
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4 space-y-2">
              {/* Primary Actions */}
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmit}
                  disabled={!hasChanges}
                  className={`
                    flex-1 py-3 px-4 rounded-lg font-medium text-sm min-h-[48px] flex items-center justify-center gap-2
                    ${hasChanges 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  <Save className="w-4 h-4" />
                  업데이트 저장
                </motion.button>
                
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleClose}
                  className="py-3 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm min-h-[48px]"
                >
                  취소
                </motion.button>
              </div>

              {/* Complete Goal Action */}
              {goal.status !== 'completed' && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleMarkComplete}
                  className="w-full py-3 px-4 bg-green-600 text-white rounded-lg font-medium text-sm min-h-[48px] flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  목표 완료로 표시
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QuickProgressUpdate;