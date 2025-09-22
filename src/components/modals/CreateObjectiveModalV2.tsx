import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Target, Users, User, Building2, Calendar, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { CreateObjectiveInput, ObjectiveType, ObjectivePeriod } from '../../types/okr';

interface KeyResultInput {
  id: string;
  title: string;
  targetValue: string;
  currentValue: string;
  unit: string;
}

interface CreateObjectiveModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateObjectiveInput) => Promise<void>;
  currentQuarter: string;
  currentYear: string;
}

const CreateObjectiveModalV2: React.FC<CreateObjectiveModalV2Props> = ({
  isOpen,
  onClose,
  onSubmit,
  currentQuarter,
  currentYear
}) => {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ObjectiveType>('team');
  const [period, setPeriod] = useState<ObjectivePeriod>('quarterly');
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [keyResults, setKeyResults] = useState<KeyResultInput[]>([
    { id: '1', title: '', targetValue: '', currentValue: '0', unit: '' }
  ]);
  const [loading, setLoading] = useState(false);
  
  // Get company ID from current workspace
  const companyId = currentWorkspace?.companyId || null;

  // Set default dates based on period
  useEffect(() => {
    if (period === 'annual') {
      setStartDate(`${selectedYear}-01-01`);
      setEndDate(`${selectedYear}-12-31`);
    } else if (period === 'quarterly') {
      const quarterStartDates: { [key: string]: string } = {
        'Q1': '-01-01',
        'Q2': '-04-01',
        'Q3': '-07-01',
        'Q4': '-10-01'
      };
      const quarterEndDates: { [key: string]: string } = {
        'Q1': '-03-31',
        'Q2': '-06-30',
        'Q3': '-09-30',
        'Q4': '-12-31'
      };
      
      setStartDate(`${selectedYear}${quarterStartDates[selectedQuarter]}`);
      setEndDate(`${selectedYear}${quarterEndDates[selectedQuarter]}`);
    }
  }, [period, selectedQuarter, selectedYear]);

  const addKeyResult = () => {
    setKeyResults([
      ...keyResults,
      { id: Date.now().toString(), title: '', targetValue: '', currentValue: '0', unit: '' }
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
    
    if (!title || keyResults.filter(kr => kr.title && kr.targetValue && kr.unit).length === 0) {
      alert('목표 제목과 최소 하나의 핵심 결과를 입력해주세요.');
      return;
    }

    if (type === 'company' && !companyId) {
      alert('회사 정보를 찾을 수 없습니다. 회사 목표를 생성하려면 회사에 소속되어 있어야 합니다.');
      return;
    }

    setLoading(true);

    try {
      const validKeyResults = keyResults.filter(kr => kr.title && kr.targetValue && kr.unit);
      
      const objectiveData: CreateObjectiveInput = {
        title,
        description,
        type,
        period,
        useCustomDates: period === 'custom',
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined,
        quarter: period === 'quarterly' ? selectedQuarter : undefined,
        year: period !== 'custom' ? selectedYear : undefined,
        companyId: type === 'company' ? companyId! : undefined,
        workspaceId: type !== 'company' ? currentWorkspace?.id : undefined,
        userId: type === 'individual' ? user?.id : undefined,
        isPrivate: type === 'individual' ? isPrivate : undefined,
        keyResults: validKeyResults.map(kr => ({
          title: kr.title,
          targetValue: parseFloat(kr.targetValue),
          currentValue: parseFloat(kr.currentValue || '0'),
          startValue: parseFloat(kr.currentValue || '0'),
          unit: kr.unit,
          progress: 0,
          status: 'not_started' as const,
          owner: user?.name || user?.email || 'User'
        }))
      };

      await onSubmit(objectiveData);
      
      // Reset form
      setTitle('');
      setDescription('');
      setType('team');
      setPeriod('quarterly');
      setUseCustomDates(false);
      setSelectedQuarter(currentQuarter);
      setSelectedYear(currentYear);
      setStartDate('');
      setEndDate('');
      setIsPrivate(false);
      setKeyResults([{ id: '1', title: '', targetValue: '', currentValue: '0', unit: '' }]);
      onClose();
    } catch (error) {
      console.error('Error creating objective:', error);
      alert('목표 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">새 목표 추가</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Objective Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">목표 유형</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setType('company')}
                disabled={!companyId}
                className={`p-3 rounded-lg border-2 transition-all ${
                  type === 'company'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300'
                } ${!companyId ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Building2 className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">회사 목표</span>
              </button>
              <button
                type="button"
                onClick={() => setType('team')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  type === 'team'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Users className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">팀 목표</span>
              </button>
              <button
                type="button"
                onClick={() => setType('individual')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  type === 'individual'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <User className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">개인 목표</span>
              </button>
            </div>
          </div>

          {/* Title and Description */}
          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              목표 제목
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="예: 2025년 1분기 매출 목표 달성"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              목표 설명
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
              placeholder="목표에 대한 상세 설명을 입력하세요"
            />
          </div>

          {/* Period Settings */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">목표 기간</label>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setPeriod('annual')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  period === 'annual'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Calendar className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">연간</span>
              </button>
              <button
                type="button"
                onClick={() => setPeriod('quarterly')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  period === 'quarterly'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Calendar className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">분기</span>
              </button>
              <button
                type="button"
                onClick={() => setPeriod('custom')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  period === 'custom'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Calendar className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">사용자 지정</span>
              </button>
            </div>

            {period === 'annual' && (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">연도</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>
                <p className="text-sm text-gray-500">
                  연간 목표는 모든 분기 보기에서 표시됩니다.
                </p>
              </div>
            )}

            {period === 'custom' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                    시작일
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                    종료일
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
              </div>
            ) : period === 'quarterly' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">분기</label>
                  <select
                    value={selectedQuarter}
                    onChange={(e) => setSelectedQuarter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="Q1">Q1 (1-3월)</option>
                    <option value="Q2">Q2 (4-6월)</option>
                    <option value="Q3">Q3 (7-9월)</option>
                    <option value="Q4">Q4 (10-12월)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">연도</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                  </select>
                </div>
              </div>
            ) : null}
          </div>

          {/* Private option for individual objectives */}
          {type === 'individual' && (
            <div className="mb-6">
              <div className="flex items-center">
                <input
                  id="isPrivate"
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded text-primary focus:ring-primary mr-2"
                />
                <label htmlFor="isPrivate" className="text-sm font-medium text-gray-700 cursor-pointer">
                  비공개 목표 (본인만 볼 수 있음)
                </label>
              </div>
            </div>
          )}

          {/* Key Results */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">핵심 결과 (Key Results)</label>
              <button
                type="button"
                onClick={addKeyResult}
                className="flex items-center gap-1 px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                KR 추가
              </button>
            </div>

            <div className="space-y-3">
              {keyResults.map((kr, index) => (
                <div key={kr.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={kr.title}
                        onChange={(e) => updateKeyResult(kr.id, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="핵심 결과 제목"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          value={kr.currentValue}
                          onChange={(e) => updateKeyResult(kr.id, 'currentValue', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="현재값"
                        />
                        <input
                          type="number"
                          value={kr.targetValue}
                          onChange={(e) => updateKeyResult(kr.id, 'targetValue', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="목표값"
                        />
                        <input
                          type="text"
                          value={kr.unit}
                          onChange={(e) => updateKeyResult(kr.id, 'unit', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="단위 (%, 개, 원)"
                        />
                      </div>
                    </div>
                    {keyResults.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeKeyResult(kr.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '생성 중...' : '목표 생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateObjectiveModalV2;