import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Zap } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface AIUsageDisplayProps {
  inline?: boolean;
}

const AIUsageDisplay: React.FC<AIUsageDisplayProps> = ({ inline = false }) => {
  const { currentWorkspace } = useWorkspace();
  const [usage, setUsage] = useState({
    used: 0,
    limit: 10000,
    percentage: 0,
    userUsage: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentWorkspace) {
      loadUsageData();
    }
  }, [currentWorkspace]);

  const loadUsageData = async () => {
    if (!currentWorkspace) return;
    
    try {
      // Get workspace usage
      const workspaceDoc = await getDoc(doc(db, 'workspaces', currentWorkspace.id));
      if (workspaceDoc.exists()) {
        const data = workspaceDoc.data();
        const used = data.ai_usage_this_month || 0;
        const limit = data.ai_usage_limit || 10000;
        
        setUsage({
          used,
          limit,
          percentage: (used / limit) * 100,
          userUsage: 0 // This would come from user-specific data
        });
      }
    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-600 bg-green-100';
    if (percentage < 80) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage < 50) return 'bg-green-600';
    if (percentage < 80) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32"></div>
      </div>
    );
  }

  if (inline) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Zap className="w-4 h-4 text-gray-500" />
        <span className="text-gray-600">
          {usage.used.toLocaleString()} / {usage.limit.toLocaleString()} 토큰
        </span>
        {usage.percentage > 80 && (
          <AlertCircle className="w-4 h-4 text-yellow-500" />
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900 flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-600" />
          AI 사용량
        </h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUsageColor(usage.percentage)}`}>
          {usage.percentage.toFixed(1)}%
        </span>
      </div>

      <div className="space-y-3">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">이번 달 사용량</span>
            <span className="text-gray-900 font-medium">
              {usage.used.toLocaleString()} / {usage.limit.toLocaleString()} 토큰
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div 
              className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(usage.percentage)}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, usage.percentage)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Warning Message */}
        {usage.percentage > 80 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg"
          >
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div className="text-sm">
              <p className="text-yellow-800 font-medium">사용량 주의</p>
              <p className="text-yellow-700">
                {usage.percentage > 90 
                  ? '곧 사용 한도에 도달합니다. 요금제 업그레이드를 고려해보세요.'
                  : '월 사용량의 80%를 초과했습니다.'}
              </p>
            </div>
          </motion.div>
        )}

        {/* Additional Info */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">남은 토큰</span>
            <span className="font-medium text-gray-900">
              {(usage.limit - usage.used).toLocaleString()} 토큰
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-600">리셋 날짜</span>
            <span className="text-gray-500">
              매월 1일
            </span>
          </div>
        </div>

        {/* Upgrade CTA */}
        {usage.percentage > 50 && (
          <button className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all duration-200">
            요금제 업그레이드
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default AIUsageDisplay;