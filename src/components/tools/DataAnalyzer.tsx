import React, { useState } from 'react';
import { BarChart3, TrendingUp, FileSpreadsheet, Loader, ChevronRight } from 'lucide-react';

const DataAnalyzer: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string>('');

  // Dummy CSV data
  const dummyData = {
    fileName: '2024_sales_data.csv',
    fileSize: '2.4 MB',
    rows: 5420,
    columns: 12,
    preview: [
      ['Date', 'Product', 'Category', 'Sales', 'Quantity', 'Region'],
      ['2024-01-01', 'TeamPulse Pro', 'Software', '$4,500', '15', 'Seoul'],
      ['2024-01-02', 'TeamPulse Basic', 'Software', '$1,200', '8', 'Busan'],
      ['2024-01-03', 'TeamPulse Enterprise', 'Software', '$12,000', '5', 'Seoul'],
      ['2024-01-04', 'TeamPulse Pro', 'Software', '$3,000', '10', 'Incheon'],
      ['2024-01-05', 'TeamPulse Basic', 'Software', '$900', '6', 'Daegu']
    ]
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisResult('');

    // Simulate analysis process
    await new Promise(resolve => setTimeout(resolve, 2000));

    const analysis = `## 📊 데이터 분석 결과

### 1. 데이터 개요
- **총 레코드 수**: ${dummyData.rows.toLocaleString()}개
- **분석 기간**: 2024년 1월 ~ 12월
- **데이터 컬럼**: ${dummyData.columns}개 (날짜, 제품, 카테고리, 매출, 수량, 지역 등)

### 2. 핵심 인사이트

#### 💰 매출 분석
- **총 매출**: $2,450,000 (전년 대비 +35%)
- **월 평균 매출**: $204,167
- **최고 매출 월**: 11월 ($342,000)
- **최저 매출 월**: 2월 ($125,000)

#### 📈 성장 트렌드
- **분기별 성장률**:
  - Q1: +12%
  - Q2: +28%
  - Q3: +45%
  - Q4: +52%
- **예상 연간 성장률**: 38.5%

#### 🏆 제품별 성과
1. **TeamPulse Enterprise** (45% 매출 기여)
   - 평균 단가: $2,400
   - 총 판매: 459건
2. **TeamPulse Pro** (35% 매출 기여)
   - 평균 단가: $300
   - 총 판매: 2,858건
3. **TeamPulse Basic** (20% 매출 기여)
   - 평균 단가: $150
   - 총 판매: 3,267건

#### 🌏 지역별 분포
- **서울**: 42% (매출의 최대 비중)
- **부산**: 18%
- **인천**: 15%
- **대구**: 12%
- **기타**: 13%

### 3. 주요 발견사항

🔍 **계절성 패턴**
- 3분기와 4분기에 매출이 집중되는 경향 (전체 매출의 65%)
- 연말 프로모션 기간 매출이 평균 대비 2.3배 증가

🎯 **고객 세그먼트**
- Enterprise 고객이 전체 고객의 8%에 불과하지만 매출의 45% 차지
- 중소기업 시장에서 Pro 버전 수요가 지속적으로 증가

⚠️ **주의 사항**
- 2월과 8월에 매출 감소 패턴 관찰
- 특정 지역(제주, 강원)의 시장 침투율이 5% 미만

### 4. 권장 사항

1. **마케팅 전략**
   - Q3-Q4 집중 마케팅 캠페인 강화
   - Enterprise 고객 유치 전략 확대

2. **제품 전략**
   - Pro 버전 기능 강화 및 가격 최적화
   - 중소기업 맞춤형 패키지 개발

3. **지역 확장**
   - 저침투 지역 대상 프로모션 실시
   - 지역별 맞춤형 영업 전략 수립

### 5. 예측 모델
- **2025년 예상 매출**: $3,380,000 (+38%)
- **신규 고객 예상**: 1,250개사
- **시장 점유율 예상**: 23% → 31%`;

    setAnalysisResult(analysis);
    setIsAnalyzing(false);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* File Display */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-green-500" />
            <div>
              <h3 className="font-semibold text-lg">{dummyData.fileName}</h3>
              <p className="text-sm text-gray-500">
                {dummyData.fileSize} • {dummyData.rows.toLocaleString()} rows • {dummyData.columns} columns
              </p>
            </div>
          </div>
          <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
            준비됨
          </div>
        </div>

        {/* Data Preview Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {dummyData.preview[0].map((header, index) => (
                  <th
                    key={index}
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dummyData.preview.slice(1).map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-gray-500 text-center">
          ... {(dummyData.rows - 5).toLocaleString()} more rows
        </div>
      </div>

      {/* Analyze Button */}
      {!analysisResult && (
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
              }}
              className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              새로운 분석 시작
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataAnalyzer;