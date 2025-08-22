import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Search, Code, FileText, Globe, Sparkles,
  ChevronRight, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

interface SlashCommand {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  shortcut: string;
  category: 'ai' | 'tools' | 'actions';
  requiresMultimodal?: boolean;
}

interface SlashCommandsProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (command: SlashCommand) => void;
  searchQuery: string;
  position?: { x: number; y: number };
  currentModel?: string;
}

// 모델별 멀티모달 지원 여부
const MULTIMODAL_MODELS = [
  // GPT 모델들 - 모두 이미지 분석 가능
  'gpt-5',
  'gpt-5-mini',
  'gpt-5-nano',
  'gpt-4o',
  'gpt-4.1',
  'gpt-4.1-mini',
  // Claude 모델들 - 모두 이미지/PDF 분석 가능
  'claude-opus-4-1-20250805',
  'claude-opus-4-20250514',
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-20250219',
  'claude-3-5-haiku-20241022'
];

const COMMANDS: SlashCommand[] = [
  {
    id: 'ask-ai',
    name: 'Ask Pulse AI',
    description: 'AI 어시스턴트에게 질문하기',
    icon: <Bot className="w-4 h-4" />,
    shortcut: '/ai',
    category: 'ai',
    requiresMultimodal: false
  },
  {
    id: 'analyze-file',
    name: 'Analyze File',
    description: '파일 분석 및 요약 (이미지, PDF, 문서)',
    icon: <FileText className="w-4 h-4" />,
    shortcut: '/analyze',
    category: 'ai',
    requiresMultimodal: true
  },
  {
    id: 'web-search',
    name: 'Web Search',
    description: '웹 검색하여 정보 찾기',
    icon: <Globe className="w-4 h-4" />,
    shortcut: '/web',
    category: 'tools',
    requiresMultimodal: false
  },
  {
    id: 'code-execute',
    name: 'Code Execute',
    description: '코드 실행 및 테스트',
    icon: <Code className="w-4 h-4" />,
    shortcut: '/code',
    category: 'tools',
    requiresMultimodal: false
  },
  {
    id: 'generate',
    name: 'Generate Content',
    description: '문서, 코드, 이메일 등 생성',
    icon: <Sparkles className="w-4 h-4" />,
    shortcut: '/generate',
    category: 'ai',
    requiresMultimodal: false
  }
];

const SlashCommands: React.FC<SlashCommandsProps> = ({
  isOpen,
  onClose,
  onSelect,
  searchQuery,
  position,
  currentModel = ''
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showModelWarning, setShowModelWarning] = useState(false);
  const [warningCommand, setWarningCommand] = useState<SlashCommand | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter commands based on search query
  const filteredCommands = COMMANDS.filter(cmd => 
    cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.shortcut.includes(searchQuery)
  );

  // Check if current model supports multimodal
  const isMultimodalModel = MULTIMODAL_MODELS.some(model => 
    currentModel.toLowerCase().includes(model.toLowerCase())
  );

  // Reset selection when filtered commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            handleCommandSelect(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            setSelectedIndex(prev => 
              prev > 0 ? prev - 1 : filteredCommands.length - 1
            );
          } else {
            setSelectedIndex(prev => 
              prev < filteredCommands.length - 1 ? prev + 1 : 0
            );
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  const handleCommandSelect = (command: SlashCommand) => {
    // Check if command requires multimodal and current model doesn't support it
    if (command.requiresMultimodal && !isMultimodalModel) {
      setWarningCommand(command);
      setShowModelWarning(true);
    } else {
      onSelect(command);
      onClose();
    }
  };

  const getRecommendedModels = () => {
    return [
      { name: 'GPT-5', value: 'gpt-5', provider: 'openai' },
      { name: 'GPT-5-mini', value: 'gpt-5-mini', provider: 'openai' },
      { name: 'GPT-4o', value: 'gpt-4o', provider: 'openai' },
      { name: 'Claude Opus 4.1', value: 'claude-opus-4-1-20250805', provider: 'claude' },
      { name: 'Claude Sonnet 4', value: 'claude-sonnet-4-20250514', provider: 'claude' }
    ];
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="absolute bottom-full mb-2 left-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
          style={position ? { 
            left: `${position.x}px`, 
            bottom: `calc(100% + ${position.y}px)` 
          } : undefined}
        >
          {/* Header */}
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              슬래시 명령어 • ↑↓ 이동 • Enter 선택 • Esc 닫기
            </p>
          </div>

          {/* Commands List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">명령어를 찾을 수 없습니다</p>
              </div>
            ) : (
              <div className="py-1">
                {filteredCommands.map((command, index) => (
                  <button
                    key={command.id}
                    onClick={() => handleCommandSelect(command)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "w-full px-4 py-2.5 flex items-start space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
                      selectedIndex === index && "bg-gray-50 dark:bg-gray-700"
                    )}
                  >
                    <div className={cn(
                      "mt-0.5 p-1.5 rounded",
                      selectedIndex === index 
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    )}>
                      {command.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {command.name}
                        </p>
                        <code className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                          {command.shortcut}
                        </code>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {command.description}
                      </p>
                      {command.requiresMultimodal && !isMultimodalModel && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          멀티모달 모델 필요
                        </p>
                      )}
                    </div>
                    {selectedIndex === index && (
                      <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Model Warning Modal */}
      <AnimatePresence>
        {showModelWarning && warningCommand && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
            onClick={() => setShowModelWarning(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start space-x-3 mb-4">
                <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    멀티모달 기능 필요
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    "{warningCommand.name}" 기능은 이미지, PDF 등 파일 분석이 필요하여 
                    멀티모달을 지원하는 모델이 필요합니다.
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  추천 모델:
                </p>
                <div className="space-y-2">
                  {getRecommendedModels().map(model => (
                    <button
                      key={model.value}
                      className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      onClick={() => {
                        // TODO: Change model to recommended one
                        console.log('Change model to:', model.value);
                        setShowModelWarning(false);
                        onSelect(warningCommand);
                        onClose();
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <Bot className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {model.name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {model.provider}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowModelWarning(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    // Use recommended model
                    console.log('Change to recommended model');
                    setShowModelWarning(false);
                    onSelect(warningCommand);
                    onClose();
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  모델 변경하기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SlashCommands;