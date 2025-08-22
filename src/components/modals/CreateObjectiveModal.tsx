import React, { useState } from 'react';
import { X, Plus, Trash2, Target, Users, User } from 'lucide-react';

interface KeyResultInput {
  id: string;
  title: string;
  targetValue: string;
  unit: string;
  ownerId?: string;
}

interface CreateObjectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  currentQuarter: string;
  currentYear: string;
}

const CreateObjectiveModal: React.FC<CreateObjectiveModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentQuarter,
  currentYear
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'company' | 'team' | 'individual'>('team');
  const [keyResults, setKeyResults] = useState<KeyResultInput[]>([
    { id: '1', title: '', targetValue: '', unit: '' }
  ]);

  const addKeyResult = () => {
    setKeyResults([
      ...keyResults,
      { id: Date.now().toString(), title: '', targetValue: '', unit: '' }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validKeyResults = keyResults.filter(kr => kr.title && kr.targetValue && kr.unit);
    
    if (title && validKeyResults.length > 0) {
      onSubmit({
        title,
        description,
        type,
        quarter: currentQuarter,
        year: parseInt(currentYear),
        keyResults: validKeyResults.map(kr => ({
          title: kr.title,
          targetValue: parseFloat(kr.targetValue),
          unit: kr.unit,
          ownerId: kr.ownerId
        }))
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      setType('team');
      setKeyResults([{ id: '1', title: '', targetValue: '', unit: '' }]);
      onClose();
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
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Objective Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">목표 유형</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'company' as const, label: '회사', icon: Target },
                { value: 'team' as const, label: '팀', icon: Users },
                { value: 'individual' as const, label: '개인', icon: User }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                    type === option.value
                      ? 'border-primary bg-blue-50 text-primary'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <option.icon className="w-6 h-6 mb-2" />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Objective Title */}
          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              목표 제목 <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 사용자 만족도 향상"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          {/* Objective Description */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              목표 설명
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="목표에 대한 상세 설명을 입력하세요"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          </div>

          {/* Key Results */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">
                핵심 결과 (Key Results) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addKeyResult}
                className="flex items-center space-x-1 text-primary hover:text-primary-dark text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>추가</span>
              </button>
            </div>
            
            <div className="space-y-3">
              {keyResults.map((kr, index) => (
                <div key={kr.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start space-x-3">
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={kr.title}
                        onChange={(e) => updateKeyResult(kr.id, 'title', e.target.value)}
                        placeholder="핵심 결과 제목"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          value={kr.targetValue}
                          onChange={(e) => updateKeyResult(kr.id, 'targetValue', e.target.value)}
                          placeholder="목표값"
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                        />
                        <input
                          type="text"
                          value={kr.unit}
                          onChange={(e) => updateKeyResult(kr.id, 'unit', e.target.value)}
                          placeholder="단위 (%, 개, 명 등)"
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
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
            <p className="text-xs text-gray-500 mt-2">
              측정 가능한 구체적인 결과를 입력하세요. 최소 1개 이상 필요합니다.
            </p>
          </div>

          {/* Period Info */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-700">
              이 목표는 <span className="font-semibold">{currentYear}년 {currentQuarter} 분기</span>에 생성됩니다.
            </p>
          </div>
        </form>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            목표 생성
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateObjectiveModal;