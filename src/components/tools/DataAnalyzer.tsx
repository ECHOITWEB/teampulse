import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { createChatCompletion } from '../../utils/openai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const DataAnalyzer: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const parseCSV = (file: File) => {
    return new Promise<{ data: any[], headers: string[] }>((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          resolve({ data: results.data, headers });
        },
        error: reject
      });
    });
  };

  const parseExcel = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    const headers = jsonData.length > 0 ? Object.keys(jsonData[0] as object) : [];
    return { data: jsonData, headers };
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setProcessing(true);

    try {
      let parsedData;
      if (uploadedFile.name.endsWith('.csv')) {
        parsedData = await parseCSV(uploadedFile);
      } else if (uploadedFile.name.endsWith('.xlsx') || uploadedFile.name.endsWith('.xls')) {
        parsedData = await parseExcel(uploadedFile);
      } else {
        throw new Error('지원하지 않는 파일 형식입니다.');
      }

      setData(parsedData.data);
      setHeaders(parsedData.headers);
      
      const summary = `파일이 업로드되었습니다. 
- 파일명: ${uploadedFile.name}
- 행 수: ${parsedData.data.length}
- 열: ${parsedData.headers.join(', ')}

데이터에 대해 궁금한 점을 질문해주세요. 예를 들어:
- 데이터 요약
- 특정 열의 통계
- 데이터 시각화 제안
- 이상치 찾기`;

      setMessages([{ role: 'assistant', content: summary }]);
    } catch (error) {
      console.error('File parsing error:', error);
      setMessages([{ 
        role: 'assistant', 
        content: '파일 처리 중 오류가 발생했습니다. CSV 또는 Excel 파일을 업로드해주세요.' 
      }]);
    } finally {
      setProcessing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || data.length === 0) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const dataSnapshot = data.slice(0, 50);
      const response = await createChatCompletion([
        { 
          role: 'system', 
          content: `You are a data analysis expert. Analyze the provided data and answer questions in Korean. You can:
          1. Provide statistical summaries
          2. Identify patterns and trends
          3. Suggest visualizations
          4. Find anomalies
          5. Make data-driven recommendations
          
          Data structure:
          Headers: ${headers.join(', ')}
          Total rows: ${data.length}
          
          Data sample (first 50 rows):
          ${JSON.stringify(dataSnapshot, null, 2)}` 
        },
        ...messages.slice(1).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: input }
      ]);

      if (response) {
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '분석 중 오류가 발생했습니다.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAnalysis = async (analysisType: string) => {
    const quickPrompts: { [key: string]: string } = {
      summary: '이 데이터의 전체적인 요약과 주요 통계를 제공해주세요.',
      visualization: '이 데이터를 시각화하기 위한 최적의 차트 유형과 구성을 제안해주세요.',
      anomalies: '데이터에서 이상치나 특이한 패턴을 찾아주세요.',
      insights: '이 데이터에서 도출할 수 있는 주요 인사이트를 5가지 제시해주세요.'
    };

    const prompt = quickPrompts[analysisType];
    if (prompt) {
      setInput(prompt);
      await handleSubmit(new Event('submit') as any);
    }
  };

  const exportAnalysis = () => {
    const analysisText = messages
      .map(m => `${m.role === 'user' ? '질문' : '답변'}: ${m.content}`)
      .join('\n\n');
    
    const blob = new Blob([analysisText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data_analysis_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div
          {...getRootProps()}
          className={`w-full max-w-xl p-12 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg font-medium mb-2">
            {isDragActive ? '파일을 놓아주세요' : 'Excel 또는 CSV 파일을 드래그하거나 클릭하여 업로드'}
          </p>
          <p className="text-sm text-gray-500">지원 형식: .csv, .xls, .xlsx</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold">{file.name}</h3>
            <p className="text-sm text-gray-500">
              {data.length} 행 × {headers.length} 열
            </p>
          </div>
          <div className="space-x-2">
            <button
              onClick={exportAnalysis}
              disabled={messages.length <= 1}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              분석 내보내기
            </button>
            <button
              onClick={() => {
                setFile(null);
                setData([]);
                setHeaders([]);
                setMessages([]);
              }}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              새 데이터
            </button>
          </div>
        </div>
        
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickAnalysis('summary')}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            📊 요약 분석
          </button>
          <button
            onClick={() => handleQuickAnalysis('visualization')}
            className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
          >
            📈 시각화 제안
          </button>
          <button
            onClick={() => handleQuickAnalysis('anomalies')}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            🔍 이상치 탐지
          </button>
          <button
            onClick={() => handleQuickAnalysis('insights')}
            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            💡 인사이트 도출
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {processing && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">데이터를 처리하는 중...</p>
          </div>
        )}
        
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
      
      {data.length > 0 && (
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="데이터에 대해 질문하세요..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading || processing}
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || processing}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              전송
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default DataAnalyzer;