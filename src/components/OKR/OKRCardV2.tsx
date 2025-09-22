import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, User, Building2, Users, Calendar, Activity, MoreVertical,
  Eye, ThumbsUp, Flag, Trophy, AlertCircle, ChevronRight,
  Edit2, Trash2, Plus, Save, X, Lock, Unlock
} from 'lucide-react';
import { Objective, KeyResult, CompanyObjective, TeamObjective, IndividualObjective } from '../../types/okr';
import okrServiceV2 from '../../services/okrServiceV2';
import { useAuth } from '../../contexts/AuthContext';

interface OKRCardV2Props {
  objective: Objective;
  onUpdate: () => void;
  onDelete?: () => void;
  onSelect?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  currentUserId?: string;
}

const OKRCardV2: React.FC<OKRCardV2Props> = ({
  objective,
  onUpdate,
  onDelete,
  onSelect,
  isExpanded = false,
  onToggleExpand,
  currentUserId
}) => {
  const { user } = useAuth();
  const [isEditingObjective, setIsEditingObjective] = useState(false);
  const [editedTitle, setEditedTitle] = useState(objective.title);
  const [editedDescription, setEditedDescription] = useState(objective.description);
  const [editingKRId, setEditingKRId] = useState<string | null>(null);
  const [editedKR, setEditedKR] = useState<Partial<KeyResult>>({});
  const [showMenu, setShowMenu] = useState(false);
  const [keyResults, setKeyResults] = useState<KeyResult[]>([]);
  const [permissions, setPermissions] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Load key results and permissions when expanded
  React.useEffect(() => {
    if (isExpanded && objective.id) {
      loadKeyResults();
      loadPermissions();
    }
  }, [isExpanded, objective.id]);

  const loadKeyResults = async () => {
    if (!objective.id) return;
    try {
      const krs = await okrServiceV2.getKeyResults(objective.id);
      setKeyResults(krs);
    } catch (error) {
      console.error('Error loading key results:', error);
    }
  };

  const loadPermissions = async () => {
    try {
      const perms = await okrServiceV2.getUserPermissions(objective);
      setPermissions(perms);
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const handleSaveObjective = async () => {
    if (!objective.id) return;
    
    setLoading(true);
    try {
      await okrServiceV2.updateObjective(objective.id, {
        title: editedTitle,
        description: editedDescription
      });
      setIsEditingObjective(false);
      onUpdate();
    } catch (error: any) {
      console.error('Error updating objective:', error);
      alert(error.message || '목표 수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteObjective = async () => {
    if (!objective.id) return;
    
    if (window.confirm('정말로 이 목표를 삭제하시겠습니까? 모든 핵심 결과도 함께 삭제됩니다.')) {
      setLoading(true);
      try {
        await okrServiceV2.deleteObjective(objective.id);
        onDelete?.();
      } catch (error: any) {
        console.error('Error deleting objective:', error);
        alert(error.message || '목표 삭제 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveKR = async (krId: string) => {
    if (!krId || !editedKR) return;
    
    setLoading(true);
    try {
      await okrServiceV2.updateKeyResult(krId, editedKR);
      setEditingKRId(null);
      setEditedKR({});
      loadKeyResults();
      onUpdate();
    } catch (error: any) {
      console.error('Error updating key result:', error);
      alert(error.message || '핵심 결과 수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKR = async (krId: string) => {
    if (!krId) return;
    
    if (window.confirm('이 핵심 결과를 삭제하시겠습니까?')) {
      setLoading(true);
      try {
        await okrServiceV2.deleteKeyResult(krId);
        loadKeyResults();
        onUpdate();
      } catch (error: any) {
        console.error('Error deleting key result:', error);
        alert(error.message || '핵심 결과 삭제 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }
  };

  const getTypeIcon = () => {
    switch (objective.type) {
      case 'company':
        return <Building2 className="w-5 h-5 text-purple-600" />;
      case 'team':
        return <Users className="w-5 h-5 text-blue-600" />;
      case 'individual':
        return <User className="w-5 h-5 text-green-600" />;
    }
  };

  const getTypeColor = () => {
    switch (objective.type) {
      case 'company':
        return 'bg-purple-100';
      case 'team':
        return 'bg-blue-100';
      case 'individual':
        return 'bg-green-100';
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

  const getOwnerInfo = () => {
    if (objective.type === 'individual') {
      const individualObj = objective as IndividualObjective;
      return {
        name: individualObj.userName,
        photoURL: individualObj.userPhotoURL,
        isPrivate: individualObj.isPrivate
      };
    }
    return null;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const ownerInfo = getOwnerInfo();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
      onClick={onSelect}
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
                  disabled={loading}
                />
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="w-full text-sm text-gray-600 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  disabled={loading}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveObjective}
                    disabled={loading}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    저장
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingObjective(false);
                      setEditedTitle(objective.title);
                      setEditedDescription(objective.description);
                    }}
                    disabled={loading}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getTypeColor()}`}>
                    {getTypeIcon()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">{objective.title}</h3>
                      {ownerInfo?.isPrivate && (
                        <span title="비공개 목표">
                          <Lock className="w-4 h-4 text-gray-500" />
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{objective.description}</p>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {permissions?.canEdit && !isEditingObjective && (
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
                  {permissions?.canDelete && (
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
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {ownerInfo && (
            <div className="flex items-center gap-2">
              {ownerInfo.photoURL ? (
                <img 
                  src={ownerInfo.photoURL} 
                  alt={ownerInfo.name} 
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <User className="w-4 h-4" />
              )}
              <span>{ownerInfo.name}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>
              {objective.useCustomDates 
                ? `${formatDate(objective.startDate)} - ${formatDate(objective.endDate)}`
                : `${objective.quarter} ${objective.year}`
              }
            </span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(objective.progressStatus)}`}>
            {objective.progressStatus === 'completed' ? '완료' :
             objective.progressStatus === 'on_track' ? '순조롭게 진행 중' :
             objective.progressStatus === 'at_risk' ? '위험' :
             objective.progressStatus === 'behind' ? '지연' : '시작 전'}
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
            {permissions?.canEdit && (
              <button 
                onClick={async () => {
                  if (!objective.id) return;
                  const title = prompt('새 핵심 결과 제목:');
                  if (!title) return;
                  
                  const targetValue = prompt('목표값:');
                  if (!targetValue) return;
                  
                  const unit = prompt('단위 (예: %, 개, 원):');
                  if (!unit) return;
                  
                  try {
                    await okrServiceV2.createKeyResult(objective.id, {
                      title,
                      targetValue: parseFloat(targetValue),
                      currentValue: 0,
                      startValue: 0,
                      unit,
                      progress: 0,
                      status: 'not_started',
                      owner: user?.name || user?.email || 'User'
                    });
                    loadKeyResults();
                    onUpdate();
                  } catch (error: any) {
                    alert(error.message || 'KR 추가 중 오류가 발생했습니다.');
                  }
                }}
                className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
              >
                <Plus className="w-4 h-4" />
                KR 추가
              </button>
            )}
          </div>
          
          {keyResults.length === 0 ? (
            <p className="text-gray-500 text-sm">아직 설정된 핵심 결과가 없습니다.</p>
          ) : (
            keyResults.map((kr) => (
              <div key={kr.id} className="border border-gray-200 rounded-lg p-4">
                {editingKRId === kr.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editedKR.title || kr.title}
                      onChange={(e) => setEditedKR({ ...editedKR, title: e.target.value })}
                      className="w-full font-medium text-gray-900 border-b border-gray-300 focus:outline-none focus:border-blue-500"
                      disabled={loading}
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">현재값</label>
                        <input
                          type="number"
                          value={editedKR.currentValue ?? kr.currentValue}
                          onChange={(e) => setEditedKR({ ...editedKR, currentValue: Number(e.target.value) })}
                          className="w-full mt-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">목표값</label>
                        <input
                          type="number"
                          value={editedKR.targetValue ?? kr.targetValue}
                          onChange={(e) => setEditedKR({ ...editedKR, targetValue: Number(e.target.value) })}
                          className="w-full mt-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">단위</label>
                        <input
                          type="text"
                          value={editedKR.unit || kr.unit}
                          onChange={(e) => setEditedKR({ ...editedKR, unit: e.target.value })}
                          className="w-full mt-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveKR(kr.id!)}
                        disabled={loading}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
                      >
                        저장
                      </button>
                      <button
                        onClick={() => {
                          setEditingKRId(null);
                          setEditedKR({});
                        }}
                        disabled={loading}
                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm disabled:opacity-50"
                      >
                        취소
                      </button>
                      {permissions?.canDelete && (
                        <button
                          onClick={() => handleDeleteKR(kr.id!)}
                          disabled={loading}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm ml-auto disabled:opacity-50"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900">{kr.title}</h5>
                      {permissions?.canEdit && (
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
                      <span>{kr.currentValue} / {kr.targetValue} {kr.unit}</span>
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
            ))
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

export default OKRCardV2;