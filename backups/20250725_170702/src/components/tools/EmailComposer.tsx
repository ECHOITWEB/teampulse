import React, { useState } from 'react';
import { createChatCompletion } from '../../utils/openai';

interface EmailTemplate {
  type: string;
  label: string;
  icon: string;
}

const EmailComposer: React.FC = () => {
  const [purpose, setPurpose] = useState('');
  const [keyPoints, setKeyPoints] = useState('');
  const [recipient, setRecipient] = useState('');
  const [tone, setTone] = useState('professional');
  const [emailDraft, setEmailDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const templates: EmailTemplate[] = [
    { type: 'meeting', label: '미팅 요청', icon: '📅' },
    { type: 'followup', label: '후속 조치', icon: '📧' },
    { type: 'proposal', label: '제안서', icon: '📋' },
    { type: 'apology', label: '사과', icon: '🙏' },
    { type: 'thank', label: '감사', icon: '🙏' },
    { type: 'introduction', label: '자기소개', icon: '👋' },
    { type: 'rejection', label: '거절', icon: '❌' },
    { type: 'inquiry', label: '문의', icon: '❓' },
  ];

  const tones = [
    { value: 'professional', label: '전문적' },
    { value: 'friendly', label: '친근한' },
    { value: 'formal', label: '격식있는' },
    { value: 'casual', label: '캐주얼한' },
    { value: 'urgent', label: '긴급한' },
    { value: 'persuasive', label: '설득적인' },
  ];

  const handleGenerateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose.trim() || !keyPoints.trim()) return;

    setLoading(true);
    try {
      const response = await createChatCompletion([
        { 
          role: 'system', 
          content: `You are a professional email writer. Write emails in Korean with the following characteristics:
          - Tone: ${tone}
          - Include proper greeting and closing
          - Be concise but complete
          - Use appropriate business etiquette
          ${selectedTemplate ? `- This is a ${selectedTemplate} email` : ''}
          
          Structure:
          1. 제목: [Subject line]
          2. 본문: [Email body with proper formatting]` 
        },
        { 
          role: 'user', 
          content: `Write an email with the following details:
          Purpose: ${purpose}
          Key points to include: ${keyPoints}
          Recipient: ${recipient || '수신자'}
          ${selectedTemplate ? `Template type: ${selectedTemplate}` : ''}` 
        }
      ]);

      if (response) {
        setEmailDraft(response);
      }
    } catch (error) {
      console.error('Error:', error);
      setEmailDraft('이메일 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEmail = () => {
    if (emailDraft) {
      navigator.clipboard.writeText(emailDraft);
      alert('이메일이 클립보드에 복사되었습니다.');
    }
  };

  const handleReset = () => {
    setPurpose('');
    setKeyPoints('');
    setRecipient('');
    setTone('professional');
    setEmailDraft('');
    setSelectedTemplate('');
  };

  if (emailDraft) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">생성된 이메일</h3>
            <div className="space-x-2">
              <button
                onClick={handleCopyEmail}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                복사하기
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                새로 작성
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <pre className="whitespace-pre-wrap font-sans text-gray-800">
                {emailDraft}
              </pre>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 팁: 생성된 이메일을 기반으로 필요에 따라 수정하여 사용하세요.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full">
        <h2 className="text-2xl font-bold mb-6">이메일 작성 도우미</h2>
        
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">템플릿 선택 (선택사항)</h3>
          <div className="grid grid-cols-4 gap-2">
            {templates.map((template) => (
              <button
                key={template.type}
                onClick={() => setSelectedTemplate(template.type === selectedTemplate ? '' : template.type)}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  selectedTemplate === template.type
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">{template.icon}</div>
                <div className="text-xs">{template.label}</div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleGenerateEmail} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이메일 목적 *
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="예: 프로젝트 진행 상황 업데이트, 미팅 일정 조율"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              포함할 주요 내용 *
            </label>
            <textarea
              value={keyPoints}
              onChange={(e) => setKeyPoints(e.target.value)}
              placeholder="예: 
- 프로젝트 현재 진행률 80%
- 다음 주 화요일까지 완료 예정
- 추가 리소스 필요 여부 논의"
              className="w-full h-32 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                수신자 (선택사항)
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="예: 김부장님, 마케팅팀"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                톤 선택
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {tones.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !purpose.trim() || !keyPoints.trim()}
            className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                이메일 생성 중...
              </div>
            ) : (
              '이메일 생성하기'
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">작성 팁:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 목적을 명확하게 작성하면 더 적절한 이메일이 생성됩니다</li>
            <li>• 주요 내용은 구체적으로 작성해주세요</li>
            <li>• 생성된 이메일은 검토 후 필요에 따라 수정하여 사용하세요</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EmailComposer;