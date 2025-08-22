import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  Search, 
  Filter, 
  SortDesc,
  Plus,
  ArrowUp,
  Loader,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import MobileGoalCard, { MobileGoal } from './MobileGoalCard';
import QuickProgressUpdate from './QuickProgressUpdate';
import useMobileDetection from '../../hooks/useMobileDetection';
import HapticFeedback from '../../utils/hapticFeedback';

interface MobileGoalsViewProps {
  goals: MobileGoal[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onCreateGoal?: () => void;
  onUpdateGoal?: (goalId: string, updates: any) => void;
  onViewGoalDetails?: (goalId: string) => void;
  onEditGoal?: (goalId: string) => void;
  onCommentGoal?: (goalId: string) => void;
}

type SortOption = 'progress' | 'dueDate' | 'status' | 'title';
type FilterOption = 'all' | 'active' | 'at_risk' | 'completed' | 'paused';

const MobileGoalsView: React.FC<MobileGoalsViewProps> = ({
  goals = [],
  loading = false,
  error = null,
  onRefresh,
  onCreateGoal,
  onUpdateGoal,
  onViewGoalDetails,
  onEditGoal,
  onCommentGoal
}) => {
  const { isMobile, isOneHandedMode, hasTouch } = useMobileDetection();
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('progress');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showSwipeHints, setShowSwipeHints] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Quick update modal state
  const [quickUpdateGoal, setQuickUpdateGoal] = useState<MobileGoal | null>(null);

  // Check if user should see swipe hints
  useEffect(() => {
    const hasSeenHints = localStorage.getItem('hasSeenSwipeHints');
    if (!hasSeenHints && hasTouch) {
      setShowSwipeHints(true);
      setTimeout(() => {
        setShowSwipeHints(false);
        localStorage.setItem('hasSeenSwipeHints', 'true');
      }, 5000);
    }
  }, [hasTouch]);

  // Handle scroll for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter and sort goals
  const filteredAndSortedGoals = React.useMemo(() => {
    let filtered = goals;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(goal => 
        goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        goal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        goal.owner.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(goal => goal.status === filterBy);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'progress':
          return b.progress - a.progress;
        case 'dueDate':
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'status':
          const statusOrder = ['active', 'at_risk', 'paused', 'completed'];
          return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [goals, searchQuery, filterBy, sortBy]);

  // Statistics
  const stats = React.useMemo(() => {
    const total = goals.length;
    const active = goals.filter(g => g.status === 'active').length;
    const completed = goals.filter(g => g.status === 'completed').length;
    const atRisk = goals.filter(g => g.status === 'at_risk').length;
    const avgProgress = total > 0 ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / total) : 0;

    return { total, active, completed, atRisk, avgProgress };
  }, [goals]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    if (hasTouch && HapticFeedback.supported) {
      HapticFeedback.medium();
    }

    try {
      await onRefresh?.();
    } finally {
      setTimeout(() => setRefreshing(false), 1000);
    }
  }, [refreshing, onRefresh, hasTouch]);

  // Handle goal actions
  const handleQuickUpdate = useCallback((goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      setQuickUpdateGoal(goal);
    }
  }, [goals]);

  const handleSwipeAction = useCallback((goalId: string, action: 'edit' | 'complete' | 'comment') => {
    switch (action) {
      case 'edit':
        onEditGoal?.(goalId);
        break;
      case 'comment':
        onCommentGoal?.(goalId);
        break;
    }
  }, [onEditGoal, onCommentGoal]);

  const handleProgressUpdate = useCallback((goalId: string, updates: any) => {
    if (hasTouch && HapticFeedback.supported) {
      HapticFeedback.success();
    }
    onUpdateGoal?.(goalId, updates);
  }, [onUpdateGoal, hasTouch]);

  const scrollToTop = useCallback(() => {
    if (hasTouch && HapticFeedback.supported) {
      HapticFeedback.light();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [hasTouch]);

  const getSortLabel = (sort: SortOption) => {
    switch (sort) {
      case 'progress': return '진행률순';
      case 'dueDate': return '마감일순';
      case 'status': return '상태순';
      case 'title': return '제목순';
    }
  };

  const getFilterLabel = (filter: FilterOption) => {
    switch (filter) {
      case 'all': return '전체';
      case 'active': return '진행중';
      case 'at_risk': return '위험';
      case 'completed': return '완료';
      case 'paused': return '일시정지';
    }
  };

  if (loading && goals.length === 0) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">목표를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-900 font-medium mb-2">목표를 불러올 수 없습니다</p>
        <p className="text-gray-600 mb-4">{error}</p>
        {onRefresh && (
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            다시 시도
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Stats */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            목표 관리
          </h1>
          
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
            
            {onCreateGoal && (
              <button
                onClick={() => {
                  if (hasTouch && HapticFeedback.supported) {
                    HapticFeedback.medium();
                  }
                  onCreateGoal();
                }}
                className="p-2 bg-blue-600 text-white rounded-lg"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-lg font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-600">전체</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-2">
            <div className="text-lg font-bold text-blue-700">{stats.active}</div>
            <div className="text-xs text-blue-600">진행중</div>
          </div>
          <div className="bg-green-50 rounded-lg p-2">
            <div className="text-lg font-bold text-green-700">{stats.completed}</div>
            <div className="text-xs text-green-600">완료</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-2">
            <div className="text-lg font-bold text-purple-700">{stats.avgProgress}%</div>
            <div className="text-xs text-purple-600">평균</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="목표 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm font-medium flex-shrink-0 ${
              showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            필터
          </button>

          <button
            onClick={() => {
              const sorts: SortOption[] = ['progress', 'dueDate', 'status', 'title'];
              const currentIndex = sorts.indexOf(sortBy);
              const nextSort = sorts[(currentIndex + 1) % sorts.length];
              setSortBy(nextSort);
              if (hasTouch && HapticFeedback.supported) {
                HapticFeedback.light();
              }
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm font-medium text-gray-700 flex-shrink-0"
          >
            <SortDesc className="w-4 h-4" />
            {getSortLabel(sortBy)}
          </button>

          {/* Status Filter Pills */}
          {(['all', 'active', 'at_risk', 'completed'] as FilterOption[]).map(filter => (
            <button
              key={filter}
              onClick={() => {
                setFilterBy(filter);
                if (hasTouch && HapticFeedback.supported) {
                  HapticFeedback.light();
                }
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium flex-shrink-0 ${
                filterBy === filter
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {getFilterLabel(filter)}
            </button>
          ))}
        </div>
      </div>

      {/* Goals List */}
      <div className="p-4">
        {filteredAndSortedGoals.length === 0 ? (
          <div className="text-center py-20">
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || filterBy !== 'all' ? '검색 결과가 없습니다' : '목표가 없습니다'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || filterBy !== 'all' 
                ? '다른 검색어나 필터를 시도해보세요'
                : '새로운 목표를 추가하여 시작하세요'
              }
            </p>
            {onCreateGoal && !searchQuery && filterBy === 'all' && (
              <button
                onClick={onCreateGoal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
              >
                첫 목표 추가
              </button>
            )}
          </div>
        ) : (
          <motion.div layout className="space-y-4">
            <AnimatePresence>
              {filteredAndSortedGoals.map((goal, index) => (
                <motion.div
                  key={goal.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ 
                    duration: 0.3,
                    delay: index * 0.05,
                    layout: { duration: 0.3 }
                  }}
                >
                  <MobileGoalCard
                    goal={goal}
                    onQuickUpdate={handleQuickUpdate}
                    onViewDetails={(id) => onViewGoalDetails?.(id)}
                    onSwipeAction={handleSwipeAction}
                    isSelected={selectedGoalId === goal.id}
                    showSwipeHint={showSwipeHints && index === 0}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 p-3 bg-blue-600 text-white rounded-full shadow-lg z-40"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Quick Progress Update Modal */}
      {quickUpdateGoal && (
        <QuickProgressUpdate
          goal={quickUpdateGoal}
          isOpen={!!quickUpdateGoal}
          onClose={() => setQuickUpdateGoal(null)}
          onUpdate={handleProgressUpdate}
        />
      )}

      {/* Bottom Padding for Safe Area */}
      <div className="h-16" />
    </div>
  );
};

export default MobileGoalsView;