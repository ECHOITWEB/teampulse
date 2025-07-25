import React, { useState } from 'react';
import { createChatCompletion } from '../../utils/openai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CompanyInfoBot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [searchMode, setSearchMode] = useState(true);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    setSearchMode(false);
    setLoading(true);
    const initialMessage: Message = { 
      role: 'user', 
      content: `${companyName}에 대한 정보를 알려주세요.` 
    };
    setMessages([initialMessage]);

    try {
      const response = await createChatCompletion([
        { 
          role: 'system', 
          content: `You are a company information specialist. Provide detailed information about companies including their business model, products/services, market position, recent news, and financial status if available. Always respond in Korean. Focus on: 
          1. 회사 개요 및 설립 정보
          2. 주요 사업 분야 및 제품/서비스
          3. 시장 지위 및 경쟁사
          4. 최근 뉴스 및 동향
          5. 재무 정보 (가능한 경우)
          6. 기업 문화 및 비전` 
        },
        initialMessage
      ]);

      if (response) {
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '죄송합니다. 정보를 가져오는 중 오류가 발생했습니다.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await createChatCompletion([
        { 
          role: 'system', 
          content: `You are a company information specialist discussing about ${companyName}. Provide detailed and accurate information. Always respond in Korean.` 
        },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: input }
      ]);

      if (response) {
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '죄송합니다. 오류가 발생했습니다.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSearch = () => {
    setSearchMode(true);
    setMessages([]);
    setCompanyName('');
    setInput('');
  };

  if (searchMode) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <h2 className="text-2xl font-bold mb-8">기업 정보 검색</h2>
        <form onSubmit={handleSearch} className="w-full max-w-md">
          <div className="space-y-4">
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="기업명을 입력하세요 (예: 삼성전자, Apple)"
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            />
            <button
              type="submit"
              disabled={!companyName.trim()}
              className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
            >
              검색하기
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-lg">{companyName} 정보</h3>
        <button
          onClick={handleNewSearch}
          className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
        >
          새로운 검색
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {message.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p>{message.content}</p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
      </div>
      <form onSubmit={handleFollowUp} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="추가 질문을 입력하세요..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            전송
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanyInfoBot;