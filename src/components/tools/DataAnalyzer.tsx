import React, { useState } from 'react';
import { BarChart3, TrendingUp, FileSpreadsheet, Loader, ChevronRight } from 'lucide-react';

const DataAnalyzer: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string>('');

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<any>(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisResult('');

    // Simulate analysis process
    await new Promise(resolve => setTimeout(resolve, 2000));

    const analysis = `## 📊 데이터 분석 결과

### 1. 데이터 개요
- **총 레코드 수**: ${fileData?.rows?.toLocaleString() || 'N/A'}개
- **분석 기간**: 데이터 업로드 후 확인 가능
- **데이터 컬럼**: ${fileData?.columns || 'N/A'}개

### 2. 분석 준비
파일을 업로드하시면 다음 분석을 제공합니다:

#### 📈 통계 분석
- 기술 통계량 (평균, 중앙값, 표준편차)
- 데이터 분포 및 패턴 분석
- 이상치 및 결측값 검사

#### 📊 트렌드 분석
- 시계열 패턴 분석
- 계절성 및 주기성 탐지
- 성장률 및 변화율 계산

#### 🎯 세그먼테이션
- 카테고리별 분석
- 지역별/그룹별 비교
- 고객/제품 세그먼트 분석

### 3. 예측 모델링
- 미래 트렌드 예측
- 회귀 분석
- 상관관계 분석

### 4. 시각화
- 차트 및 그래프 생성
- 대시보드 권장사항
- 핵심 지표 요약

파일을 업로드하여 맞춤형 분석을 시작하세요.`;

    setAnalysisResult(analysis);
    setIsAnalyzing(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      // Simulate file processing
      setFileData({
        fileName: file.name,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        rows: 0,
        columns: 0,
        preview: []
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* File Upload */}
      {!uploadedFile && (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6 text-center">
          <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">데이터 파일 업로드</h3>
          <p className="text-gray-500 mb-6">CSV, Excel 파일을 업로드하여 AI 분석을 시작하세요</p>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            파일 선택
          </label>
        </div>
      )}

      {/* File Display */}
      {uploadedFile && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-green-500" />
              <div>
                <h3 className="font-semibold text-lg">{fileData?.fileName}</h3>
                <p className="text-sm text-gray-500">
                  {fileData?.fileSize} • 분석 준비 완료
                </p>
              </div>
            </div>
            <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
              업로드 완료
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-gray-600">파일이 업로드되었습니다. AI 분석을 시작하려면 아래 버튼을 클릭하세요.</p>
          </div>
        </div>
      )}

      {/* Analyze Button */}
      {uploadedFile && !analysisResult && (
        <div className="flex justify-center">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>데이터 분석 중...</span>
              </>
            ) : (
              <>
                <BarChart3 className="w-5 h-5" />
                <span>AI 분석 시작</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Analysis Result */}
      {analysisResult && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">AI 분석 완료</h2>
          </div>
          <div className="prose prose-sm max-w-none">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              {analysisResult.split('\n').map((line, index) => {
                if (line.startsWith('## ')) {
                  return <h2 key={index} className="text-xl font-bold mt-4 mb-2 text-gray-900">{line.replace('## ', '')}</h2>;
                } else if (line.startsWith('### ')) {
                  return <h3 key={index} className="text-lg font-semibold mt-3 mb-2 text-gray-800">{line.replace('### ', '')}</h3>;
                } else if (line.startsWith('#### ')) {
                  return <h4 key={index} className="text-md font-semibold mt-2 mb-1 text-gray-700">{line.replace('#### ', '')}</h4>;
                } else if (line.startsWith('- ')) {
                  return <li key={index} className="ml-4 text-gray-700">{line.replace('- ', '')}</li>;
                } else if (line.trim() === '') {
                  return <br key={index} />;
                } else {
                  return <p key={index} className="text-gray-700 mb-2">{line}</p>;
                }
              })}
            </div>
          </div>

          {/* Reset Button */}
          <div className="flex justify-center mt-6">
            <button
              onClick={() => {
                setAnalysisResult('');
                setUploadedFile(null);
                setFileData(null);
              }}
              className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              새로운 파일 업로드
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataAnalyzer;