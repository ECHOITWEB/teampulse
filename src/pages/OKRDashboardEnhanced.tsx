import React, { useState, useEffect } from 'react';
import { 
  Target, TrendingUp, Users, Calendar, BarChart3,
  Plus, Filter, Search, ChevronDown, Layers,
  Trophy, Flag, User, Clock, RefreshCw, BarChart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import okrService, { Objective } from '../services/okrService';
import okrServiceExtended from '../services/okrServiceExtended';
import CreateObjectiveModal from '../components/modals/CreateObjectiveModal';
import OKRCard from '../components/OKR/OKRCard';
import ShareOKRModal from '../components/OKR/ShareOKRModal';
// import { cleanupOrphanedOKRs } from '../scripts/cleanupOKRs';
import GanttChart from '../components/OKR/GanttChart';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

// Enhanced Period Selector
const PeriodSelector: React.FC<{
  periodType: 'quarter' | 'year' | 'all';
  selectedQuarter: string;
  selectedYear: string;
  onPeriodTypeChange: (type: 'quarter' | 'year' | 'all') => void;
  onQuarterChange: (quarter: string) => void;
  onYearChange: (year: string) => void;
}> = ({ 
  periodType, 
  selectedQuarter, 
  selectedYear, 
  onPeriodTypeChange,
  onQuarterChange, 
  onYearChange 
}) => {
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const years = ['2024', '2025', '2026'];
  
  return (
    <div className="flex items-center space-x-4">
      {/* Period Type Selector */}
      <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1">
        <button
          onClick={() => onPeriodTypeChange('quarter')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            periodType === 'quarter'
              ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          분기별
        </button>
        <button
          onClick={() => onPeriodTypeChange('year')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            periodType === 'year'
              ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          연도별
        </button>
        <button
          onClick={() => onPeriodTypeChange('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            periodType === 'all'
              ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          전체
        </button>
      </div>
      
      {/* Quarter Selector (only show for quarter view) */}
      {periodType === 'quarter' && (
        <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1">
          {quarters.map((q) => (
            <button
              key={q}
              onClick={() => onQuarterChange(q)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedQuarter === q
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      )}
      
      {/* Year Selector (show for quarter and year views) */}
      {periodType !== 'all' && (
        <select
          value={selectedYear}
          onChange={(e) => onYearChange(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {years.map((year) => (
            <option key={year} value={year}>{year}년</option>
          ))}
        </select>
      )}
    </div>
  );
};

const OKRDashboardEnhanced: React.FC = () => {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  
  // State
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [filteredObjectives, setFilteredObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'all' | 'company' | 'team' | 'individual'>('all');
  const [periodType, setPeriodType] = useState<'quarter' | 'year' | 'all'>('all');
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set());
  const [viewType, setViewType] = useState<'card' | 'gantt'>('card');
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedObjectiveForShare, setSelectedObjectiveForShare] = useState<Objective | null>(null);
  
  // Load objectives
  const loadObjectives = async () => {
    if (!currentWorkspace) return;
    
    setLoading(true);
    try {
      const objs = await okrServiceExtended.getObjectivesByPeriod(
        currentWorkspace.id,
        periodType,
        selectedQuarter,
        selectedYear,
        selectedView,
        user?.firebase_uid
      );
      
      // Filter out any objectives without valid IDs
      const validObjs = objs.filter(obj => {
        if (!obj.id) {
          console.warn('Objective without ID found, filtering out:', obj);
          return false;
        }
        return true;
      });
      
      setObjectives(validObjs);
      setFilteredObjectives(validObjs);
    } catch (error) {
      console.error('Error loading objectives:', error);
      // Clear objectives on error to prevent showing invalid data
      setObjectives([]);
      setFilteredObjectives([]);
    } finally {
      setLoading(false);
    }
  };
  
  
  useEffect(() => {
    loadObjectives();
  }, [currentWorkspace, periodType, selectedQuarter, selectedYear, selectedView]);
  
  // Filter objectives by search
  useEffect(() => {
    if (searchQuery) {
      const filtered = objectives.filter(obj => 
        obj.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        obj.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        false
      );
      setFilteredObjectives(filtered);
    } else {
      setFilteredObjectives(objectives);
    }
  }, [searchQuery, objectives]);
  
  const handleShareObjective = (objective: Objective) => {
    setSelectedObjectiveForShare(objective);
    setShowShareModal(true);
  };
  
  const toggleExpanded = (objectiveId: string) => {
    const newExpanded = new Set(expandedObjectives);
    if (newExpanded.has(objectiveId)) {
      newExpanded.delete(objectiveId);
    } else {
      newExpanded.add(objectiveId);
    }
    setExpandedObjectives(newExpanded);
  };
  
  const stats = {
    total: filteredObjectives.length,
    completed: filteredObjectives.filter(o => o.status === 'completed').length,
    onTrack: filteredObjectives.filter(o => o.status === 'active' && o.progress >= 70).length,
    atRisk: filteredObjectives.filter(o => o.status === 'active' && o.progress < 70 && o.progress >= 40).length,
    avgProgress: filteredObjectives.length > 0
      ? Math.round(filteredObjectives.reduce((sum, o) => sum + o.progress, 0) / filteredObjectives.length)
      : 0
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Target className="w-8 h-8 text-primary" />
                OKR 목표 관리
              </h1>
              <p className="text-gray-600 mt-2">
                {periodType === 'all' ? '전체 기간' : 
                 periodType === 'year' ? `${selectedYear}년` :
                 `${selectedYear}년 ${selectedQuarter}`} 목표 현황
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  try {
                    // await cleanupOrphanedOKRs();
                    await loadObjectives();
                    alert('데이터베이스 정리가 완료되었습니다.');
                  } catch (error) {
                    console.error('Error cleaning up OKRs:', error);
                    alert('데이터베이스 정리 중 오류가 발생했습니다.');
                  }
                }}
                className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                title="데이터베이스 정리"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg hover:shadow-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                새 목표 만들기
              </button>
            </div>
          </div>
          
          {/* Period Selector */}
          <PeriodSelector
            periodType={periodType}
            selectedQuarter={selectedQuarter}
            selectedYear={selectedYear}
            onPeriodTypeChange={setPeriodType}
            onQuarterChange={setSelectedQuarter}
            onYearChange={setSelectedYear}
          />
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체 목표</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">평균 진행률</p>
                <p className="text-2xl font-bold text-gray-900">{stats.avgProgress}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">순조롭게 진행</p>
                <p className="text-2xl font-bold text-green-600">{stats.onTrack}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">위험</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.atRisk}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">완료</p>
                <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
              </div>
              <Trophy className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="목표 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            {/* View Type Selector */}
            <div className="flex gap-2 border-r pr-4">
              <button
                onClick={() => setViewType('card')}
                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                  viewType === 'card'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                카드 뷰
              </button>
              <button
                onClick={() => setViewType('gantt')}
                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                  viewType === 'gantt'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <BarChart className="w-4 h-4" />
                간트차트
              </button>
            </div>
            
            {/* View Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedView('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  selectedView === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setSelectedView('company')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedView === 'company'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                회사
              </button>
              <button
                onClick={() => setSelectedView('team')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedView === 'team'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                팀
              </button>
              <button
                onClick={() => setSelectedView('individual')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedView === 'individual'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                개인
              </button>
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={loadObjectives}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>
        
        {/* Objectives Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredObjectives.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">목표가 없습니다</h3>
            <p className="text-gray-600 mb-4">
              {periodType === 'all' ? '전체 기간에' : 
               periodType === 'year' ? `${selectedYear}년에` :
               `${selectedYear}년 ${selectedQuarter}에`} 설정된 목표가 없습니다.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              첫 목표 만들기
            </button>
          </div>
        ) : viewType === 'gantt' ? (
          <GanttChart
            objectives={filteredObjectives}
            year={selectedYear}
            onObjectiveClick={(objective) => toggleExpanded(objective.id!)}
          />
        ) : (
          <div className="grid gap-6">
            <AnimatePresence>
              {filteredObjectives.map((objective) => (
                <OKRCard
                  key={objective.id}
                  objective={objective}
                  onUpdate={loadObjectives}
                  onShare={handleShareObjective}
                  onDelete={loadObjectives}
                  isExpanded={expandedObjectives.has(objective.id!)}
                  onToggleExpand={() => toggleExpanded(objective.id!)}
                  currentUserId={user?.firebase_uid}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      
      {/* Create Objective Modal */}
      {showCreateModal && (
        <CreateObjectiveModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadObjectives();
          }}
          currentQuarter={selectedQuarter}
          currentYear={selectedYear}
        />
      )}
      
      {/* Share OKR Modal */}
      {selectedObjectiveForShare && (
        <ShareOKRModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setSelectedObjectiveForShare(null);
          }}
          objective={selectedObjectiveForShare}
        />
      )}
    </div>
  );
};

export default OKRDashboardEnhanced;