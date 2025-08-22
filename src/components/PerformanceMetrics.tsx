import React, { useState, useEffect } from 'react';
import { Activity, Zap, AlertTriangle, TrendingUp } from 'lucide-react';

interface PerformanceData {
  renderTime: number;
  componentName: string;
  timestamp: number;
}

interface MetricsSummary {
  averageRenderTime: number;
  slowestComponent: string;
  slowestTime: number;
  totalRenders: number;
  warningCount: number;
}

export const PerformanceMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsSummary>({
    averageRenderTime: 0,
    slowestComponent: '',
    slowestTime: 0,
    totalRenders: 0,
    warningCount: 0
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') return;

    const performanceData: PerformanceData[] = [];
    
    // Override console.warn to capture performance warnings
    const originalWarn = console.warn;
    let warningCount = 0;
    
    console.warn = (...args) => {
      if (args[0]?.includes('[Performance]')) {
        warningCount++;
        const match = args[0].match(/(\w+) .*?: ([\d.]+)ms/);
        if (match) {
          performanceData.push({
            componentName: match[1],
            renderTime: parseFloat(match[2]),
            timestamp: Date.now()
          });
        }
      }
      originalWarn(...args);
    };

    // Update metrics every 2 seconds
    const interval = setInterval(() => {
      if (performanceData.length > 0) {
        const summary = performanceData.reduce((acc, data) => {
          acc.totalTime += data.renderTime;
          if (data.renderTime > acc.slowestTime) {
            acc.slowestTime = data.renderTime;
            acc.slowestComponent = data.componentName;
          }
          return acc;
        }, {
          totalTime: 0,
          slowestTime: 0,
          slowestComponent: '',
          count: performanceData.length
        });

        setMetrics({
          averageRenderTime: summary.totalTime / summary.count,
          slowestComponent: summary.slowestComponent,
          slowestTime: summary.slowestTime,
          totalRenders: summary.count,
          warningCount
        });
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      console.warn = originalWarn;
    };
  }, []);

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 p-3 bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-800 transition-colors z-50"
        title="Performance Metrics"
      >
        <Activity className="w-5 h-5" />
      </button>

      {/* Metrics Panel */}
      {isVisible && (
        <div className="fixed bottom-20 right-4 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Performance Metrics
            </h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average Render</span>
              <span className={`text-sm font-medium ${
                metrics.averageRenderTime > 16 ? 'text-red-600' : 'text-green-600'
              }`}>
                {metrics.averageRenderTime.toFixed(2)}ms
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Slowest Component</span>
              <span className="text-sm font-medium text-gray-900">
                {metrics.slowestComponent || 'N/A'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Slowest Render</span>
              <span className={`text-sm font-medium ${
                metrics.slowestTime > 50 ? 'text-red-600' : 
                metrics.slowestTime > 16 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {metrics.slowestTime.toFixed(2)}ms
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Renders</span>
              <span className="text-sm font-medium text-gray-900">
                {metrics.totalRenders}
              </span>
            </div>

            {metrics.warningCount > 0 && (
              <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-yellow-700">
                  {metrics.warningCount} performance warnings
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <p>🟢 Good: &lt;16ms (60fps)</p>
              <p>🟡 Warning: 16-50ms</p>
              <p>🔴 Critical: &gt;50ms</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};