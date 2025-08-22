import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, FileText, Globe, Sparkles, Mic, PlayCircle, StopCircle, CheckCircle2, Loader } from 'lucide-react';

type AIToolType = 'meeting' | 'translate' | 'analyze';

interface TranscriptLine {
  id: string;
  speaker: string;
  text: string;
  timestamp: string;
}

const AIToolsPreview: React.FC = () => {
  const [activeTool, setActiveTool] = useState<AIToolType>('meeting');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Meeting Assistant States
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(0);

  // Translation States
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [targetLang, setTargetLang] = useState('en');

  // Data Analysis States
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const speakers = ['김대표', '박팀장', '이매니저', 'AI 어시스턴트'];
  
  const meetingScript = [
    { speaker: '김대표', text: '이번 분기 실적을 검토해보겠습니다.' },
    { speaker: '박팀장', text: '매출이 전분기 대비 15% 증가했습니다.' },
    { speaker: '이매니저', text: '신규 고객 확보가 주요 성장 동력이었습니다.' },
    { speaker: '김대표', text: '다음 분기 목표는 어떻게 설정할까요?' },
    { speaker: 'AI 어시스턴트', text: '현재 성장 추세를 기반으로 20% 성장을 제안드립니다.' }
  ];

  const sampleDocuments = {
    ko: '안녕하세요. TeamPulse는 AI 기반 협업 플랫폼으로 팀의 생산성을 극대화합니다. 실시간 번역, 스마트 회의 도우미, 데이터 분석 등 다양한 AI 기능을 제공합니다.',
    translated: {
      en: 'Hello. TeamPulse is an AI-powered collaboration platform that maximizes team productivity. It offers various AI features including real-time translation, smart meeting assistant, and data analysis.',
      ja: 'こんにちは。TeamPulseは、チームの生産性を最大化するAI基盤のコラボレーションプラットフォームです。リアルタイム翻訳、スマートミーティングアシスタント、データ分析など、さまざまなAI機能を提供します。',
      zh: '您好。TeamPulse是一个基于AI的协作平台，可最大限度地提高团队生产力。它提供各种AI功能，包括实时翻译、智能会议助手和数据分析。'
    }
  };

  // Meeting Recording Simulation
  useEffect(() => {
    if (isRecording && activeTool === 'meeting') {
      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);

      const scriptInterval = setInterval(() => {
        if (currentSpeaker < meetingScript.length) {
          const newLine: TranscriptLine = {
            id: `line-${currentSpeaker}`,
            speaker: meetingScript[currentSpeaker].speaker,
            text: meetingScript[currentSpeaker].text,
            timestamp: formatTime(elapsedTime)
          };
          setTranscript(prev => [...prev, newLine]);
          setCurrentSpeaker(prev => prev + 1);
        } else {
          setIsRecording(false);
          setTimeout(() => {
            setIsProcessing(true);
            setTimeout(() => {
              setIsProcessing(false);
              setShowResult(true);
            }, 2000);
          }, 1000);
        }
      }, 2500);

      return () => {
        clearInterval(interval);
        clearInterval(scriptInterval);
      };
    }
  }, [isRecording, currentSpeaker, elapsedTime, activeTool]);

  // Data Analysis Progress Simulation
  useEffect(() => {
    if (isProcessing && activeTool === 'analyze') {
      const interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 100) {
            setIsProcessing(false);
            setShowResult(true);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      return () => clearInterval(interval);
    }
  }, [isProcessing, activeTool]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToolSwitch = (tool: AIToolType) => {
    setActiveTool(tool);
    setIsProcessing(false);
    setShowResult(false);
    setIsRecording(false);
    setTranscript([]);
    setCurrentSpeaker(0);
    setElapsedTime(0);
    setAnalysisProgress(0);
    setSourceText('');
    setTranslatedText('');
  };

  const handleTranslate = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setTranslatedText(sampleDocuments.translated[targetLang as keyof typeof sampleDocuments.translated]);
      setIsProcessing(false);
      setShowResult(true);
    }, 1500);
  };

  const handleAnalyze = () => {
    setIsProcessing(true);
    setAnalysisProgress(0);
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 shadow-lg">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">AI 도구 체험</h3>
        <p className="text-gray-600">팀 업무를 혁신하는 강력한 AI 기능들을 경험해보세요</p>
      </div>

      {/* Tool Selector */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'meeting', icon: Mic, label: 'Smart Meeting Assistant' },
          { id: 'translate', icon: Globe, label: '문서 번역' },
          { id: 'analyze', icon: Brain, label: '데이터 분석' }
        ].map((tool) => (
          <motion.button
            key={tool.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleToolSwitch(tool.id as AIToolType)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTool === tool.id
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <tool.icon className="w-4 h-4" />
            {tool.label}
          </motion.button>
        ))}
      </div>

      {/* Tool Content */}
      <AnimatePresence mode="wait">
        {activeTool === 'meeting' && (
          <motion.div
            key="meeting"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-lg p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">회의 실시간 기록</h4>
              <div className="flex items-center gap-3">
                {isRecording && (
                  <span className="text-sm font-mono text-red-600">{formatTime(elapsedTime)}</span>
                )}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    if (!isRecording && !showResult) {
                      setIsRecording(true);
                      setTranscript([]);
                      setCurrentSpeaker(0);
                      setElapsedTime(0);
                    } else {
                      setIsRecording(false);
                    }
                  }}
                  disabled={showResult}
                  className={`p-3 rounded-full transition-colors ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isRecording ? <StopCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                </motion.button>
              </div>
            </div>

            {/* Transcript */}
            <div className="h-64 overflow-y-auto bg-gray-50 rounded-lg p-4 mb-4">
              {transcript.length === 0 && !isRecording && (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p>녹음 버튼을 눌러 회의를 시작하세요</p>
                </div>
              )}
              <AnimatePresence>
                {transcript.map((line, index) => (
                  <motion.div
                    key={line.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="mb-3"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-500 font-mono">{line.timestamp}</span>
                      <div>
                        <span className={`font-medium ${
                          line.speaker === 'AI 어시스턴트' ? 'text-purple-600' : 'text-gray-900'
                        }`}>
                          {line.speaker}:
                        </span>
                        <span className="ml-2 text-gray-700">{line.text}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* AI Summary */}
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-purple-50 rounded-lg p-4 flex items-center gap-3"
              >
                <Loader className="w-5 h-5 text-purple-600 animate-spin" />
                <span className="text-purple-700">AI가 회의 내용을 분석하고 있습니다...</span>
              </motion.div>
            )}

            {showResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4"
              >
                <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  AI 회의 요약
                </h5>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>이번 분기 매출 15% 성장 달성</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>신규 고객 확보가 주요 성장 동력</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>다음 분기 20% 성장 목표 설정 제안</span>
                  </li>
                </ul>
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTool === 'translate' && (
          <motion.div
            key="translate"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-lg p-6 shadow-sm"
          >
            <div className="mb-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">문서 번역</h4>
              <div className="flex gap-2 mb-4">
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="en">영어</option>
                  <option value="ja">일본어</option>
                  <option value="zh">중국어</option>
                </select>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">원본 텍스트</label>
                  <textarea
                    value={sourceText || sampleDocuments.ko}
                    onChange={(e) => setSourceText(e.target.value)}
                    className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="번역할 텍스트를 입력하세요..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">번역 결과</label>
                  <div className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 overflow-y-auto">
                    {isProcessing ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader className="w-6 h-6 text-purple-600 animate-spin" />
                      </div>
                    ) : translatedText ? (
                      <p className="text-gray-700">{translatedText}</p>
                    ) : (
                      <p className="text-gray-400">번역 결과가 여기에 표시됩니다</p>
                    )}
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleTranslate}
                disabled={isProcessing}
                className="mt-4 w-full px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {isProcessing ? '번역 중...' : '번역하기'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {activeTool === 'analyze' && (
          <motion.div
            key="analyze"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-lg p-6 shadow-sm"
          >
            <div className="mb-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">데이터 분석 도우미</h4>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700 mb-3">
                  판매 데이터를 AI가 자동으로 분석하여 인사이트를 제공합니다
                </p>
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium">sales_data_2024.csv</span>
                  <span className="text-xs text-gray-500">(2.3MB)</span>
                </div>
              </div>

              {!showResult && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAnalyze}
                  disabled={isProcessing}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? '분석 중...' : '데이터 분석 시작'}
                </motion.button>
              )}

              {isProcessing && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">분석 진행률</span>
                    <span className="text-sm text-gray-600">{analysisProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${analysisProgress}%` }}
                      className="h-full bg-purple-600"
                    />
                  </div>
                </div>
              )}

              {showResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 mt-4"
                >
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                    <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-600" />
                      AI 분석 결과
                    </h5>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-white rounded-lg p-3">
                        <div className="text-2xl font-bold text-gray-900">+23%</div>
                        <div className="text-sm text-gray-600">전월 대비 성장률</div>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <div className="text-2xl font-bold text-gray-900">₩2.3B</div>
                        <div className="text-sm text-gray-600">예상 분기 매출</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h6 className="font-medium text-gray-900">주요 인사이트:</h6>
                      <ul className="space-y-1 text-sm text-gray-700">
                        <li className="flex items-start gap-2">
                          <span className="text-purple-600">•</span>
                          주말 판매량이 평일 대비 45% 높음
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-600">•</span>
                          20-30대 고객층이 전체 매출의 62% 차지
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-600">•</span>
                          모바일 구매 비중이 지속적으로 증가 (현재 78%)
                        </li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIToolsPreview;