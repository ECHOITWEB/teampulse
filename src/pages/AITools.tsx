import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DocumentTranslator from '../components/tools/DocumentTranslator';
import DataAnalyzer from '../components/tools/DataAnalyzer';
import MeetingAssistant from '../components/tools/MeetingAssistant';
import TeamPulseAI from '../components/tools/TeamPulseAI';
import CompanyKnowledgeBot from '../components/tools/CompanyKnowledgeBot';
import AIUsageDisplay from '../components/AIUsageDisplay';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  component: React.ComponentType;
  category: 'translation' | 'analysis' | 'meeting' | 'chat' | 'knowledge';
  color: string;
  badge?: string;
}

const AITools: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<string>('document-translator');

  const tools: Tool[] = [
    {
      id: 'document-translator',
      name: '문서 번역',
      description: '실시간 다국어 번역으로 글로벌 소통을 지원합니다',
      icon: '🌐',
      component: DocumentTranslator,
      category: 'translation',
      color: 'from-blue-500 to-cyan-400',
      badge: 'OpenAI API'
    },
    {
      id: 'data-analyzer',
      name: '데이터 분석',
      description: 'CSV 파일을 업로드하면 전문적인 데이터 분석을 제공합니다',
      icon: '📊',
      component: DataAnalyzer,
      category: 'analysis',
      color: 'from-purple-500 to-pink-400',
      badge: 'Advanced'
    },
    {
      id: 'meeting-assistant',
      name: '미팅 어시스턴트',
      description: 'OKR 회의를 녹음하고 자동으로 회의록과 To-Do를 생성합니다',
      icon: '🎙️',
      component: MeetingAssistant,
      category: 'meeting',
      color: 'from-green-500 to-emerald-400',
      badge: 'NEW'
    },
    {
      id: 'teampulse-ai',
      name: '개인용 챗봇',
      description: 'Pulse AI와 대화하며 업무를 효율적으로 처리하세요',
      icon: '🤖',
      component: TeamPulseAI,
      category: 'chat',
      color: 'from-indigo-500 to-blue-400',
      badge: 'GPT-4'
    },
    {
      id: 'company-knowledge',
      name: '회사 지식 Q&A',
      description: '회사 정보와 문서를 기반으로 즉시 답변을 제공합니다',
      icon: '🏢',
      component: CompanyKnowledgeBot,
      category: 'knowledge',
      color: 'from-orange-500 to-red-400',
      badge: 'RAG'
    }
  ];

  const SelectedComponent = tools.find(tool => tool.id === selectedTool)?.component || DocumentTranslator;
  const selectedToolData = tools.find(tool => tool.id === selectedTool);

  return (
    <div className="flex-1 bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                AI 도구 체험
              </h1>
              <p className="text-lg text-gray-600">
                업무 효율을 극대화하는 5가지 핵심 AI 도구를 직접 체험해보세요
              </p>
            </div>
            <div className="hidden lg:block">
              <AIUsageDisplay />
            </div>
          </div>
        </motion.div>

        {/* Tool Selection Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-3">
            {tools.map((tool, index) => (
              <motion.button
                key={tool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                onClick={() => setSelectedTool(tool.id)}
                className={`group relative px-6 py-4 rounded-2xl transition-all duration-300 ${
                  selectedTool === tool.id
                    ? `bg-gradient-to-r ${tool.color} text-white shadow-xl scale-105`
                    : 'bg-white hover:shadow-lg hover:scale-105 border border-gray-200'
                }`}
              >
                {tool.badge && (
                  <span className={`absolute -top-2 -right-2 px-2 py-1 text-xs font-bold rounded-full ${
                    selectedTool === tool.id 
                      ? 'bg-white text-gray-800' 
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  }`}>
                    {tool.badge}
                  </span>
                )}
                <div className="flex items-center space-x-3">
                  <motion.span 
                    className="text-3xl"
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    {tool.icon}
                  </motion.span>
                  <div className="text-left">
                    <h3 className={`font-bold text-lg ${
                      selectedTool === tool.id ? 'text-white' : 'text-gray-900'
                    }`}>
                      {tool.name}
                    </h3>
                    <p className={`text-sm mt-1 ${
                      selectedTool === tool.id ? 'text-white/90' : 'text-gray-600'
                    }`}>
                      {tool.description}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <motion.div
          key={selectedTool}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
        >
          {/* Tool Header */}
          {selectedToolData && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`bg-gradient-to-r ${selectedToolData.color} text-white p-6`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="text-5xl"
                  >
                    {selectedToolData.icon}
                  </motion.div>
                  <div>
                    <h2 className="text-3xl font-bold">{selectedToolData.name}</h2>
                    <p className="text-white/90 text-lg mt-1">{selectedToolData.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm text-white/70">이번 달 사용량</p>
                    <p className="text-2xl font-bold">1,234회</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-3 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
                    title="도움말"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Tool Component */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedTool}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SelectedComponent />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">즉시 활용 가능</h3>
            <p className="text-gray-600">별도의 설정 없이 바로 사용할 수 있는 직관적인 인터페이스</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">안전한 데이터 처리</h3>
            <p className="text-gray-600">기업 데이터는 암호화되어 안전하게 처리됩니다</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">생산성 극대화</h3>
            <p className="text-gray-600">AI로 반복 작업을 자동화하고 핵심 업무에 집중하세요</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AITools;