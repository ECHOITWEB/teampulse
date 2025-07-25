import React, { useState } from 'react';
import TeamPulseAI from '../components/tools/TeamPulseAI';
import CompanyInfoBot from '../components/tools/CompanyInfoBot';
import DocumentReview from '../components/tools/DocumentReview';
import DocumentTranslator from '../components/tools/DocumentTranslator';
import PowerPointPlanner from '../components/tools/PowerPointPlanner';
import TextTranslator from '../components/tools/TextTranslator';
import DataAnalyzer from '../components/tools/DataAnalyzer';
import EmailComposer from '../components/tools/EmailComposer';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  component: React.ComponentType;
}

const AITools: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<string>('teampulse-ai');

  const tools: Tool[] = [
    {
      id: 'teampulse-ai',
      name: 'TeamPulse AI',
      description: '범용적인 업무 도우미 챗봇',
      icon: '🤖',
      component: TeamPulseAI
    },
    {
      id: 'company-info',
      name: '기업정보 챗봇',
      description: '기업 정보 검색 및 분석',
      icon: '🏢',
      component: CompanyInfoBot
    },
    {
      id: 'document-review',
      name: '문서 파일 검토',
      description: 'PDF 문서 업로드 및 질문/요약',
      icon: '📄',
      component: DocumentReview
    },
    {
      id: 'document-translator',
      name: '문서 번역',
      description: '문서 형식을 유지한 번역',
      icon: '🌐',
      component: DocumentTranslator
    },
    {
      id: 'ppt-planner',
      name: '파워포인트 기획',
      description: '프레젠테이션 구성 제안',
      icon: '📊',
      component: PowerPointPlanner
    },
    {
      id: 'text-translator',
      name: '본문 번역',
      description: '텍스트 번역 및 톤 조정',
      icon: '💬',
      component: TextTranslator
    },
    {
      id: 'data-analyzer',
      name: '데이터 분석',
      description: 'Excel/CSV 데이터 분석',
      icon: '📈',
      component: DataAnalyzer
    },
    {
      id: 'email-composer',
      name: '이메일 작성',
      description: '전문적인 이메일 작성 도우미',
      icon: '✉️',
      component: EmailComposer
    }
  ];

  const SelectedComponent = tools.find(tool => tool.id === selectedTool)?.component || TeamPulseAI;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex gap-6 h-[calc(100vh-200px)]">
        {/* 사이드바 */}
        <div className="w-80 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-6 h-full overflow-y-auto">
            <h1 className="text-2xl font-bold mb-6">AI 업무 도구</h1>
            <div className="space-y-2">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setSelectedTool(tool.id)}
                  className={`w-full text-left p-4 rounded-lg transition-colors ${
                    selectedTool === tool.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{tool.icon}</span>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${
                        selectedTool === tool.id ? 'text-white' : 'text-gray-900'
                      }`}>
                        {tool.name}
                      </h3>
                      <p className={`text-sm mt-1 ${
                        selectedTool === tool.id ? 'text-blue-100' : 'text-gray-600'
                      }`}>
                        {tool.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 메인 컨텐츠 영역 */}
        <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <SelectedComponent />
        </div>
      </div>
    </div>
  );
};

export default AITools;