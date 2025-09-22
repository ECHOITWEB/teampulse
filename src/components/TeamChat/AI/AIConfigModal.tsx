import React from 'react';
import { X, Bot, Settings, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import chatService from '../../../services/chatService';
import { AIProvider } from '../../../types/chat.types';

interface AIConfigModalProps {
  show: boolean;
  selectedProvider: AIProvider | null;
  selectedModel: string;
  onProviderChange: (provider: AIProvider) => void;
  onModelChange: (model: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const AIConfigModal: React.FC<AIConfigModalProps> = ({
  show,
  selectedProvider,
  selectedModel,
  onProviderChange,
  onModelChange,
  onClose,
  onConfirm
}) => {
  const aiModels = chatService.getAvailableAIModels();
  
  const providerInfo = {
    openai: {
      name: 'OpenAI (ChatGPT)',
      description: '다양한 작업에 뛰어난 범용 AI 모델',
      features: ['코드 작성', '창의적 글쓰기', '이미지 생성', '데이터 분석'],
      icon: '🤖',
      color: 'from-green-500 to-teal-600'
    },
    anthropic: {
      name: 'Anthropic (Claude)',
      description: '안전하고 도덕적인 AI, 긴 문서 처리에 특화',
      features: ['긴 문서 분석', '윤리적 추론', '상세한 설명', '연구 지원'],
      icon: '🧠',
      color: 'from-purple-500 to-pink-600'
    }
  };

  const getModelDescription = (model: string): string => {
    const descriptions: { [key: string]: string } = {
      'gpt-4-turbo-preview': '최신 GPT-4 Turbo 모델. 가장 강력하고 정확함',
      'gpt-4': '고급 추론과 창의성을 갖춘 플래그십 모델',
      'gpt-4-32k': '긴 문서 처리가 가능한 GPT-4 (32,000 토큰)',
      'gpt-3.5-turbo': '빠르고 효율적인 일반 용도 모델',
      'gpt-3.5-turbo-16k': '긴 대화가 가능한 GPT-3.5 (16,000 토큰)',
      'claude-3-opus-20240229': '가장 강력한 Claude 모델, 복잡한 작업에 최적',
      'claude-3-sonnet-20240229': '균형잡힌 성능과 속도',
      'claude-3-haiku-20240307': '빠르고 효율적인 경량 모델',
      'claude-2.1': '안정적인 이전 세대 모델',
      'claude-instant-1.2': '매우 빠른 응답 속도'
    };
    return descriptions[model] || '표준 AI 모델';
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">AI 어시스턴트 설정</h2>
                    <p className="text-sm text-white text-opacity-80">AI 모델을 선택하고 대화를 시작하세요</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* AI Provider 선택 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  AI 제공자 선택
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(providerInfo).map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => onProviderChange(key as AIProvider)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedProvider === key
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 bg-gradient-to-br ${info.color} rounded-lg flex items-center justify-center text-2xl`}>
                          {info.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{info.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{info.description}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {info.features.map((feature, index) => (
                              <span key={index} className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 모델 선택 */}
              {selectedProvider && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    AI 모델 선택
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(aiModels[selectedProvider] || {}).map(([key, model]) => (
                      <label
                        key={key}
                        className={`block p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedModel === model.name
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start">
                          <input
                            type="radio"
                            name="model"
                            value={model.name}
                            checked={selectedModel === model.name}
                            onChange={(e) => onModelChange(e.target.value)}
                            className="mt-1 w-4 h-4 flex-shrink-0"
                          />
                          <div className="ml-3 flex-1">
                            <div className="font-medium text-gray-900">{model.displayName}</div>
                            <div className="text-sm text-gray-600 mt-0.5">
                              {getModelDescription(model.name)}
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* 사용 팁 */}
              {selectedProvider && selectedModel && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">💡 사용 팁</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• AI와 대화하려면 메시지에 @AI를 입력하거나 /ai 명령어를 사용하세요</li>
                    <li>• 긴 대화의 경우 컨텍스트 제한에 주의하세요</li>
                    <li>• 민감한 정보는 공유하지 마세요</li>
                    <li>• AI 응답은 항상 검증하고 확인하세요</li>
                  </ul>
                </div>
              )}
            </div>

            {/* 푸터 */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={onConfirm}
                  disabled={!selectedProvider || !selectedModel}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    selectedProvider && selectedModel
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  AI 초대하기
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIConfigModal;