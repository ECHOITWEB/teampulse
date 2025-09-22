import React, { useState } from 'react';
import { X, Plus, Trash2, Target, Users, User } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import { useHQPermissions } from '../../hooks/useHQPermissions';
import okrService from '../../services/okrService';

interface KeyResultInput {
  id: string;
  title: string;
  targetValue: string;
  unit: string;
}

interface CreateObjectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentQuarter: string;
  currentYear: string;
}

const CreateObjectiveModal: React.FC<CreateObjectiveModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentQuarter,
  currentYear
}) => {
  const { currentWorkspace, currentCompany } = useWorkspace();
  const { user } = useAuth();
  const { canManageCompanyObjectives } = useHQPermissions();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'company' | 'team' | 'individual'>('team');
  const [periodType, setPeriodType] = useState<'quarter' | 'custom'>('quarter');
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState<'growth' | 'revenue' | 'customer' | 'product' | 'operations' | 'people'>('growth');
  const [keyResults, setKeyResults] = useState<KeyResultInput[]>([
    { id: '1', title: '', targetValue: '', unit: '%' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addKeyResult = () => {
    setKeyResults([
      ...keyResults,
      { id: Date.now().toString(), title: '', targetValue: '', unit: '%' }
    ]);
  };

  const removeKeyResult = (id: string) => {
    if (keyResults.length > 1) {
      setKeyResults(keyResults.filter(kr => kr.id !== id));
    }
  };

  const updateKeyResult = (id: string, field: keyof KeyResultInput, value: string) => {
    setKeyResults(keyResults.map(kr => 
      kr.id === id ? { ...kr, [field]: value } : kr
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentWorkspace || !currentCompany || !user) {
      setError('Workspace or company not selected');
      return;
    }
    
    const validKeyResults = keyResults.filter(kr => kr.title && kr.targetValue && kr.unit);
    
    if (!title) {
      setError('Please enter an objective title');
      return;
    }
    
    if (validKeyResults.length === 0) {
      setError('Please add at least one key result');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Create objective based on type
      const objectiveData: any = {
        company_id: currentWorkspace.companyId,
        workspace_id: currentWorkspace.id, // Always use current workspace
        title,
        description: description || '',
        category,
        visibility: type === 'company' ? 'public' as const : 'workspace' as const
      };
      
      // Set period based on period type
      if (periodType === 'quarter') {
        objectiveData.year = parseInt(selectedYear);
        objectiveData.quarter = parseInt(selectedQuarter.replace('Q', ''));
      } else {
        // For custom period, pass start and end dates
        objectiveData.start_date = startDate;
        objectiveData.end_date = endDate;
        
        // Calculate year and quarter from dates for compatibility
        const start = new Date(startDate);
        objectiveData.year = start.getFullYear();
        objectiveData.quarter = Math.floor(start.getMonth() / 3) + 1;
      }
      
      // Only add user_id for individual objectives
      if (type === 'individual') {
        objectiveData.user_id = user.firebase_uid;
      }
      
      const objectiveId = await okrService.createObjective(objectiveData);
      
      // Create key results
      for (const kr of validKeyResults) {
        await okrService.createKeyResult({
          objective_id: objectiveId,
          title: kr.title,
          description: '',
          metric_type: kr.unit === '%' ? 'percentage' : kr.unit === '$' ? 'currency' : 'number',
          start_value: 0,
          target_value: parseFloat(kr.targetValue),
          unit: kr.unit
        });
      }
      
      // Reset form
      setTitle('');
      setDescription('');
      setType('team');
      setSelectedQuarter(currentQuarter);
      setSelectedYear(currentYear);
      setCategory('growth');
      setKeyResults([{ id: '1', title: '', targetValue: '', unit: '%' }]);
      
      // Close modal and trigger success callback
      onClose();
      
      // Add a small delay to ensure Firestore has propagated the changes
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 100);
    } catch (err: any) {
      console.error('Error creating objective:', err);
      setError(err.message || 'Failed to create objective');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">새 목표 추가</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Objective Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">목표 유형</label>
            <div className="flex gap-2">
              {/* Admin, Owner, HQ 멤버는 회사 목표를 생성할 수 있음 */}
              {(currentWorkspace?.role === 'owner' || currentWorkspace?.role === 'admin' || canManageCompanyObjectives) && (
                <button
                  type="button"
                  onClick={() => setType('company')}
                  className={`flex items-center px-4 py-2 rounded-lg border-2 transition-colors ${
                    type === 'company'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Target className="w-4 h-4 mr-2" />
                  회사 목표
                </button>
              )}
              <button
                type="button"
                onClick={() => setType('team')}
                className={`flex items-center px-4 py-2 rounded-lg border-2 transition-colors ${
                  type === 'team'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Users className="w-4 h-4 mr-2" />
                팀 목표
              </button>
              <button
                type="button"
                onClick={() => setType('individual')}
                className={`flex items-center px-4 py-2 rounded-lg border-2 transition-colors ${
                  type === 'individual'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <User className="w-4 h-4 mr-2" />
                개인 목표
              </button>
            </div>
          </div>

          {/* Period Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">기간 유형</label>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setPeriodType('quarter')}
                className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                  periodType === 'quarter'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                분기별 목표
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('custom')}
                className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                  periodType === 'custom'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                사용자 지정 기간
              </button>
            </div>
            
            {periodType === 'quarter' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">분기</label>
                  <select
                    value={selectedQuarter}
                    onChange={(e) => setSelectedQuarter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Q1">Q1 (1-3월)</option>
                    <option value="Q2">Q2 (4-6월)</option>
                    <option value="Q3">Q3 (7-9월)</option>
                    <option value="Q4">Q4 (10-12월)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">연도</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">시작일</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required={periodType === 'custom'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">종료일</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required={periodType === 'custom'}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Category */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="growth">성장</option>
              <option value="revenue">매출</option>
              <option value="customer">고객</option>
              <option value="product">제품</option>
              <option value="operations">운영</option>
              <option value="people">인재</option>
            </select>
          </div>

          {/* Objective Title */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              목표 제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="예: 고객 만족도 향상"
              required
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="목표에 대한 상세 설명을 입력하세요"
            />
          </div>

          {/* Key Results */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">
                핵심 결과 <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addKeyResult}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" />
                핵심 결과 추가
              </button>
            </div>
            
            {keyResults.map((kr, index) => (
              <div key={kr.id} className="mb-3 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={kr.title}
                      onChange={(e) => updateKeyResult(kr.id, 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                      placeholder={`핵심 결과 ${index + 1}`}
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={kr.targetValue}
                        onChange={(e) => updateKeyResult(kr.id, 'targetValue', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="목표값"
                      />
                      <select
                        value={kr.unit}
                        onChange={(e) => updateKeyResult(kr.id, 'unit', e.target.value)}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  {keyResults.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeKeyResult(kr.id)}
                      className="text-red-500 hover:text-red-700 mt-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </form>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            {loading ? '생성 중...' : '목표 생성'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateObjectiveModal;