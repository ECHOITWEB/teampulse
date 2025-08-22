import React, { useState, useEffect } from 'react';
import { Plus, Target, Users, User, ChevronDown, ChevronRight, MoreVertical, AlertCircle, MessageCircle, BarChart3 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CreateObjectiveModal from '../components/modals/CreateObjectiveModal';
import GoalComments from '../components/goals/GoalComments';
import MobileGoalsView from '../components/goals/MobileGoalsView';
import { MobileGoal } from '../components/goals/MobileGoalCard';
import useMobileDetection from '../hooks/useMobileDetection';
import objectiveService, { Objective as ApiObjective } from '../services/objectiveService';

interface KeyResult {
  id: string;
  objective_id?: number;
  title: string;
  description?: string;
  owner_id?: number;
  targetValue: number;
  currentValue: number;
  unit?: string;
  progress?: number;
  status?: 'not_started' | 'on_track' | 'at_risk' | 'behind' | 'completed';
  created_at?: string;
  updated_at?: string;
  owner?: string;
}

interface Objective extends Omit<ApiObjective, 'id' | 'goal_period_id' | 'owner_id' | 'team_id' | 'keyResults'> {
  id: string;
  quarter: string;
  year: string;
  type: 'company' | 'team' | 'individual';
  keyResults: KeyResult[];
  owner: string;
  team?: string;
  expanded?: boolean;
}

const GoalsDashboardNew: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { isMobile } = useMobileDetection();
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedView, setSelectedView] = useState<'all' | 'team' | 'individual'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  
  const [objectives, setObjectives] = useState<Objective[]>([]);
  
  // Load objectives from backend
  useEffect(() => {
    loadObjectives();
  }, [selectedQuarter, selectedYear, selectedView]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const loadObjectives = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get OKR hierarchy from backend
      const hierarchyData = await objectiveService.getOKRHierarchy(
        selectedView === 'all' ? undefined : selectedView
      );
      
      // Transform API data to frontend format
      const transformedObjectives = (hierarchyData.objectives || []).map((obj: any) => ({
        id: obj.id.toString(),
        title: obj.title,
        description: obj.description || '',
        quarter: selectedQuarter,
        year: selectedYear,
        type: obj.type || 'individual',
        progress: obj.progress || 0,
        status: obj.status,
        owner: obj.owner?.name || 'Unknown',
        team: obj.team?.name,
        expanded: true,
        keyResults: (obj.keyResults || []).map((kr: any) => ({
          id: kr.id.toString(),
          objective_id: kr.objective_id,
          title: kr.title,
          description: kr.description,
          currentValue: kr.current_value || 0,
          targetValue: kr.target_value || 100,
          unit: kr.unit || '%',
          status: kr.status || 'not_started',
          progress: kr.progress || 0,
          owner: kr.owner?.name || obj.owner?.name || 'Unknown',
          owner_id: kr.owner_id,
          created_at: kr.created_at,
          updated_at: kr.updated_at
        }))
      }));
      
      setObjectives(transformedObjectives);
    } catch (err) {
      console.error('Error loading objectives:', err);
      setError('Failed to load objectives. Please try again.');
      // Use mock data if API fails
      setObjectives([
    {
      id: '1',
      title: '케이팝데몬헌터스 글로벌 런칭 성공',
      description: '2024년 Q4 글로벌 시장 동시 런칭 및 MAU 500만 달성',
      quarter: 'Q4',
      year: '2024',
      type: 'company',
      progress: 72,
      owner: '김대표',
      expanded: true,
      status: 'active',
      created_at: '2024-10-01T00:00:00Z',
      updated_at: '2024-12-20T00:00:00Z',
      keyResults: [
        {
          id: 'kr1',
          title: '글로벌 5개국 동시 런칭',
          currentValue: 3,
          targetValue: 5,
          unit: '개국',
          status: 'on_track',
          owner: '김개발',
          progress: 60
        } as KeyResult,
        {
          id: 'kr2',
          title: 'MAU 500만 달성',
          currentValue: 380,
          targetValue: 500,
          unit: '만명',
          status: 'on_track',
          owner: '박마케팅',
          progress: 76
        } as KeyResult,
        {
          id: 'kr3',
          title: '일일 매출 10억원 달성',
          currentValue: 7.5,
          targetValue: 10,
          unit: '억원',
          status: 'at_risk',
          owner: '최기획',
          progress: 75
        } as KeyResult
      ]
    } as Objective,
    {
      id: '2',
      title: '개발팀 기술 역량 강화',
      description: '최신 기술 스택 도입 및 팀원 역량 향상',
      quarter: 'Q4',
      year: '2024',
      type: 'team',
      progress: 85,
      owner: '김개발',
      team: '개발팀',
      expanded: false,
      status: 'active',
      created_at: '2024-10-01T00:00:00Z',
      updated_at: '2024-12-20T00:00:00Z',
      keyResults: [
        {
          id: 'kr4',
          title: 'React Native 전환율',
          currentValue: 85,
          targetValue: 100,
          unit: '%',
          status: 'on_track',
          owner: '이프론트',
          progress: 85
        } as KeyResult,
        {
          id: 'kr5',
          title: '코드 커버리지',
          currentValue: 78,
          targetValue: 80,
          unit: '%',
          status: 'on_track',
          owner: '박백엔드',
          progress: 97.5
        } as KeyResult
      ]
    } as Objective,
    {
      id: '3',
      title: '개인 성장 목표',
      description: '풀스택 개발자로 성장하기',
      quarter: 'Q4',
      year: '2024',
      type: 'individual',
      progress: 65,
      owner: '김개발',
      expanded: false,
      status: 'active',
      created_at: '2024-10-01T00:00:00Z',
      updated_at: '2024-12-20T00:00:00Z',
      keyResults: [
        {
          id: 'kr6',
          title: 'AWS 자격증 취득',
          currentValue: 1,
          targetValue: 2,
          unit: '개',
          status: 'on_track',
          owner: '김개발',
          progress: 50
        } as KeyResult,
        {
          id: 'kr7',
          title: '오픈소스 기여',
          currentValue: 3,
          targetValue: 5,
          unit: 'PR',
          status: 'on_track',
          owner: '김개발',
          progress: 60
        } as KeyResult
      ]
    } as Objective
  ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleObjective = (id: string) => {
    setObjectives(objectives.map(obj => 
      obj.id === id ? { ...obj, expanded: !obj.expanded } : obj
    ));
  };

  const handleCommentCountChange = (objectiveId: string, count: number) => {
    setCommentCounts(prev => ({
      ...prev,
      [objectiveId]: count
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'at_risk': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '완료';
      case 'in_progress': return '진행중';
      case 'at_risk': return '위험';
      default: return '시작전';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'company': return <Target className="w-4 h-4" />;
      case 'team': return <Users className="w-4 h-4" />;
      case 'individual': return <User className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'company': return 'bg-purple-100 text-purple-700';
      case 'team': return 'bg-blue-100 text-blue-700';
      case 'individual': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const calculateOverallProgress = () => {
    const totalProgress = objectives.reduce((sum, obj) => sum + obj.progress, 0);
    return Math.round(totalProgress / objectives.length);
  };

  const filteredObjectives = selectedView === 'all' 
    ? objectives 
    : objectives.filter(obj => obj.type === selectedView);

  // Transform objectives to mobile goals format
  const mobileGoals: MobileGoal[] = filteredObjectives.map(objective => ({
    id: objective.id,
    title: objective.title,
    description: objective.description || '',
    progress: objective.progress,
    status: objective.status as MobileGoal['status'],
    owner: objective.owner,
    team: objective.team,
    dueDate: `${selectedYear} ${selectedQuarter}`,
    keyResults: objective.keyResults.map(kr => ({
      id: kr.id,
      title: kr.title,
      currentValue: kr.currentValue,
      targetValue: kr.targetValue,
      unit: kr.unit || '',
      progress: kr.progress || 0,
      status: kr.status || 'not_started',
      owner: kr.owner || objective.owner
    })),
    commentCount: commentCounts[objective.id] || 0,
    lastUpdate: objective.updated_at || objective.created_at || new Date().toISOString()
  }));

  // Mobile goal handlers
  const handleMobileGoalUpdate = async (goalId: string, updates: any) => {
    try {
      if (updates.keyResultUpdates && updates.keyResultUpdates.length > 0) {
        for (const krUpdate of updates.keyResultUpdates) {
          await objectiveService.updateKeyResult(parseInt(krUpdate.id), {
            current_value: krUpdate.currentValue
          });
        }
      }
      
      if (updates.progress !== undefined) {
        await objectiveService.updateObjective(parseInt(goalId), {
          progress: updates.progress
        });
      }

      // Reload objectives to reflect changes
      await loadObjectives();
    } catch (err) {
      console.error('Error updating goal:', err);
      alert('Failed to update goal. Please try again.');
    }
  };
  
  // Create new objective
  const handleCreateObjective = async (data: any) => {
    try {
      const newObjective = await objectiveService.createObjective({
        title: data.title,
        description: data.description,
        type: data.type,
        team_id: data.teamId,
        quarter: selectedQuarter,
        year: parseInt(selectedYear)
      });
      
      // Add key results if provided
      if (data.keyResults && data.keyResults.length > 0) {
        for (const kr of data.keyResults) {
          await objectiveService.addKeyResult(newObjective.id, {
            title: kr.title,
            target_value: kr.targetValue,
            unit: kr.unit
          });
        }
      }
      
      // Reload objectives
      await loadObjectives();
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating objective:', err);
      alert('Failed to create objective. Please try again.');
    }
  };
  

  // Early return for mobile view
  if (isMobile) {
    return (
      <>
        <MobileGoalsView
          goals={mobileGoals}
          loading={loading}
          error={error}
          onRefresh={loadObjectives}
          onCreateGoal={() => setShowCreateModal(true)}
          onUpdateGoal={handleMobileGoalUpdate}
          onViewGoalDetails={(goalId) => {
            // Navigate to detail view or expand card
            console.log('View goal details:', goalId);
          }}
          onEditGoal={(goalId) => {
            // Open edit modal
            console.log('Edit goal:', goalId);
          }}
          onCommentGoal={(goalId) => {
            // Open comment view
            console.log('Comment on goal:', goalId);
          }}
        />
        <CreateObjectiveModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateObjective}
          currentQuarter={selectedQuarter}
          currentYear={selectedYear}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">목표 관리 (OKR)</h1>
              <p className="text-gray-600 mt-2">목표와 핵심 결과를 통해 성과를 추적하세요</p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <Link
                to={`/workspaces/${workspaceId}/goals-analytics`}
                className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <BarChart3 className="w-5 h-5" />
                <span>분석 보기</span>
              </Link>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>새 목표 추가</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              {(['all', 'team', 'individual'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setSelectedView(view)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedView === view
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {view === 'all' ? '전체' : view === 'team' ? '팀' : '개인'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
        )}
        
        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
        {/* Overall Progress */}
        <div className="bg-gradient-to-r from-primary to-primary-dark rounded-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">전체 목표 달성률</h2>
              <p className="text-blue-100 mt-1">{selectedYear}년 {selectedQuarter} 분기</p>
            </div>
            <div className="text-4xl font-bold">{calculateOverallProgress()}%</div>
          </div>
          <div className="w-full bg-blue-800 bg-opacity-50 rounded-full h-4">
            <div
              className="bg-white h-4 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${calculateOverallProgress()}%` }}
            />
          </div>
        </div>

        {/* Objectives List */}
        <motion.div className="space-y-4">
          <AnimatePresence>
          {filteredObjectives.map((objective, index) => (
            <motion.div 
              key={objective.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* Objective Header */}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <button
                        onClick={() => toggleObjective(objective.id)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        {objective.expanded ? 
                          <ChevronDown className="w-5 h-5 text-gray-500" /> : 
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        }
                      </button>
                      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(objective.type)}`}>
                        {getTypeIcon(objective.type)}
                        <span>{objective.type === 'company' ? '회사' : objective.type === 'team' ? '팀' : '개인'}</span>
                      </span>
                      {objective.team && (
                        <span className="text-sm text-gray-500">{objective.team}</span>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{objective.title}</h3>
                    <p className="text-gray-600">{objective.description}</p>
                    <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>{objective.owner}</span>
                      </span>
                      <span>{objective.keyResults.length}개 핵심 결과</span>
                      <span className="flex items-center space-x-1">
                        <MessageCircle className="w-4 h-4" />
                        <span>{commentCounts[objective.id] || 0}개 댓글</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-900">{objective.progress}%</div>
                      <div className="text-sm text-gray-500">달성률</div>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-primary to-primary-dark h-2 rounded-full transition-all duration-500"
                    style={{ width: `${objective.progress}%` }}
                  />
                </div>
              </div>

              {/* Key Results */}
              <AnimatePresence>
              {objective.expanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border-t border-gray-100 bg-gray-50 p-6"
                >
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">핵심 결과</h4>
                  <div className="space-y-3">
                    {objective.keyResults.map((kr) => (
                      <div key={kr.id} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900">{kr.title}</h5>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getStatusColor(kr.status || 'not_started')}`}>
                            {getStatusText(kr.status || 'not_started')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                          <span>담당: {kr.owner}</span>
                          <span>{kr.currentValue} / {kr.targetValue} {kr.unit}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              kr.status === 'at_risk' ? 'bg-yellow-500' : 'bg-primary'
                            }`}
                            style={{ width: `${(kr.currentValue / kr.targetValue) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Comments Section */}
                  <div className="mt-6">
                    <GoalComments
                      objectiveId={parseInt(objective.id)}
                      currentUserId={1} // TODO: Get from auth context
                      currentUserName="Demo User" // TODO: Get from auth context
                      onCommentCountChange={(count) => handleCommentCountChange(objective.id, count)}
                    />
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </motion.div>
          ))}
          </AnimatePresence>
        </motion.div>

        {/* Empty State */}
        {filteredObjectives.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center"
          >
            <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">목표가 없습니다</h3>
            <p className="text-gray-600 mb-4">새로운 목표를 추가하여 시작하세요</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>첫 목표 추가</span>
            </button>
          </motion.div>
        )}
        </>
        )}
      </div>
      
      <CreateObjectiveModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateObjective}
        currentQuarter={selectedQuarter}
        currentYear={selectedYear}
      />
    </div>
  );
};

export default GoalsDashboardNew;