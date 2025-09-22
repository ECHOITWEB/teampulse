import React, { useState } from 'react';
import { Globe, Loader, X, Copy, ArrowLeftRight } from 'lucide-react';

const DocumentTranslator: React.FC = () => {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('ko');
  const [targetLang, setTargetLang] = useState('en');
  const [isTranslating, setIsTranslating] = useState(false);

  const languages = [
    { code: 'ko', name: '한국어' },
    { code: 'en', name: 'English' },
    { code: 'ja', name: '日本語' },
    { code: 'zh', name: '中文' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'vi', name: 'Tiếng Việt' }
  ];

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    
    setIsTranslating(true);
    try {
      // Simulate API call with mock translations
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockTranslations: Record<string, Record<string, string>> = {
        'ko': {
          'en': 'Hello, this is TeamPulse AI translation service.',
          'ja': 'こんにちは、これはTeamPulse AI翻訳サービスです。',
          'zh': '您好，这是TeamPulse AI翻译服务。'
        },
        'en': {
          'ko': '안녕하세요, TeamPulse AI 번역 서비스입니다.',
          'ja': 'こんにちは、TeamPulse AI翻訳サービスです。',
          'zh': '您好，这是TeamPulse AI翻译服务。'
        }
      };

      // Simple mock translation logic
      if (sourceText === '안녕하세요') {
        const translations: Record<string, string> = {
          'en': 'Hello',
          'ja': 'こんにちは',
          'zh': '你好',
          'es': 'Hola',
          'fr': 'Bonjour',
          'de': 'Hallo',
          'vi': 'Xin chào'
        };
        setTranslatedText(translations[targetLang] || `[Translated to ${targetLang}]`);
      } else if (sourceText.toLowerCase() === 'hello') {
        const translations: Record<string, string> = {
          'ko': '안녕하세요',
          'ja': 'こんにちは',
          'zh': '你好',
          'es': 'Hola',
          'fr': 'Bonjour',
          'de': 'Hallo',
          'vi': 'Xin chào'
        };
        setTranslatedText(translations[targetLang] || `[Translated to ${targetLang}]`);
      } else {
        // Generic translation simulation
        setTranslatedText(`[${languages.find(l => l.code === targetLang)?.name}]: ${sourceText}`);
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSwapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const handleClear = () => {
    setSourceText('');
    setTranslatedText('');
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Language Selector Bar */}
      <div className="flex items-center justify-between mb-6 bg-gray-50 rounded-xl p-4">
        <select
          value={sourceLang}
          onChange={(e) => setSourceLang(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {languages.map(lang => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </select>
        
        <button
          onClick={handleSwapLanguages}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          title="언어 바꾸기"
        >
          <ArrowLeftRight className="w-5 h-5 text-gray-600" />
        </button>
        
        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {languages.map(lang => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </select>
      </div>

      {/* Translation Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Source Text */}
        <div className="relative">
          <div className="absolute top-3 left-3 text-sm text-gray-500">
            {languages.find(l => l.code === sourceLang)?.name}
          </div>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="번역할 텍스트를 입력하세요..."
            className="w-full h-64 p-4 pt-10 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            maxLength={5000}
          />
          <div className="absolute bottom-3 right-3 flex gap-2">
            {sourceText && (
              <button
                onClick={handleClear}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="지우기"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <div className="text-sm text-gray-400">
              {sourceText.length} / 5000
            </div>
          </div>
        </div>

        {/* Translated Text */}
        <div className="relative">
          <div className="absolute top-3 left-3 text-sm text-gray-500">
            {languages.find(l => l.code === targetLang)?.name}
          </div>
          <div className="w-full h-64 p-4 pt-10 border border-gray-300 rounded-xl bg-gray-50 overflow-y-auto text-lg">
            {isTranslating ? (
              <div className="flex items-center justify-center h-full">
                <Loader className="w-6 h-6 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-500">번역 중...</span>
              </div>
            ) : (
              <div className="whitespace-pre-wrap">
                {translatedText || <span className="text-gray-400">번역 결과가 여기에 표시됩니다</span>}
              </div>
            )}
          </div>
          {translatedText && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(translatedText);
                // Simple notification instead of alert
                const btn = document.getElementById('copy-btn');
                if (btn) btn.textContent = '복사됨!';
                setTimeout(() => {
                  if (btn) btn.textContent = '';
                }, 2000);
              }}
              className="absolute bottom-3 right-3 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="복사"
            >
              <Copy className="w-5 h-5" />
              <span id="copy-btn" className="text-xs"></span>
            </button>
          )}
        </div>
      </div>

      {/* Translate Button */}
      <div className="flex justify-center mt-6">
        <button
          onClick={handleTranslate}
          disabled={!sourceText.trim() || isTranslating}
          className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
        >
          {isTranslating ? (
            <span className="flex items-center">
              <Loader className="w-5 h-5 animate-spin mr-2" />
              번역 중...
            </span>
          ) : (
            <span className="flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              번역하기
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default DocumentTranslator;