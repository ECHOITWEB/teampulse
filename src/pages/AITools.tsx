import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TeamPulseAI from '../components/tools/TeamPulseAI';
import CompanyInfoBot from '../components/tools/CompanyInfoBot';
import DocumentReview from '../components/tools/DocumentReview';
import DocumentTranslator from '../components/tools/DocumentTranslator';
import PowerPointPlanner from '../components/tools/PowerPointPlanner';
import TextTranslator from '../components/tools/TextTranslator';
import DataAnalyzer from '../components/tools/DataAnalyzer';
import EmailComposer from '../components/tools/EmailComposer';
import AIUsageDisplay from '../components/AIUsageDisplay';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  component: React.ComponentType;
  category: 'general' | 'document' | 'analysis' | 'communication';
  color: string;
}

const AITools: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<string>('teampulse-ai');
  const [searchQuery, setSearchQuery] = useState('');

  const tools: Tool[] = [
    {
      id: 'teampulse-ai',
      name: 'TeamPulse AI',
      description: '범용적인 업무 도우미 챗봇',
      icon: '🤖',
      component: TeamPulseAI,
      category: 'general',
      color: 'from-blue-500 to-cyan-400'
    },
    {
      id: 'company-info',
      name: '기업정보 챗봇',
      description: '기업 정보 검색 및 분석',
      icon: '🏢',
      component: CompanyInfoBot,
      category: 'analysis',
      color: 'from-purple-500 to-pink-400'
    },
    {
      id: 'document-review',
      name: '문서 파일 검토',
      description: 'PDF 문서 업로드 및 질문/요약',
      icon: '📄',
      component: DocumentReview,
      category: 'document',
      color: 'from-green-500 to-emerald-400'
    },
    {
      id: 'document-translator',
      name: '문서 번역',
      description: '문서 형식을 유지한 번역',
      icon: '🌐',
      component: DocumentTranslator,
      category: 'document',
      color: 'from-indigo-500 to-blue-400'
    },
    {
      id: 'ppt-planner',
      name: '파워포인트 기획',
      description: '프레젠테이션 구성 제안',
      icon: '📊',
      component: PowerPointPlanner,
      category: 'document',
      color: 'from-orange-500 to-red-400'
    },
    {
      id: 'text-translator',
      name: '본문 번역',
      description: '텍스트 번역 및 톤 조정',
      icon: '💬',
      component: TextTranslator,
      category: 'communication',
      color: 'from-teal-500 to-cyan-400'
    },
    {
      id: 'data-analyzer',
      name: '데이터 분석',
      description: 'Excel/CSV 데이터 분석',
      icon: '📈',
      component: DataAnalyzer,
      category: 'analysis',
      color: 'from-yellow-500 to-orange-400'
    },
    {
      id: 'email-composer',
      name: '이메일 작성',
      description: '전문적인 이메일 작성 도우미',
      icon: '✉️',
      component: EmailComposer,
      category: 'communication',
      color: 'from-pink-500 to-rose-400'
    }
  ];

  const filteredTools = tools.filter(tool => 
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [
    { id: 'all', name: '전체', icon: '🎯' },
    { id: 'general', name: '일반', icon: '🤖' },
    { id: 'document', name: '문서', icon: '📄' },
    { id: 'analysis', name: '분석', icon: '📊' },
    { id: 'communication', name: '소통', icon: '💬' }
  ];

  const [selectedCategory, setSelectedCategory] = useState('all');

  const displayTools = selectedCategory === 'all' 
    ? filteredTools 
    : filteredTools.filter(tool => tool.category === selectedCategory);

  const SelectedComponent = tools.find(tool => tool.id === selectedTool)?.component || TeamPulseAI;
  const selectedToolData = tools.find(tool => tool.id === selectedTool);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">AI 업무 도구</h1>
              <p className="text-lg text-gray-600">업무 효율을 극대화하는 8가지 AI 도구를 활용해보세요</p>
            </div>
            <div className="hidden lg:block">
              <AIUsageDisplay />
            </div>
          </div>
        </motion.div>

        <div className="flex gap-6 h-[calc(100vh-200px)]">
          {/* Enhanced Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
          >
            <div className="p-6 h-full overflow-y-auto">
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="도구 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                  <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <motion.button
                      key={category.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        selectedCategory === category.id
                          ? 'bg-primary text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span className="mr-1">{category.icon}</span>
                      {category.name}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Tools List */}
              <div className="space-y-3">
                <AnimatePresence>
                  {displayTools.map((tool, index) => (
                    <motion.button
                      key={tool.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ x: 5 }}
                      onClick={() => setSelectedTool(tool.id)}
                      className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${
                        selectedTool === tool.id
                          ? `bg-gradient-to-r ${tool.color} text-white shadow-lg scale-105`
                          : 'bg-gray-50 hover:bg-gray-100 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <motion.span 
                          className="text-3xl"
                          whileHover={{ rotate: [0, -10, 10, 0] }}
                          transition={{ duration: 0.5 }}
                        >
                          {tool.icon}
                        </motion.span>
                        <div className="flex-1">
                          <h3 className={`font-semibold ${
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
                </AnimatePresence>
              </div>

              {/* Tool Stats */}
              {selectedToolData && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 p-4 bg-gray-50 rounded-xl"
                >
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">도구 정보</h4>
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>카테고리</span>
                      <span className="font-medium">
                        {categories.find(c => c.id === selectedToolData.category)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>사용 횟수</span>
                      <span className="font-medium">1,234회</span>
                    </div>
                    <div className="flex justify-between">
                      <span>평균 응답 시간</span>
                      <span className="font-medium">2.3초</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Main Content Area */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex-1 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
          >
            {/* Tool Header */}
            {selectedToolData && (
              <motion.div
                key={selectedTool}
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
                      <h2 className="text-2xl font-bold">{selectedToolData.name}</h2>
                      <p className="text-white/90">{selectedToolData.description}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                      title="도움말"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                      title="전체화면"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Tool Component */}
            <div className="h-[calc(100%-88px)]">
              <SelectedComponent />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AITools;