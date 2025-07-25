import React, { useState } from 'react';
import { createChatCompletion } from '../../utils/openai';

const TextTranslator: React.FC = () => {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [tone, setTone] = useState('formal');
  const [loading, setLoading] = useState(false);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ko', name: '한국어' },
    { code: 'ja', name: '日本語' },
    { code: 'zh', name: '中文' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
    { code: 'ru', name: 'Русский' },
    { code: 'ar', name: 'العربية' },
    { code: 'hi', name: 'हिन्दी' },
  ];

  const tones = [
    { value: 'formal', label: '공식적/격식있는' },
    { value: 'informal', label: '비공식적/친근한' },
    { value: 'professional', label: '전문적인' },
    { value: 'casual', label: '캐주얼한' },
    { value: 'academic', label: '학술적인' },
    { value: 'creative', label: '창의적인' },
  ];

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;

    setLoading(true);
    try {
      const response = await createChatCompletion([
        { 
          role: 'system', 
          content: `You are a professional translator. Translate the text to ${targetLanguage} with a ${tone} tone. 
          Maintain the original meaning while adapting the style to match the requested tone. 
          Only provide the translation without any explanations or notes.` 
        },
        { role: 'user', content: sourceText }
      ]);

      if (response) {
        setTranslatedText(response);
      }
    } catch (error) {
      console.error('Translation error:', error);
      setTranslatedText('번역 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    if (translatedText) {
      setSourceText(translatedText);
      setTranslatedText('');
    }
  };

  const handleCopy = () => {
    if (translatedText) {
      navigator.clipboard.writeText(translatedText);
      alert('번역된 텍스트가 복사되었습니다.');
    }
  };

  const handleClear = () => {
    setSourceText('');
    setTranslatedText('');
  };

  return (
    <div className="flex flex-col h-full p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">텍스트 번역</h2>
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
          >
            모두 지우기
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              번역할 언어
            </label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.name}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              번역 톤
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
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4">
        <div className="flex flex-col">
          <div className="mb-2 flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700">원본 텍스트</label>
            <span className="text-xs text-gray-500">{sourceText.length} 자</span>
          </div>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="번역할 텍스트를 입력하세요..."
            className="flex-1 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex flex-col">
          <div className="mb-2 flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700">번역된 텍스트</label>
            <div className="space-x-2">
              {translatedText && (
                <>
                  <button
                    onClick={handleCopy}
                    className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    복사
                  </button>
                  <button
                    onClick={handleSwap}
                    className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    바꾸기
                  </button>
                </>
              )}
            </div>
          </div>
          <textarea
            value={translatedText}
            readOnly
            placeholder="번역 결과가 여기에 표시됩니다..."
            className="flex-1 p-4 border rounded-lg bg-gray-50 resize-none"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={handleTranslate}
          disabled={loading || !sourceText.trim()}
          className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              번역 중...
            </div>
          ) : (
            '번역하기'
          )}
        </button>
      </div>
    </div>
  );
};

export default TextTranslator;