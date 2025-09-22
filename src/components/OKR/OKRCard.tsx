import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, TrendingUp, User, Brain, MessageSquare,
  ChevronRight, Calendar, Activity, MoreVertical,
  Eye, ThumbsUp, Flag, Trophy, AlertCircle,
  Edit2, Trash2, Check, X, Plus, Save
} from 'lucide-react';
import okrService, { Objective, KeyResult } from '../../services/okrService';
import okrServiceExtended from '../../services/okrServiceExtended';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface OKRCardProps {
  objective: Objective;
  onUpdate: () => void;
  onShare?: (objective: Objective) => void;
  onDelete?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  currentUserId?: string;
}

const OKRCard: React.FC<OKRCardProps> = ({
  objective,
  onUpdate,
  onShare,
  onDelete,
  isExpanded = false,
  onToggleExpand,
  currentUserId
}) => {
  const [isEditingObjective, setIsEditingObjective] = useState(false);
  const [editedTitle, setEditedTitle] = useState(objective.title);
  const [editedDescription, setEditedDescription] = useState(objective.description);
  const [editedType, setEditedType] = useState(objective.type);
  const [editingKRId, setEditingKRId] = useState<string | null>(null);
  const [editedKR, setEditedKR] = useState<Partial<KeyResult>>({});
  const [showMenu, setShowMenu] = useState(false);
  const [keyResults, setKeyResults] = useState<KeyResult[]>([]);
  const [creatorName, setCreatorName] = useState<string>('');
  const [isAddingKR, setIsAddingKR] = useState(false);
  const [newKR, setNewKR] = useState({ title: '', targetValue: '', unit: '%' });

  // Fetch key results when component mounts or objective changes
  useEffect(() => {
    const fetchKeyResults = async () => {
      if (objective.id) {
        const results = await okrService.getKeyResultsForObjective(objective.id);
        setKeyResults(results);
      }
    };
    fetchKeyResults();
  }, [objective.id]);

  // Fetch creator name
  useEffect(() => {
    const fetchCreatorName = async () => {
      if (objective.created_by) {
        try {
          const userDoc = await getDoc(doc(db, 'users', objective.created_by));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setCreatorName(userData.name || userData.displayName || userData.email || objective.created_by);
          } else {
            setCreatorName('Unknown User');
          }
        } catch (error) {
          console.error('Error fetching creator name:', error);
          setCreatorName(objective.created_by);
        }
      }
    };
    fetchCreatorName();
  }, [objective.created_by]);

  // 사용자가 수정할 수 있는지 확인
  // 1. 자신이 만든 목표
  // 2. 팀 목표인 경우 팀원 모두
  // 3. 회사 목표는 관리자만 (추후 관리자 권한 체크 추가 필요)
  const canEdit = currentUserId === objective.created_by || 
                  objective.type === 'team' || 
                  objective.type === 'company';

  const handleSaveObjective = async () => {
    if (!objective.id) {
      alert('목표를 수정할 수 없습니다. ID가 없습니다.');
      return;
    }
    
    try {
      await okrServiceExtended.updateObjective(objective.id, {
        title: editedTitle,
        description: editedDescription,
        type: editedType
      });
      setIsEditingObjective(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error updating objective:', error);
      if (error?.code === 'not-found' || error?.message?.includes('No document to update')) {
        alert('이 목표가 데이터베이스에 존재하지 않습니다. 페이지를 새로고침해주세요.');
        onUpdate(); // Refresh the list
      } else {
        alert('목표 수정 중 오류가 발생했습니다.');
      }
    }
  };

  const handleDeleteObjective = async () => {
    if (!objective.id) {
      alert('목표를 삭제할 수 없습니다. ID가 없습니다.');
      return;
    }
    
    if (window.confirm('정말로 이 목표를 삭제하시겠습니까? 모든 핵심 결과도 함께 삭제됩니다.')) {
      try {
        await okrServiceExtended.deleteObjective(objective.id);
        onDelete?.();
      } catch (error: any) {
        console.error('Error deleting objective:', error);
        if (error?.code === 'not-found' || error?.message?.includes('No document to delete')) {
          alert('이 목표가 이미 삭제되었거나 존재하지 않습니다.');
          onDelete?.(); // Remove from UI anyway
        } else {
          alert('목표 삭제 중 오류가 발생했습니다.');
        }
      }
    }
  };

  const handleSaveKR = async (krId: string | undefined) => {
    if (!krId) {
      console.error('Key Result ID is missing');
      alert('핵심 결과를 수정할 수 없습니다. ID가 없습니다.');
      return;
    }
    try {
      await okrServiceExtended.updateKeyResult(krId, editedKR);
      setEditingKRId(null);
      setEditedKR({});
      onUpdate();
    } catch (error) {
      console.error('Error updating key result:', error);
      alert('핵심 결과 수정 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteKR = async (krId: string | undefined) => {
    if (!krId) {
      console.error('Key Result ID is missing');
      alert('핵심 결과를 삭제할 수 없습니다. ID가 없습니다.');
      return;
    }
    if (window.confirm('이 핵심 결과를 삭제하시겠습니까?')) {
      try {
        await okrServiceExtended.deleteKeyResult(krId);
        onUpdate();
      } catch (error) {
        console.error('Error deleting key result:', error);
        alert('핵심 결과 삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleAddKR = async () => {
    if (!newKR.title || !newKR.targetValue) {
      alert('제목과 목표값을 입력해주세요.');
      return;
    }
    
    try {
      await okrService.createKeyResult({
        objective_id: objective.id!,
        title: newKR.title,
        description: '',
        metric_type: newKR.unit === '%' ? 'percentage' : newKR.unit === '$' ? 'currency' : 'number',
        start_value: 0,
        target_value: parseFloat(newKR.targetValue),
        unit: newKR.unit
      });
      
      // Reset form and reload
      setNewKR({ title: '', targetValue: '', unit: '%' });
      setIsAddingKR(false);
      
      // Reload key results
      const results = await okrService.getKeyResultsForObjective(objective.id!);
      setKeyResults(results);
      onUpdate();
    } catch (error) {
      console.error('Error adding key result:', error);
      alert('핵심 결과 추가 중 오류가 발생했습니다.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'on_track': return 'text-blue-600 bg-blue-50';
      case 'at_risk': return 'text-yellow-600 bg-yellow-50';
      case 'behind': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getProgressBarColor = (progress: number) => {
    if (progress >= 70) return 'bg-gradient-to-r from-green-400 to-green-600';
    if (progress >= 40) return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
    return 'bg-gradient-to-r from-red-400 to-red-600';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {isEditingObjective ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full text-lg font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none"
                />
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="w-full text-sm text-gray-600 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">목표 타입:</label>
                  <select
                    value={editedType}
                    onChange={(e) => setEditedType(e.target.value as 'company' | 'team' | 'individual')}
                    className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="company">회사 목표</option>
                    <option value="team">팀 목표</option>
                    <option value="individual">개인 목표</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveObjective}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                  >
                    <Save className="w-4 h-4" />
                    저장
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingObjective(false);
                      setEditedTitle(objective.title);
                      setEditedDescription(objective.description);
                      setEditedType(objective.type);
                    }}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    objective.type === 'company' ? 'bg-purple-100' : 
                    objective.type === 'team' ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                    {objective.type === 'company' ? <Trophy className="w-5 h-5 text-purple-600" /> :
                     objective.type === 'team' ? <Flag className="w-5 h-5 text-blue-600" /> :
                     <Target className="w-5 h-5 text-green-600" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{objective.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{objective.description}</p>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {canEdit && !isEditingObjective && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <button
                    onClick={() => {
                      setIsEditingObjective(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    목표 수정
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteObjective();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                    목표 삭제
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <User className="w-4 h-4" />
            <span>{creatorName || 
                   (objective.type === 'company' ? '회사 목표' : 
                    objective.type === 'team' ? '팀 목표' : 
                    '개인 목표')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>Q{objective.period?.quarter || 1} {objective.period?.year || new Date().getFullYear()}</span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(objective.status)}`}>
            {objective.status === 'completed' ? '완료' :
             objective.status === 'active' ? '진행 중' :
             objective.status === 'draft' ? '초안' :
             objective.status === 'cancelled' ? '취소됨' : '시작 전'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">진행률</span>
            <span className="text-sm font-bold text-gray-900">{objective.progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${objective.progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`h-full ${getProgressBarColor(objective.progress)}`}
            />
          </div>
        </div>
      </div>

      {/* Key Results */}
      {isExpanded && (
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">핵심 결과</h4>
            {canEdit && !isAddingKR && (
              <button 
                onClick={() => setIsAddingKR(true)}
                className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
              >
                <Plus className="w-4 h-4" />
                KR 추가
              </button>
            )}
          </div>
          
          {/* Add new KR form */}
          {isAddingKR && (
            <div className="border border-blue-300 rounded-lg p-4 bg-blue-50">
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="핵심 결과 제목"
                  value={newKR.title}
                  onChange={(e) => setNewKR({ ...newKR, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="목표값"
                    value={newKR.targetValue}
                    onChange={(e) => setNewKR({ ...newKR, targetValue: e.target.value })}
                    className="flex-[2] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={newKR.unit}
                    onChange={(e) => setNewKR({ ...newKR, unit: e.target.value })}
                    className="flex-1 max-w-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="%">%</option>
                    <option value="개">개</option>
                    <option value="명">명</option>
                    <option value="건">건</option>
                    <option value="$">$</option>
                    <option value="원">원</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddKR}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                  >
                    <Save className="w-4 h-4" />
                    저장
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingKR(false);
                      setNewKR({ title: '', targetValue: '', unit: '%' });
                    }}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {keyResults && keyResults.length > 0 ? (
            <>
          
          {keyResults.map((kr) => (
            <div key={kr.id} className="border border-gray-200 rounded-lg p-4">
              {editingKRId === kr.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editedKR.title || kr.title}
                    onChange={(e) => setEditedKR({ ...editedKR, title: e.target.value })}
                    className="w-full font-medium text-gray-900 border-b border-gray-300 focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">현재값</label>
                      <input
                        type="number"
                        value={editedKR.current_value ?? kr.current_value}
                        onChange={(e) => setEditedKR({ ...editedKR, current_value: Number(e.target.value) })}
                        className="w-full mt-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">목표값</label>
                      <input
                        type="number"
                        value={editedKR.target_value ?? kr.target_value}
                        onChange={(e) => setEditedKR({ ...editedKR, target_value: Number(e.target.value) })}
                        className="w-full mt-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="w-24">
                      <label className="text-xs text-gray-500">단위</label>
                      <select
                        value={editedKR.unit || kr.unit}
                        onChange={(e) => setEditedKR({ ...editedKR, unit: e.target.value })}
                        className="w-full mt-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="%">%</option>
                        <option value="개">개</option>
                        <option value="명">명</option>
                        <option value="건">건</option>
                        <option value="$">$</option>
                        <option value="원">원</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveKR(kr.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => {
                        setEditingKRId(null);
                        setEditedKR({});
                      }}
                      className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => handleDeleteKR(kr.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm ml-auto"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900">{kr.title}</h5>
                    {canEdit && (
                      <button
                        onClick={() => {
                          setEditingKRId(kr.id!);
                          setEditedKR(kr);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Edit2 className="w-4 h-4 text-gray-500" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>{kr.current_value} / {kr.target_value} {kr.unit}</span>
                    <span className="font-medium">{kr.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProgressBarColor(kr.progress)}`}
                      style={{ width: `${kr.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
            </>
          ) : (
            <div className="text-center py-4 text-gray-500">
              핵심 결과가 없습니다. 위의 'KR 추가' 버튼을 클릭하여 추가하세요.
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <button
            onClick={onToggleExpand}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm font-medium"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            {isExpanded ? '접기' : '자세히 보기'}
          </button>
          
          <div className="flex items-center gap-2">
            {onShare && (
              <button
                onClick={() => onShare(objective)}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-1 text-sm"
              >
                <MessageSquare className="w-4 h-4" />
                공유
              </button>
            )}
            <div className="flex items-center gap-1 text-gray-500">
              <Eye className="w-4 h-4" />
              <span className="text-sm">0</span>
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <ThumbsUp className="w-4 h-4" />
              <span className="text-sm">0</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default OKRCard;