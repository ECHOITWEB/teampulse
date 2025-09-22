import React, { useState } from 'react';
import {
  Wallet, Zap, CheckCircle, TrendingUp,
  CreditCard, Info, Gift, Star, Shield
} from 'lucide-react';

interface PulsePlan {
  id: string;
  name: string;
  pulses: number;
  price: number;
  originalPrice?: number;
  discount?: number;
  popular?: boolean;
  bonus?: number;
  features: string[];
  color: string;
}

interface PulsePurchaseProps {
  currentBalance?: number;
  onPurchase?: (planId: string, amount: number) => void;
  onClose?: () => void;
}

const PulsePurchase: React.FC<PulsePurchaseProps> = ({ 
  currentBalance = 0, 
  onPurchase,
  onClose 
}) => {
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer'>('card');

  // Pulse 패키지 (10원 = 1 Pulse)
  const pulsePlans: PulsePlan[] = [
    {
      id: 'starter',
      name: '스타터',
      pulses: 1000,
      price: 10000,
      features: [
        '기본 AI 모델 사용',
        '이메일 지원',
        '월간 사용 리포트'
      ],
      color: 'from-gray-500 to-gray-600'
    },
    {
      id: 'basic',
      name: '베이직',
      pulses: 5000,
      price: 50000,
      bonus: 500,
      features: [
        '보너스 500 Pulse 추가',
        '모든 AI 모델 사용',
        '우선 고객 지원',
        '주간 사용 리포트'
      ],
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'pro',
      name: '프로',
      pulses: 10000,
      price: 100000,
      bonus: 2000,
      popular: true,
      features: [
        '보너스 2,000 Pulse 추가 (20% 추가)',
        '모든 AI 모델 무제한',
        '전담 매니저 지원',
        '실시간 사용 분석',
        'API 접근 권한'
      ],
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'business',
      name: '비즈니스',
      pulses: 30000,
      price: 300000,
      bonus: 9000,
      features: [
        '보너스 9,000 Pulse 추가 (30% 추가)',
        '최우선 처리',
        '24/7 전담 지원',
        '커스텀 AI 모델 설정',
        'SLA 보장',
        '청구서 발행'
      ],
      color: 'from-gradient-start to-gradient-end'
    },
    {
      id: 'enterprise',
      name: '엔터프라이즈',
      pulses: 100000,
      price: 1000000,
      bonus: 50000,
      features: [
        '보너스 50,000 Pulse 추가 (50% 추가)',
        '무제한 AI 사용',
        '전용 서버 할당',
        '온사이트 교육',
        '맞춤형 계약',
        '연간 결제 시 추가 20% 할인'
      ],
      color: 'from-yellow-500 to-orange-500'
    }
  ];

  const calculateCustomPulses = (amount: string) => {
    const numAmount = parseInt(amount.replace(/,/g, '')) || 0;
    return Math.floor(numAmount / 10);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('ko-KR');
  };

  const formatCurrency = (amount: number) => {
    return `${formatNumber(amount)}원`;
  };

  const handleCustomAmountChange = (value: string) => {
    // Remove non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, '');
    // Format with commas
    const formattedValue = parseInt(numericValue).toLocaleString('ko-KR');
    setCustomAmount(formattedValue);
    setSelectedPlan('custom');
  };

  const handlePurchase = () => {
    if (!selectedPlan) return;

    if (selectedPlan === 'custom') {
      const amount = parseInt(customAmount.replace(/,/g, '')) || 0;
      if (amount >= 1000) {
        onPurchase?.('custom', amount);
      }
    } else {
      const plan = pulsePlans.find(p => p.id === selectedPlan);
      if (plan) {
        onPurchase?.(plan.id, plan.price);
      }
    }
  };

  const getTotalPulses = (plan: PulsePlan) => {
    return plan.pulses + (plan.bonus || 0);
  };

  const getPricePerPulse = (plan: PulsePlan) => {
    const total = getTotalPulses(plan);
    return Math.round(plan.price / total * 100) / 100;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        {/* Header with Close Button */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Pulse 충전</h2>
            <p className="text-gray-600">AI 서비스 사용을 위한 Pulse를 미리 충전하세요</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

      {/* Current Balance */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm mb-1">현재 보유 Pulse</p>
            <p className="text-4xl font-bold">{formatNumber(currentBalance)}</p>
            <p className="text-blue-100 text-sm mt-2">
              ≈ {formatCurrency(currentBalance * 10)} 상당
            </p>
          </div>
          <Wallet className="w-16 h-16 text-blue-200" />
        </div>
      </div>

      {/* Pricing Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Pulse 가격 정책</p>
            <p>• 기본 가격: 1 Pulse = 10원</p>
            <p>• 대량 구매 시 최대 50% 보너스 Pulse 제공</p>
            <p>• 모든 가격은 VAT 포함입니다</p>
          </div>
        </div>
      </div>

      {/* Pulse Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        {pulsePlans.map(plan => (
          <div
            key={plan.id}
            className={`relative bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer transition-all ${
              selectedPlan === plan.id 
                ? 'ring-4 ring-blue-500 transform scale-105' 
                : 'hover:shadow-xl hover:transform hover:scale-102'
            }`}
            onClick={() => setSelectedPlan(plan.id)}
          >
            {/* Popular Badge */}
            {plan.popular && (
              <div className="absolute top-0 right-0 bg-red-500 text-white px-3 py-1 text-xs font-bold rounded-bl-lg">
                인기
              </div>
            )}

            {/* Plan Header */}
            <div className={`bg-gradient-to-r ${plan.color} text-white p-4`}>
              <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">
                  {formatNumber(getTotalPulses(plan))}
                </span>
                <span className="text-sm opacity-90">Pulse</span>
              </div>
              {plan.bonus && (
                <div className="mt-2 flex items-center gap-1">
                  <Gift className="w-4 h-4" />
                  <span className="text-xs">
                    보너스 {formatNumber(plan.bonus)} Pulse 포함
                  </span>
                </div>
              )}
            </div>

            {/* Plan Body */}
            <div className="p-4">
              {/* Price */}
              <div className="mb-4">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(plan.price)}
                </p>
                <p className="text-xs text-gray-500">
                  Pulse당 {getPricePerPulse(plan)}원
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-4">
                {plan.features.slice(0, 3).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
                {plan.features.length > 3 && (
                  <li className="text-xs text-gray-500 pl-6">
                    +{plan.features.length - 3}개 더보기
                  </li>
                )}
              </ul>

              {/* Select Button */}
              <button
                className={`w-full py-2 rounded-lg font-medium transition-colors ${
                  selectedPlan === plan.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {selectedPlan === plan.id ? '선택됨' : '선택'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Custom Amount */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">원하는 금액 입력</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              충전 금액 (최소 1,000원)
            </label>
            <div className="relative">
              <input
                type="text"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                placeholder="10,000"
                className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  selectedPlan === 'custom' ? 'border-blue-500 bg-blue-50' : ''
                }`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                원
              </span>
            </div>
            {customAmount && (
              <p className="mt-2 text-sm text-gray-600">
                = {formatNumber(calculateCustomPulses(customAmount))} Pulse
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              결제 방법
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-3 border rounded-lg flex items-center justify-center gap-2 ${
                  paymentMethod === 'card' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="font-medium">카드 결제</span>
              </button>
              <button
                onClick={() => setPaymentMethod('transfer')}
                className={`p-3 border rounded-lg flex items-center justify-center gap-2 ${
                  paymentMethod === 'transfer' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Wallet className="w-5 h-5" />
                <span className="font-medium">계좌 이체</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="font-semibold">즉시 사용 가능</h4>
          </div>
          <p className="text-sm text-gray-600">
            결제 즉시 Pulse가 충전되어 바로 AI 서비스를 이용할 수 있습니다
          </p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="font-semibold">대량 구매 혜택</h4>
          </div>
          <p className="text-sm text-gray-600">
            많이 구매할수록 더 많은 보너스 Pulse를 제공합니다
          </p>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-md">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="font-semibold">안전한 결제</h4>
          </div>
          <p className="text-sm text-gray-600">
            Toss Payments를 통한 안전하고 빠른 결제 처리
          </p>
        </div>
      </div>

      {/* Purchase Summary */}
      {selectedPlan && (
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">결제 요약</h3>
          {selectedPlan === 'custom' ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">충전 금액</span>
                <span className="font-medium">{customAmount || '0'}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">받을 Pulse</span>
                <span className="font-medium">
                  {formatNumber(calculateCustomPulses(customAmount))} Pulse
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {(() => {
                const plan = pulsePlans.find(p => p.id === selectedPlan);
                if (!plan) return null;
                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">선택 플랜</span>
                      <span className="font-medium">{plan.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">기본 Pulse</span>
                      <span className="font-medium">{formatNumber(plan.pulses)} Pulse</span>
                    </div>
                    {plan.bonus && (
                      <div className="flex justify-between text-green-600">
                        <span>보너스 Pulse</span>
                        <span className="font-medium">+{formatNumber(plan.bonus)} Pulse</span>
                      </div>
                    )}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span>총 받을 Pulse</span>
                        <span className="text-blue-600">
                          {formatNumber(getTotalPulses(plan))} Pulse
                        </span>
                      </div>
                      <div className="flex justify-between mt-2">
                        <span>결제 금액</span>
                        <span className="text-xl font-bold">
                          {formatCurrency(plan.price)}
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <button
          onClick={onClose}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
        <button
          onClick={handlePurchase}
          disabled={!selectedPlan || (selectedPlan === 'custom' && (!customAmount || parseInt(customAmount.replace(/,/g, '')) < 1000))}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <CreditCard className="w-5 h-5" />
          <span className="font-medium">결제하기</span>
        </button>
      </div>
      </div>
    </div>
  </div>
  );
};

export default PulsePurchase;