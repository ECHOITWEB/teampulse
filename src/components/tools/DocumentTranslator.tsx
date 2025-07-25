import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { createChatCompletion } from '../../utils/openai';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { extractTextFromPDF } from '../../utils/pdfParser';

const DocumentTranslator: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [translating, setTranslating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [translatedUrl, setTranslatedUrl] = useState<string | null>(null);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ko', name: '한국어' },
    { code: 'ja', name: '日本語' },
    { code: 'zh', name: '中文' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
  ];

  interface ExtractedPage {
    pageNumber: number;
    content: string;
    sections: Array<{
      text: string;
      isTitle?: boolean;
      isBullet?: boolean;
      indent?: number;
    }>;
  }

  const extractStructuredTextFromPDF = async (file: File): Promise<ExtractedPage[]> => {
    try {
      const fullText = await extractTextFromPDF(file);
      
      // 텍스트를 페이지별로 분할 (간단한 휴리스틱)
      const pages = fullText.split('\n\n').filter(p => p.trim());
      
      return pages.map((pageText, index) => {
        const lines = pageText.split('\n').filter(l => l.trim());
        const sections = lines.map(line => {
          // 제목 감지 (대문자로 시작하고 짧은 문장)
          const isTitle = line.length < 50 && /^[A-Z가-힣]/.test(line);
          // 불릿 포인트 감지
          const isBullet = /^[•\-*\d+\.]/.test(line.trim());
          // 들여쓰기 감지
          const indent = line.length - line.trimStart().length;
          
          return {
            text: line.trim(),
            isTitle,
            isBullet,
            indent: Math.floor(indent / 2)
          };
        });
        
        return {
          pageNumber: index + 1,
          content: pageText,
          sections
        };
      });
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw error;
    }
  };

  const translateText = async (text: string, targetLang: string, isTitle: boolean = false) => {
    const response = await createChatCompletion([
      { 
        role: 'system', 
        content: `You are a professional translator. Translate the following text to ${targetLang}. 
        ${isTitle ? 'This is a title/heading, so keep it concise and impactful.' : ''}
        Maintain the original meaning, tone, and formatting. 
        Only respond with the translation, no explanations.` 
      },
      { role: 'user', content: text }
    ]);
    return response || text;
  };

  const translateStructuredPages = async (pages: ExtractedPage[], targetLang: string) => {
    const translatedPages = [];
    
    for (const page of pages) {
      setProgress(Math.round((page.pageNumber / pages.length) * 100));
      
      const translatedSections = [];
      for (const section of page.sections) {
        const translatedText = await translateText(section.text, targetLang, section.isTitle);
        translatedSections.push({
          ...section,
          text: translatedText
        });
      }
      
      translatedPages.push({
        ...page,
        sections: translatedSections
      });
    }
    
    return translatedPages;
  };

  const createTranslatedPDF = async (translatedPages: ExtractedPage[]) => {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    for (const pageData of translatedPages) {
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      let yPosition = height - 50;
      
      for (const section of pageData.sections) {
        const fontSize = section.isTitle ? 16 : 12;
        const selectedFont = section.isTitle ? boldFont : font;
        const xPosition = 50 + (section.indent || 0) * 20;
        
        // 긴 텍스트를 여러 줄로 나누기
        const maxWidth = width - xPosition - 50;
        const words = section.text.split(' ');
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const textWidth = selectedFont.widthOfTextAtSize(testLine, fontSize);
          
          if (textWidth > maxWidth && currentLine) {
            // 현재 줄 그리기
            page.drawText(currentLine, {
              x: xPosition,
              y: yPosition,
              size: fontSize,
              font: selectedFont,
              color: rgb(0, 0, 0),
            });
            yPosition -= fontSize + 5;
            currentLine = word;
            
            // 페이지 넘침 처리
            if (yPosition < 50) {
              const newPage = pdfDoc.addPage();
              yPosition = height - 50;
            }
          } else {
            currentLine = testLine;
          }
        }
        
        // 마지막 줄 그리기
        if (currentLine) {
          page.drawText(currentLine, {
            x: xPosition,
            y: yPosition,
            size: fontSize,
            font: selectedFont,
            color: rgb(0, 0, 0),
          });
          yPosition -= fontSize + (section.isTitle ? 15 : 10);
        }
      }
    }
    
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile && uploadedFile.type === 'application/pdf') {
      setFile(uploadedFile);
      setTranslatedUrl(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false
  });

  const handleTranslate = async () => {
    if (!file) return;
    
    setTranslating(true);
    setProgress(0);
    
    try {
      // 1. PDF에서 구조화된 텍스트 추출
      setProgress(10);
      const structuredPages = await extractStructuredTextFromPDF(file);
      
      // 2. 구조를 유지하면서 번역
      setProgress(20);
      const translatedPages = await translateStructuredPages(structuredPages, targetLanguage);
      
      // 3. 번역된 내용으로 PDF 생성
      setProgress(90);
      const translatedPdfBytes = await createTranslatedPDF(translatedPages);
      
      const blob = new Blob([translatedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setTranslatedUrl(url);
      
      setProgress(100);
    } catch (error) {
      console.error('Translation error:', error);
      alert('번역 중 오류가 발생했습니다. PDF 파일이 올바른지 확인해주세요.');
    } finally {
      setTranslating(false);
    }
  };

  const handleDownload = () => {
    if (translatedUrl) {
      const link = document.createElement('a');
      link.href = translatedUrl;
      link.download = `translated_${file?.name}`;
      link.click();
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
          <p className="text-sm text-gray-500">번역할 PDF 문서를 선택하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-8">
      <div className="max-w-2xl mx-auto w-full">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">선택된 파일</h3>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setTranslatedUrl(null);
                  setProgress(0);
                }}
                className="text-red-500 hover:text-red-700"
              >
                삭제
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              번역할 언어 선택
            </label>
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={translating}
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.name}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {translating && (
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>번역 진행중...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={handleTranslate}
              disabled={translating || translatedUrl !== null}
              className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {translating ? '번역 중...' : '번역 시작'}
            </button>
            
            {translatedUrl && (
              <button
                onClick={handleDownload}
                className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                다운로드
              </button>
            )}
          </div>

          {translatedUrl && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <p className="text-green-700 text-center">
                ✅ 번역이 완료되었습니다!
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">💡 문서 번역 기능</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• PDF 문서의 텍스트를 추출하여 번역</li>
              <li>• 제목, 본문, 불릿 포인트 등 구조 유지</li>
              <li>• 들여쓰기와 문단 구분 보존</li>
              <li>• 번역된 내용을 새로운 PDF로 생성</li>
            </ul>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ 주의: 복잡한 레이아웃, 표, 이미지는 지원하지 않습니다. 
              텍스트 위주의 문서에서 가장 잘 작동합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentTranslator;