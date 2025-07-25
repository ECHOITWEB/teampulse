import React, { useState, useEffect } from 'react';
import { createChatCompletion, createStructuredCompletion } from '../../utils/openai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { z } from 'zod';

// 슬라이드 스키마 정의
const SlideSchema = z.object({
  slideNumber: z.number(),
  title: z.string(),
  subtitle: z.string().optional(),
  mainPoints: z.array(z.string()),
  visualSuggestion: z.string(),
  speakerNotes: z.string(),
  layout: z.enum(['title', 'content', 'comparison', 'image-focus', 'conclusion'])
});

const PresentationSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  targetAudience: z.string(),
  duration: z.string(),
  slides: z.array(SlideSchema)
});

type Slide = z.infer<typeof SlideSchema>;
type Presentation = z.infer<typeof PresentationSchema>;

const PowerPointPlanner: React.FC = () => {
  const [businessContent, setBusinessContent] = useState('');
  const [presentationPlan, setPresentationPlan] = useState('');
  const [structuredPresentation, setStructuredPresentation] = useState<Presentation | null>(null);
  const [selectedSlide, setSelectedSlide] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [additionalRequests, setAdditionalRequests] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'detail'>('grid');

  const handlePlanGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessContent.trim()) return;

    setLoading(true);
    try {
      // 먼저 구조화된 데이터로 프레젠테이션 생성
      const structuredPlan = await createStructuredCompletion<Presentation>(
        [
          { 
            role: 'user', 
            content: `Create a professional PowerPoint presentation plan for the following business content. 
            The presentation should have 10-15 slides with diverse layouts.
            
            Business content: ${businessContent}
            ${additionalRequests ? `Additional requirements: ${additionalRequests}` : ''}
            
            Create a detailed plan with specific content for each slide.` 
          }
        ],
        PresentationSchema,
        'presentation'
      );

      if (structuredPlan) {
        setStructuredPresentation(structuredPlan);
        
        // 마크다운 형식의 상세 설명도 생성
        const detailedResponse = await createChatCompletion([
          { 
            role: 'system', 
            content: `You are a professional presentation designer. Based on the structured presentation plan, 
            create a detailed explanation in Korean including:
            1. 프레젠테이션 개요
            2. 각 슬라이드의 상세 설명
            3. 디자인 및 시각화 가이드
            4. 발표 전략 및 팁
            5. 예상 Q&A
            
            Use markdown formatting with emojis for better readability.` 
          },
          { 
            role: 'user', 
            content: `Here is the presentation structure: ${JSON.stringify(structuredPlan, null, 2)}` 
          }
        ]);

        if (detailedResponse) {
          setPresentationPlan(detailedResponse);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setPresentationPlan('프레젠테이션 기획 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!presentationPlan || !additionalRequests.trim()) return;

    setLoading(true);
    try {
      const response = await createChatCompletion([
        { 
          role: 'system', 
          content: 'You are a professional presentation designer. Refine the existing presentation plan based on additional feedback.' 
        },
        { 
          role: 'user', 
          content: `기존 프레젠테이션 기획:\n${presentationPlan}\n\n수정 요청사항: ${additionalRequests}` 
        }
      ]);

      if (response) {
        setPresentationPlan(response);
        setAdditionalRequests('');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAsText = () => {
    let content = presentationPlan;
    
    if (structuredPresentation) {
      content = `# ${structuredPresentation.title}\n## ${structuredPresentation.subtitle}\n\n`;
      content += `타겟 청중: ${structuredPresentation.targetAudience}\n`;
      content += `예상 시간: ${structuredPresentation.duration}\n\n`;
      
      structuredPresentation.slides.forEach(slide => {
        content += `### Slide ${slide.slideNumber}: ${slide.title}\n`;
        if (slide.subtitle) content += `#### ${slide.subtitle}\n`;
        content += `\n**주요 내용:**\n`;
        slide.mainPoints.forEach(point => {
          content += `- ${point}\n`;
        });
        content += `\n**시각적 제안:** ${slide.visualSuggestion}\n`;
        content += `**발표자 노트:** ${slide.speakerNotes}\n\n`;
      });
      
      content += `\n---\n\n${presentationPlan}`;
    }
    
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = 'presentation_plan.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getSlideIcon = (layout: string) => {
    switch (layout) {
      case 'title': return '🏠';
      case 'content': return '📄';
      case 'comparison': return '⚖️';
      case 'image-focus': return '🎨';
      case 'conclusion': return '🎯';
      default: return '📄';
    }
  };

  const getLayoutColor = (layout: string) => {
    switch (layout) {
      case 'title': return 'bg-purple-100 border-purple-300';
      case 'content': return 'bg-blue-100 border-blue-300';
      case 'comparison': return 'bg-green-100 border-green-300';
      case 'image-focus': return 'bg-yellow-100 border-yellow-300';
      case 'conclusion': return 'bg-red-100 border-red-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  if (!presentationPlan) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3">📊 파워포인트 기획 도구</h2>
            <p className="text-gray-600">비즈니스 내용을 입력하면 전문적인 프레젠테이션 구성을 제안해드립니다</p>
          </div>
          
          <form onSubmit={handlePlanGeneration} className="bg-white rounded-xl shadow-lg p-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📈 사업 내용 입력
              </label>
              <textarea
                value={businessContent}
                onChange={(e) => setBusinessContent(e.target.value)}
                placeholder="프레젠테이션으로 만들고 싶은 사업 내용을 자세히 입력해주세요.

예시:
• 회사 비전과 미션
• 주요 제품/서비스 소개
• 시장 현황 및 경쟁 분석
• 사업 전략 및 로드맵
• 예상 성과 및 기대 효과"
                className="w-full h-56 px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🎯 대상 청중
                </label>
                <input
                  type="text"
                  placeholder="예: 투자자, 고객사, 내부 직원"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ⏱️ 발표 시간
                </label>
                <input
                  type="text"
                  placeholder="예: 10분, 20분, 30분"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ✨ 추가 요구사항
              </label>
              <input
                type="text"
                value={additionalRequests}
                onChange={(e) => setAdditionalRequests(e.target.value)}
                placeholder="예: 미니멀한 디자인, 차트 위주, 스토리텔링 형식"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !businessContent.trim()}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium shadow-lg transition-all"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  AI가 프레젠테이션을 기획하고 있습니다...
                </div>
              ) : (
                '🚀 프레젠테이션 기획 생성하기'
              )}
            </button>
          </form>
          
          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl mb-2">📊</div>
              <div className="text-sm font-medium">10-15 슬라이드</div>
              <div className="text-xs text-gray-500">체계적인 구성</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl mb-2">🎨</div>
              <div className="text-sm font-medium">시각적 제안</div>
              <div className="text-xs text-gray-500">차트, 그래프, 이미지</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl mb-2">💡</div>
              <div className="text-sm font-medium">발표 팁</div>
              <div className="text-xs text-gray-500">전문가 노하우</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 헤더 */}
      <div className="p-4 bg-white border-b shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold flex items-center">
              📊 {structuredPresentation?.title || '프레젠테이션 기획'}
            </h3>
            {structuredPresentation && (
              <p className="text-sm text-gray-600 mt-1">
                {structuredPresentation.targetAudience} · {structuredPresentation.duration} · 
                {structuredPresentation.slides.length} 슬라이드
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {structuredPresentation && (
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
                >
                  📁 그리드
                </button>
                <button
                  onClick={() => setViewMode('detail')}
                  className={`px-3 py-1 rounded ${viewMode === 'detail' ? 'bg-white shadow-sm' : ''}`}
                >
                  📋 상세
                </button>
              </div>
            )}
            <button
              onClick={handleDownloadAsText}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center"
            >
              📥 다운로드
            </button>
            <button
              onClick={() => {
                setPresentationPlan('');
                setStructuredPresentation(null);
                setBusinessContent('');
                setAdditionalRequests('');
              }}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              ✖️ 초기화
            </button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 overflow-hidden flex">
        {/* 슬라이드 미리보기 */}
        {structuredPresentation && viewMode === 'grid' && (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {structuredPresentation.slides.map((slide, index) => (
                <div
                  key={slide.slideNumber}
                  onClick={() => {
                    setSelectedSlide(index);
                    setViewMode('detail');
                  }}
                  className={`cursor-pointer transform transition-all hover:scale-105 ${
                    selectedSlide === index ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className={`border-2 rounded-lg overflow-hidden ${getLayoutColor(slide.layout)}`}>
                    {/* 슬라이드 미리보기 */}
                    <div className="bg-white p-4 h-48 flex flex-col">
                      <div className="text-xs text-gray-500 mb-2">
                        Slide {slide.slideNumber} · {getSlideIcon(slide.layout)}
                      </div>
                      <h4 className="font-bold text-sm mb-2 line-clamp-2">{slide.title}</h4>
                      {slide.subtitle && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-1">{slide.subtitle}</p>
                      )}
                      <div className="flex-1 overflow-hidden">
                        <ul className="text-xs space-y-1">
                          {slide.mainPoints.slice(0, 3).map((point, i) => (
                            <li key={i} className="truncate">• {point}</li>
                          ))}
                          {slide.mainPoints.length > 3 && (
                            <li className="text-gray-400">+{slide.mainPoints.length - 3} more...</li>
                          )}
                        </ul>
                      </div>
                    </div>
                    <div className="bg-gray-100 px-4 py-2">
                      <p className="text-xs text-gray-600 truncate">
                        🎨 {slide.visualSuggestion}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 상세 보기 */}
        {((structuredPresentation && viewMode === 'detail') || !structuredPresentation) && (
          <div className="flex-1 flex">
            {/* 슬라이드 네비게이션 */}
            {structuredPresentation && (
              <div className="w-64 bg-white border-r overflow-y-auto">
                <div className="p-4">
                  <h4 className="font-semibold mb-3">슬라이드 목록</h4>
                  <div className="space-y-2">
                    {structuredPresentation.slides.map((slide, index) => (
                      <button
                        key={slide.slideNumber}
                        onClick={() => setSelectedSlide(index)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedSlide === index
                            ? 'bg-blue-50 border-blue-200 border'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          <span className="text-lg">{getSlideIcon(slide.layout)}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium line-clamp-1">
                              {slide.slideNumber}. {slide.title}
                            </p>
                            <p className="text-xs text-gray-500">{slide.layout}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 콘텐츠 영역 */}
            <div className="flex-1 overflow-y-auto">
              {structuredPresentation && structuredPresentation.slides[selectedSlide] ? (
                <div className="p-6">
                  {/* 현재 슬라이드 상세 */}
                  <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold">
                          Slide {structuredPresentation.slides[selectedSlide].slideNumber}: 
                          {structuredPresentation.slides[selectedSlide].title}
                        </h2>
                        <span className="text-2xl">
                          {getSlideIcon(structuredPresentation.slides[selectedSlide].layout)}
                        </span>
                      </div>
                      {structuredPresentation.slides[selectedSlide].subtitle && (
                        <p className="text-lg text-gray-600">
                          {structuredPresentation.slides[selectedSlide].subtitle}
                        </p>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center">
                          📌 주요 내용
                        </h3>
                        <ul className="space-y-2">
                          {structuredPresentation.slides[selectedSlide].mainPoints.map((point, i) => (
                            <li key={i} className="flex items-start">
                              <span className="text-blue-500 mr-2">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold mb-2 flex items-center">
                            🎨 시각적 제안
                          </h3>
                          <p className="text-gray-700 bg-gray-50 rounded-lg p-3">
                            {structuredPresentation.slides[selectedSlide].visualSuggestion}
                          </p>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2 flex items-center">
                            🗣️ 발표자 노트
                          </h3>
                          <p className="text-gray-700 bg-yellow-50 rounded-lg p-3">
                            {structuredPresentation.slides[selectedSlide].speakerNotes}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 네비게이션 버튼 */}
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => setSelectedSlide(Math.max(0, selectedSlide - 1))}
                      disabled={selectedSlide === 0}
                      className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ← 이전 슬라이드
                    </button>
                    <span className="text-gray-600">
                      {selectedSlide + 1} / {structuredPresentation.slides.length}
                    </span>
                    <button
                      onClick={() => setSelectedSlide(Math.min(structuredPresentation.slides.length - 1, selectedSlide + 1))}
                      disabled={selectedSlide === structuredPresentation.slides.length - 1}
                      className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      다음 슬라이드 →
                    </button>
                  </div>
                </div>
              ) : (
                /* 전체 기획 보기 */
                <div className="p-6">
                  <div className="bg-white rounded-lg shadow-sm p-8">
                    <div className="prose prose-lg max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {presentationPlan}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 하단 수정 바 */}
      <div className="p-4 bg-white border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={additionalRequests}
            onChange={(e) => setAdditionalRequests(e.target.value)}
            placeholder="수정하고 싶은 부분이 있으면 입력하세요..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleRefine}
            disabled={loading || !additionalRequests.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔄 수정 요청
          </button>
        </div>
      </div>
    </div>
  );
};

export default PowerPointPlanner;