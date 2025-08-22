import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  peakRenderTime: number;
}

export function usePerformanceMonitor(componentName: string): PerformanceMetrics {
  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);
  const lastRenderStart = useRef<number>(0);

  useEffect(() => {
    const renderTime = performance.now() - lastRenderStart.current;
    renderTimes.current.push(renderTime);
    
    // Keep only last 100 render times
    if (renderTimes.current.length > 100) {
      renderTimes.current.shift();
    }

    if (renderTime > 16.67) { // More than 1 frame (60fps)
      console.warn(`[Performance] ${componentName} slow render: ${renderTime.toFixed(2)}ms`);
    }
  });

  // Track render start
  lastRenderStart.current = performance.now();
  renderCount.current++;

  const metrics: PerformanceMetrics = {
    renderCount: renderCount.current,
    lastRenderTime: renderTimes.current[renderTimes.current.length - 1] || 0,
    averageRenderTime: renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length || 0,
    peakRenderTime: Math.max(...renderTimes.current, 0)
  };

  // Log performance issues in development
  if (process.env.NODE_ENV === 'development' && metrics.averageRenderTime > 10) {
    console.warn(`[Performance] ${componentName} average render time: ${metrics.averageRenderTime.toFixed(2)}ms`);
  }

  return metrics;
}