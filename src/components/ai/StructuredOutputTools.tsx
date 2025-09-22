// Structured Output Tools Component
import React, { useState } from 'react';
import { FileText, CheckSquare, Target, Loader2, Download, Copy, Calendar, Users, AlertCircle } from 'lucide-react';
import langchainEnhancedService from '../../services/langchainEnhancedService';
import { motion, AnimatePresence } from 'framer-motion';

type ToolType = 'meeting' | 'tasks' | 'okr';

interface StructuredOutputToolsProps {
  provider?: 'openai' | 'anthropic';
  onExport?: (data: any, type: ToolType) => void;
}

const StructuredOutputTools: React.FC<StructuredOutputToolsProps> = ({
  provider = 'openai',
  onExport,
}) => {
  const [selectedTool, setSelectedTool] = useState<ToolType>('meeting');
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const tools = [
    {
      id: 'meeting' as ToolType,
      name: '회의록 생성',
      icon: FileText,
      description: '회의 내용을 구조화된 회의록으로 변환',
      placeholder: '회의 대화 내용이나 녹취록을 입력하세요...',
      color: 'blue',
    },
    {
      id: 'tasks' as ToolType,
      name: '태스크 추출',
      icon: CheckSquare,
      description: '텍스트에서 실행 가능한 태스크 추출',
      placeholder: '프로젝트 계획이나 회의록을 입력하세요...',
      color: 'green',
    },
    {
      id: 'okr' as ToolType,
      name: 'OKR 생성',
      icon: Target,
      description: '목표를 OKR 형식으로 구조화',
      placeholder: '달성하고자 하는 목표를 설명해주세요...',
      color: 'purple',
    },
  ];

  const handleProcess = async () => {
    if (!inputText.trim()) {
      setError('텍스트를 입력해주세요');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      let processedResult: any;
      
      switch (selectedTool) {
        case 'meeting':
          processedResult = await langchainEnhancedService.generateMeetingNotes(inputText, provider);
          break;
        case 'tasks':
          processedResult = await langchainEnhancedService.extractTasks(inputText, provider);
          break;
        case 'okr':
          processedResult = await langchainEnhancedService.generateOKR(inputText, provider);
          break;
      }

      setResult(processedResult);
    } catch (err: any) {
      setError(err.message || '처리 중 오류가 발생했습니다');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      alert('클립보드에 복사되었습니다');
    }
  };

  const handleExport = () => {
    if (result && onExport) {
      onExport(result, selectedTool);
    } else if (result) {
      // Download as JSON
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTool}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    switch (selectedTool) {
      case 'meeting':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-lg mb-2">{result.title}</h4>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {result.date}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {result.participants?.length || 0}명
                </span>
              </div>
            </div>

            <div>
              <h5 className="font-semibold mb-2">📋 안건</h5>
              <ul className="list-disc list-inside space-y-1">
                {result.agenda?.map((item: string, i: number) => (
                  <li key={i} className="text-sm">{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="font-semibold mb-2">💡 주요 논의사항</h5>
              <ul className="space-y-1">
                {result.keyPoints?.map((point: string, i: number) => (
                  <li key={i} className="text-sm bg-gray-50 p-2 rounded">{point}</li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="font-semibold mb-2">✅ Action Items</h5>
              <div className="space-y-2">
                {result.actionItems?.map((item: any, i: number) => (
                  <div key={i} className="bg-yellow-50 p-3 rounded-lg">
                    <p className="font-medium text-sm">{item.task}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                      <span>담당: {item.assignee}</span>
                      {item.deadline && <span>마감: {item.deadline}</span>}
                      {item.priority && (
                        <span className={`px-2 py-0.5 rounded-full ${
                          item.priority === 'urgent' ? 'bg-red-200' :
                          item.priority === 'high' ? 'bg-orange-200' :
                          item.priority === 'medium' ? 'bg-yellow-200' :
                          'bg-green-200'
                        }`}>
                          {item.priority}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'tasks':
        return (
          <div className="space-y-3">
            {Array.isArray(result) && result.map((task: any, i: number) => (
              <div key={i} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-semibold">{task.title}</h5>
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                    task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {task.priority}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  {task.estimatedTime && <span>⏱ {task.estimatedTime}</span>}
                  {task.assignee && <span>👤 {task.assignee}</span>}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex gap-1">
                      {task.tags.map((tag: string, j: number) => (
                        <span key={j} className="px-2 py-0.5 bg-gray-100 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        );

      case 'okr':
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-lg">Objective</h4>
              <p className="mt-2">{result.objective}</p>
              <div className="flex items-center gap-3 mt-2 text-sm">
                <span className="text-gray-600">Owner: {result.owner}</span>
                <span className="text-gray-600">기간: {result.timeframe}</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  result.status === 'completed' ? 'bg-green-100 text-green-700' :
                  result.status === 'on_track' ? 'bg-blue-100 text-blue-700' :
                  result.status === 'at_risk' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {result.status}
                </span>
              </div>
            </div>

            <div>
              <h5 className="font-semibold mb-3">Key Results</h5>
              <div className="space-y-2">
                {result.keyResults?.map((kr: any, i: number) => (
                  <div key={i} className="bg-white border rounded-lg p-3">
                    <p className="font-medium text-sm">{kr.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                      <span>📊 {kr.metric}</span>
                      <span>🎯 목표: {kr.target}</span>
                      {kr.current && <span>📈 현재: {kr.current}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">구조화된 출력 도구</h2>

      {/* Tool Selector */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedTool === tool.id
                  ? `border-${tool.color}-500 bg-${tool.color}-50`
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Icon className={`w-8 h-8 mx-auto mb-2 ${
                selectedTool === tool.id ? `text-${tool.color}-600` : 'text-gray-600'
              }`} />
              <h3 className="font-semibold">{tool.name}</h3>
              <p className="text-xs text-gray-600 mt-1">{tool.description}</p>
            </button>
          );
        })}
      </div>

      {/* Input Area */}
      <div className="mb-6">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={tools.find(t => t.id === selectedTool)?.placeholder}
          className="w-full h-40 p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between mb-6">
        <button
          onClick={handleProcess}
          disabled={isProcessing || !inputText.trim()}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              처리 중...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              구조화 실행
            </>
          )}
        </button>

        {result && (
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              복사
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              내보내기
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Result Display */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="border-t pt-6"
          >
            <h3 className="text-lg font-semibold mb-4">결과</h3>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              {renderResult()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StructuredOutputTools;