import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { createChatCompletion } from '../../utils/openai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { parsePDFLocally } from '../../utils/pdfParser';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const DocumentReview: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);


  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile && uploadedFile.type === 'application/pdf') {
      setFile(uploadedFile);
      setExtracting(true);
      
      try {
        const result = await parsePDFLocally(uploadedFile);
        const text = result.text;
        setDocumentContent(text);
        setMessages([{
          role: 'assistant',
          content: `문서가 성공적으로 업로드되었습니다.\n\n📄 파일명: ${uploadedFile.name}\n📊 크기: ${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB\n📝 텍스트 길이: ${text.length.toLocaleString()} 자\n\n문서에 대해 궁금한 점을 질문해주세요. 예를 들어:\n- 문서의 주요 내용을 요약해주세요\n- 특정 주제에 대해 설명해주세요\n- 핵심 포인트를 정리해주세요`
        }]);
      } catch (error) {
        console.error('PDF 텍스트 추출 오류:', error);
        setMessages([{
          role: 'assistant',
          content: '문서 처리 중 오류가 발생했습니다. 다시 시도해주세요.'
        }]);
      } finally {
        setExtracting(false);
      }
    } else {
      setMessages([{
        role: 'assistant',
        content: 'PDF 파일만 업로드 가능합니다.'
      }]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !documentContent) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await createChatCompletion([
        { 
          role: 'system', 
          content: `You are a professional document analysis assistant. You have access to a document and should provide detailed, accurate answers in Korean. 
          
          When answering:
          1. Be specific and cite relevant parts of the document
          2. Provide structured responses with clear sections when appropriate
          3. If asked for a summary, include key points, main ideas, and conclusions
          4. Use bullet points or numbered lists for clarity
          5. Always respond in Korean
          
          Document content:
          ${documentContent.substring(0, 15000)}
          
          ${documentContent.length > 15000 ? '\n[참고: 문서가 길어 일부만 분석에 사용됩니다. 특정 부분에 대해 질문하시면 더 자세히 답변드리겠습니다.]' : ''}` 
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
        content: '죄송합니다. 응답 생성 중 오류가 발생했습니다.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!documentContent) return;
    
    setLoading(true);
    const summaryRequest = '이 문서의 주요 내용을 체계적으로 요약해주세요.';
    setMessages(prev => [...prev, { role: 'user', content: summaryRequest }]);

    try {
      const response = await createChatCompletion([
        { 
          role: 'system', 
          content: `You are a professional document analyst. Create a comprehensive summary in Korean with the following structure:
          
          1. 📋 개요 (Overview)
          2. 🎯 주요 내용 (Key Points) - Use bullet points
          3. 💡 핵심 인사이트 (Key Insights)
          4. 📌 결론 및 시사점 (Conclusions & Implications)
          
          Be concise but thorough. Use clear Korean language.
          
          Document content:
          ${documentContent.substring(0, 15000)}` 
        },
        { role: 'user', content: summaryRequest }
      ]);

      if (response) {
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '요약 생성 중 오류가 발생했습니다.' 
      }]);
    } finally {
      setLoading(false);
    }
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-lg font-medium mb-2">
            {isDragActive ? 'PDF 파일을 놓아주세요' : 'PDF 파일을 드래그하거나 클릭하여 업로드'}
          </p>
          <p className="text-sm text-gray-500">PDF 파일만 지원됩니다</p>
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
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <div className="space-x-2">
            <button
              onClick={handleSummarize}
              disabled={loading || extracting}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              📝 요약하기
            </button>
            <button
              onClick={async () => {
                if (!documentContent) return;
                setLoading(true);
                const analysisRequest = '이 문서의 주요 키워드와 주제를 분석해주세요.';
                setMessages(prev => [...prev, { role: 'user', content: analysisRequest }]);
                
                try {
                  const response = await createChatCompletion([
                    { 
                      role: 'system', 
                      content: `Analyze the document and extract key themes and keywords in Korean. Format:
                      1. 🏷️ 주요 키워드 (5-10개)
                      2. 📊 주제 분석
                      3. 🔍 문서 유형 및 특징
                      
                      Document content:
                      ${documentContent.substring(0, 15000)}` 
                    },
                    { role: 'user', content: analysisRequest }
                  ]);
                  if (response) {
                    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
                  }
                } catch (error) {
                  console.error('Error:', error);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || extracting}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              🔍 분석하기
            </button>
            <button
              onClick={() => {
                setFile(null);
                setDocumentContent('');
                setMessages([]);
              }}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              새 문서
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {extracting && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">문서를 처리하는 중...</p>
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
      
      {documentContent && (
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="문서에 대해 질문하세요..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading || extracting}
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || extracting}
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

export default DocumentReview;