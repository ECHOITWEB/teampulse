import React, { useState, useEffect } from 'react';
import { 
  Target, TrendingUp, Users, User, Brain, MessageSquare, 
  Sparkles, ChevronRight, Plus, Calendar, BarChart3,
  Award, CheckCircle, Clock, Filter, Search,
  ArrowUp, ArrowDown, Activity, Send, MoreVertical,
  Eye, ThumbsUp, Rocket, Flag, Trophy, Flame,
  AlertCircle, Info, X, ChevronDown, Layers, Share2,
  Edit2, Trash2, Check, PlusCircle, RefreshCw
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import okrServiceV2 from '../services/okrServiceV2';
import { Objective, KeyResult, AIInsight } from '../types/okr';
import CreateObjectiveModalV2 from '../components/modals/CreateObjectiveModalV2';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import OKRCardV2 from '../components/OKR/OKRCardV2';

// Quarter selector component with modern design
const QuarterSelector: React.FC<{
  selectedQuarter: string;
  selectedYear: string;
  onQuarterChange: (quarter: string) => void;
  onYearChange: (year: string) => void;
}> = ({ selectedQuarter, selectedYear, onQuarterChange, onYearChange }) => {
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const years = ['2024', '2025', '2026'];
  
  return (
    <div className="flex items-center space-x-2">
      <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1">
        {quarters.map((q) => (
          <button
            key={q}
            onClick={() => onQuarterChange(q)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedQuarter === q
                ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {q}
          </button>
        ))}
      </div>
      
      <select
        value={selectedYear}
        onChange={(e) => onYearChange(e.target.value)}
        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {years.map((year) => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>
    </div>
  );
};

// Progress Ring Component
const ProgressRing: React.FC<{ progress: number; size?: number }> = ({ progress, size = 120 }) => {
  const strokeWidth = size / 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  // Dynamic gradient based on progress
  const getGradientColors = () => {
    if (progress >= 70) return { start: '#10b981', end: '#059669' }; // green
    if (progress >= 40) return { start: '#f59e0b', end: '#d97706' }; // yellow
    return { start: '#ef4444', end: '#dc2626' }; // red
  };
  
  const colors = getGradientColors();
  const gradientId = `gradient-${size}-${Math.round(progress)}`;
  
  return (
    <div className="relative">
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.start} />
            <stop offset="100%" stopColor={colors.end} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      {size > 100 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{Math.round(progress)}%</span>
          <span className="text-xs text-gray-500">Complete</span>
        </div>
      )}
    </div>
  );
};


// Key Result Card with modern design
const KeyResultCard: React.FC<{
  keyResult: KeyResult;
  onUpdate: (krId: string, value: number) => void;
}> = ({ keyResult, onUpdate }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [newValue, setNewValue] = useState(keyResult.currentValue.toString());
  
  const getTrendIcon = () => {
    if (keyResult.trending === 'up') return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (keyResult.trending === 'down') return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <Activity className="w-4 h-4 text-gray-400" />;
  };
  
  const getStatusBadge = () => {
    const statusConfig = {
      on_track: { color: 'bg-green-100 text-green-700', label: 'On Track' },
      at_risk: { color: 'bg-yellow-100 text-yellow-700', label: 'At Risk' },
      behind: { color: 'bg-red-100 text-red-700', label: 'Behind' },
      completed: { color: 'bg-blue-100 text-blue-700', label: 'Completed' },
      not_started: { color: 'bg-gray-100 text-gray-700', label: 'Not Started' }
    };
    
    const config = statusConfig[keyResult.status] || statusConfig.not_started;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-1">{keyResult.title}</h4>
          <div className="flex items-center space-x-2">
            {getStatusBadge()}
            {getTrendIcon()}
            <span className="text-xs text-gray-500">{keyResult.owner}</span>
          </div>
        </div>
        <button
          onClick={() => setIsUpdating(!isUpdating)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded-lg"
        >
          <MoreVertical className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Progress</span>
          <span className="font-semibold text-gray-900">
            {keyResult.currentValue} / {keyResult.targetValue} {keyResult.unit}
          </span>
        </div>
        
        <div className="relative">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${keyResult.progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`h-full ${
                keyResult.progress >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                keyResult.progress >= 60 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                keyResult.progress >= 40 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
                'bg-gradient-to-r from-red-500 to-pink-500'
              }`}
            />
          </div>
        </div>
        
        <AnimatePresence>
          {isUpdating && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex items-center space-x-2 pt-2 border-t"
            >
              <input
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="flex-1 px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="New value"
              />
              <button
                onClick={() => {
                  onUpdate(keyResult.id!, parseFloat(newValue));
                  setIsUpdating(false);
                }}
                className="px-3 py-1 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark"
              >
                Update
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};


// Main OKR Dashboard Component
const OKRDashboard: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedView, setSelectedView] = useState<'grid' | 'list' | 'timeline'>('grid');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'company' | 'team' | 'individual'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedObjectiveForShare, setSelectedObjectiveForShare] = useState<Objective | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isAddingKR, setIsAddingKR] = useState(false);
  const [newKR, setNewKR] = useState({ title: '', targetValue: 0, currentValue: 0, unit: '' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Real-time OKR updates (including company-wide objectives)
  useEffect(() => {
    if (!workspaceId || !user) return;

    setLoading(true);
    
    // Fetch objectives including company-wide ones
    const fetchObjectives = async () => {
      try {
        // Get objectives for the selected period
        const filters: any = {
          quarter: selectedQuarter,
          year: selectedYear,
          workspaceId: workspaceId // Add workspace filter
        };
        
        // If current workspace has a company ID, add it to filters
        if (currentWorkspace?.companyId) {
          filters.companyId = currentWorkspace.companyId;
        }
        
        const objectivesData = await okrServiceV2.getObjectives(filters);
        
        // Filter out any objectives that might have invalid data
        const validObjectives = objectivesData.filter(obj => {
          if (!obj.id) {
            console.warn('Objective without ID found, filtering out');
            return false;
          }
          return true;
        });
        
        setObjectives(validObjectives);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching objectives:', error);
        setObjectives([]); // Clear objectives on error
        setLoading(false);
      }
    };
    
    fetchObjectives();
    
    // Also subscribe to real-time updates
    const filters: any = {
      quarter: selectedQuarter,
      year: selectedYear,
      workspaceId: workspaceId
    };
    
    if (currentWorkspace?.companyId) {
      filters.companyId = currentWorkspace.companyId;
    }
    
    const unsubscribe = okrServiceV2.subscribeToObjectives(
      filters,
      (objectivesData) => {
        setObjectives(objectivesData);
      }
    );

    return () => unsubscribe();
  }, [workspaceId, selectedQuarter, selectedYear, user, currentWorkspace, refreshTrigger]);

  // Sample OKR creation removed - using new service
  
  // Filter objectives
  const filteredObjectives = objectives.filter(obj => {
    if (selectedFilter !== 'all' && obj.type !== selectedFilter) return false;
    if (searchQuery && !obj.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  
  // Calculate statistics
  const stats = {
    total: objectives.length,
    avgProgress: objectives.reduce((sum, obj) => sum + obj.progress, 0) / (objectives.length || 1),
    onTrack: objectives.filter(obj => obj.progressStatus === 'on_track').length,
    atRisk: objectives.filter(obj => obj.progressStatus === 'at_risk').length,
    completed: objectives.filter(obj => obj.progressStatus === 'completed').length
  };
  
  const handleShareToChannel = (objective: Objective) => {
    // Team chat removed - share functionality disabled
    console.log('Share functionality has been removed', objective);
  };
  
  const handleAskAI = (objective: Objective) => {
    // Team chat removed - AI ask functionality disabled
    console.log('AI ask functionality has been removed', objective);
  };
  
  
  const handleKRUpdate = async (objectiveId: string, krId: string, newValue: number) => {
    try {
      await okrServiceV2.updateKeyResult(krId, { currentValue: newValue });
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Failed to update KR:', error);
    }
  };
  
  const handleObjectiveUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  return (
    <div className="flex-1 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-gradient-to-r from-primary to-primary-dark rounded-xl text-white">
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">OKR Dashboard</h1>
                    <p className="text-sm text-gray-500">Track and achieve your objectives</p>
                  </div>
                </div>
                
                <QuarterSelector
                  selectedQuarter={selectedQuarter}
                  selectedYear={selectedYear}
                  onQuarterChange={setSelectedQuarter}
                  onYearChange={setSelectedYear}
                />
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search objectives..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                
                
                <button
                  onClick={async () => {
                    if (!user) return;
                    setIsRefreshing(true);
                    try {
                      const objs = await okrServiceV2.getObjectives({
                        quarter: selectedQuarter,
                        year: selectedYear
                      });
                      const validObjectives = objs.filter(obj => obj.id);
                      setObjectives(validObjectives);
                    } catch (error) {
                      console.error('Error refreshing objectives:', error);
                    } finally {
                      setIsRefreshing(false);
                    }
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    isRefreshing ? 'bg-gray-200 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  disabled={isRefreshing}
                >
                  <svg
                    className={`w-5 h-5 text-gray-600 ${
                      isRefreshing ? 'animate-spin' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
                
                <button
                  onClick={() => setShowAIPanel(!showAIPanel)}
                  className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                >
                  <Brain className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg hover:shadow-lg transition-all"
                >
                  <Plus className="w-5 h-5" />
                  <span>New Objective</span>
                </button>
              </div>
            </div>
            
            {/* Filters and View Toggles */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedFilter === 'all'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  All ({stats.total})
                </button>
                <button
                  onClick={() => setSelectedFilter('company')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-1 ${
                    selectedFilter === 'company'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                  <span>Company</span>
                </button>
                <button
                  onClick={() => setSelectedFilter('team')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-1 ${
                    selectedFilter === 'team'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Team</span>
                </button>
                <button
                  onClick={() => setSelectedFilter('individual')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-1 ${
                    selectedFilter === 'individual'
                      ? 'bg-green-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Individual</span>
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedView('grid')}
                  className={`p-2 rounded-lg ${
                    selectedView === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedView('list')}
                  className={`p-2 rounded-lg ${
                    selectedView === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedView('timeline')}
                  className={`p-2 rounded-lg ${
                    selectedView === 'timeline' ? 'bg-gray-200' : 'hover:bg-gray-100'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Statistics Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-xl p-6 border border-blue-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">전체 평균 달성률</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {Math.round(stats.avgProgress)}%
                    </p>
                    {stats.avgProgress > 0 && (
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        stats.avgProgress >= 70 ? 'bg-green-100 text-green-700' :
                        stats.avgProgress >= 40 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {stats.avgProgress >= 70 ? '순조로움' :
                         stats.avgProgress >= 40 ? '주의 필요' : '집중 필요'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <ProgressRing progress={stats.avgProgress} size={80} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-700">
                      {stats.avgProgress >= 70 ? '😊' :
                       stats.avgProgress >= 40 ? '🤔' : '😰'}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="relative">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>0%</span>
                  <span>목표: 100%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${
                      stats.avgProgress >= 70 ? 'from-green-400 to-green-600' :
                      stats.avgProgress >= 40 ? 'from-yellow-400 to-yellow-600' :
                      'from-red-400 to-red-600'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.avgProgress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                {/* Milestone markers */}
                <div className="absolute top-6 left-0 right-0 flex justify-between px-1">
                  <div className="w-0.5 h-2 bg-gray-300" style={{ marginLeft: '25%' }} />
                  <div className="w-0.5 h-2 bg-gray-300" style={{ marginLeft: '25%' }} />
                  <div className="w-0.5 h-2 bg-gray-300" style={{ marginLeft: '25%' }} />
                </div>
              </div>
              
              {/* Insight */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-600">
                  {stats.avgProgress >= 70 ? 
                    `🎯 목표 달성까지 ${100 - Math.round(stats.avgProgress)}% 남았습니다` :
                   stats.avgProgress >= 40 ?
                    `⚡ 평균 이상의 노력이 필요합니다` :
                    `🔥 집중적인 실행이 필요한 시점입니다`}
                </p>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">On Track</p>
                <p className="text-2xl font-bold text-green-900">{stats.onTrack}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-6 border border-yellow-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">At Risk</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.atRisk}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-xl">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Completed</p>
                <p className="text-2xl font-bold text-blue-900">{stats.completed}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Main Content */}
        <div className="flex gap-6">
          <div className={`flex-1 ${showAIPanel ? 'lg:pr-80' : ''}`}>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : filteredObjectives.length > 0 ? (
              <div className={`grid gap-6 ${
                selectedView === 'grid' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
              }`}>
                {filteredObjectives.map((objective) => (
                  <OKRCardV2
                    key={objective.id}
                    objective={objective}
                    onUpdate={handleObjectiveUpdate}
                    onSelect={() => setSelectedObjective(objective)}
                  />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border-2 border-dashed border-gray-300"
              >
                <Target className="w-12 h-12 text-gray-400 mb-3" />
                <p className="text-gray-500 mb-4">No objectives found for {selectedQuarter} {selectedYear}</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Create First Objective
                </button>
              </motion.div>
            )}
          </div>
          
          {/* AI Insights Panel */}
          <AnimatePresence>
            {showAIPanel && (
              <motion.div
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl border-l border-gray-200 overflow-y-auto z-20"
              >
                <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Brain className="w-5 h-5 text-purple-600" />
                      <h3 className="font-semibold text-gray-900">AI Insights</h3>
                    </div>
                    <button
                      onClick={() => setShowAIPanel(false)}
                      className="p-1 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
                
                <div className="p-4 space-y-4">
                  {aiInsights.length > 0 ? (
                    aiInsights.map((insight) => (
                      <motion.div
                        key={insight.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-lg border ${
                          insight.priority === 'critical' ? 'border-red-200 bg-red-50' :
                          insight.priority === 'high' ? 'border-yellow-200 bg-yellow-50' :
                          'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-600" />
                          <div className="flex-1">
                            <h4 className="font-medium text-sm text-gray-900 mb-1">{insight.title}</h4>
                            <p className="text-xs text-gray-600">{insight.description}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                insight.type === 'risk' ? 'bg-red-100 text-red-700' :
                                insight.type === 'recommendation' ? 'bg-blue-100 text-blue-700' :
                                insight.type === 'trend' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {insight.type}
                              </span>
                              <span className="text-xs text-gray-500">
                                {insight.confidence}% confidence
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Brain className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">
                        Select an objective and click the AI button to get insights
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Objective Detail Modal */}
      <AnimatePresence>
        {selectedObjective && !showAIPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedObjective(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {isEditingTitle ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          className="text-2xl font-bold bg-white/20 rounded px-2 py-1 text-white placeholder-white/70 flex-1"
                          autoFocus
                        />
                        <button
                          onClick={async () => {
                            if (selectedObjective.id && editedTitle.trim()) {
                              await okrServiceV2.updateObjective(selectedObjective.id, { title: editedTitle });
                              setSelectedObjective({ ...selectedObjective, title: editedTitle });
                              setIsEditingTitle(false);
                              setRefreshTrigger(prev => prev + 1);
                            }
                          }}
                          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingTitle(false);
                            setEditedTitle(selectedObjective.title);
                          }}
                          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold">{selectedObjective.title}</h2>
                        <button
                          onClick={() => {
                            setEditedTitle(selectedObjective.title);
                            setIsEditingTitle(true);
                          }}
                          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <p className="text-blue-100 mt-2">{selectedObjective.description}</p>
                  </div>
                  <button
                    onClick={() => setSelectedObjective(null)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors ml-4"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="flex items-center justify-center mb-6">
                  <ProgressRing progress={selectedObjective.progress} />
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Key Results</h3>
                  <button
                    onClick={() => setIsAddingKR(true)}
                    className="flex items-center gap-1 px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Add KR
                  </button>
                </div>
                
                <div className="grid gap-4">
                  {isAddingKR && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="grid gap-3">
                        <input
                          type="text"
                          placeholder="Key Result Title"
                          value={newKR.title}
                          onChange={(e) => setNewKR({ ...newKR, title: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="number"
                            placeholder="Target"
                            value={newKR.targetValue || ''}
                            onChange={(e) => setNewKR({ ...newKR, targetValue: Number(e.target.value) })}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <input
                            type="number"
                            placeholder="Current"
                            value={newKR.currentValue || ''}
                            onChange={(e) => setNewKR({ ...newKR, currentValue: Number(e.target.value) })}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <input
                            type="text"
                            placeholder="Unit (e.g., %, users)"
                            value={newKR.unit}
                            onChange={(e) => setNewKR({ ...newKR, unit: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              if (selectedObjective.id && newKR.title) {
                                await okrServiceV2.createKeyResult(selectedObjective.id, {
                                  title: newKR.title,
                                  targetValue: newKR.targetValue,
                                  currentValue: newKR.currentValue,
                                  startValue: 0,
                                  unit: newKR.unit,
                                  progress: 0,
                                  status: 'not_started',
                                  owner: user?.name || user?.email || 'User'
                                });
                                setNewKR({ title: '', targetValue: 0, currentValue: 0, unit: '' });
                                setIsAddingKR(false);
                                setRefreshTrigger(prev => prev + 1);
                                // Reload the selected objective
                                const objectives = await okrServiceV2.getObjectives({
                                  quarter: selectedQuarter,
                                  year: selectedYear
                                });
                                const updated = objectives.find(o => o.id === selectedObjective.id);
                                if (updated) setSelectedObjective(updated);
                              }
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setIsAddingKR(false);
                              setNewKR({ title: '', targetValue: 0, currentValue: 0, unit: '' });
                            }}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {selectedObjective.keyResults?.map((kr) => (
                    <KeyResultCard
                      key={kr.id}
                      keyResult={kr}
                      onUpdate={(krId, value) => handleKRUpdate(selectedObjective.id!, krId, value)}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Create Objective Modal */}
      <CreateObjectiveModalV2
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={async (data) => {
          await okrServiceV2.createObjective(data);
          setShowCreateModal(false);
          setRefreshTrigger(prev => prev + 1);
        }}
        currentQuarter={selectedQuarter}
        currentYear={selectedYear}
      />
    </div>
  );
};

export default OKRDashboard;