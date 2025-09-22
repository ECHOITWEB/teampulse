interface ErrorLog {
  timestamp: Date;
  level: 'error' | 'warning' | 'info' | 'debug';
  message: string;
  component?: string;
  action?: string;
  userId?: string;
  workspaceId?: string;
  error?: Error;
  metadata?: Record<string, any>;
  stack?: string;
}

class ErrorLogger {
  private logs: ErrorLog[] = [];
  private maxLogs = 1000;
  private isDevelopment = process.env.NODE_ENV === 'development';

  // 색상 정의
  private colors = {
    error: 'background: #ff0000; color: white; padding: 2px 4px; border-radius: 2px;',
    warning: 'background: #ff9800; color: white; padding: 2px 4px; border-radius: 2px;',
    info: 'background: #2196f3; color: white; padding: 2px 4px; border-radius: 2px;',
    debug: 'background: #9e9e9e; color: white; padding: 2px 4px; border-radius: 2px;',
    success: 'background: #4caf50; color: white; padding: 2px 4px; border-radius: 2px;'
  };

  private log(level: ErrorLog['level'], message: string, details?: Partial<ErrorLog>) {
    const log: ErrorLog = {
      timestamp: new Date(),
      level,
      message,
      ...details
    };

    // 메모리에 저장
    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 콘솔에 출력
    this.printToConsole(log);

    // Production에서는 서버로 전송 (구현 예정)
    if (!this.isDevelopment && level === 'error') {
      this.sendToServer(log);
    }

    return log;
  }

  private printToConsole(log: ErrorLog) {
    const timestamp = log.timestamp.toLocaleTimeString('ko-KR');
    const prefix = `[${timestamp}] TeamChat`;
    
    // 상세 정보 구성
    const details: string[] = [];
    if (log.component) details.push(`Component: ${log.component}`);
    if (log.action) details.push(`Action: ${log.action}`);
    if (log.userId) details.push(`User: ${log.userId}`);
    if (log.workspaceId) details.push(`Workspace: ${log.workspaceId}`);

    // 콘솔 그룹으로 출력
    console.group(`%c${prefix} ${log.level.toUpperCase()}`, this.colors[log.level]);
    console.log(`📝 ${log.message}`);
    
    if (details.length > 0) {
      console.log(`ℹ️ ${details.join(' | ')}`);
    }
    
    if (log.metadata) {
      console.log('📊 Metadata:', log.metadata);
    }
    
    if (log.error) {
      console.error('❌ Error Object:', log.error);
      if (log.stack) {
        console.log('📚 Stack Trace:', log.stack);
      }
    }
    
    console.groupEnd();
  }

  private async sendToServer(log: ErrorLog) {
    try {
      // Firebase Functions로 에러 로그 전송
      // 실제 구현 시 Firebase Functions 엔드포인트 사용
      const response = await fetch('/api/logs/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...log,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: log.timestamp.toISOString()
        })
      });
      
      if (!response.ok) {
        console.error('Failed to send error log to server');
      }
    } catch (error) {
      console.error('Error sending log to server:', error);
    }
  }

  // Public methods
  error(message: string, error?: Error, details?: Partial<ErrorLog>) {
    return this.log('error', message, {
      ...details,
      error,
      stack: error?.stack
    });
  }

  warning(message: string, details?: Partial<ErrorLog>) {
    return this.log('warning', message, details);
  }

  info(message: string, details?: Partial<ErrorLog>) {
    return this.log('info', message, details);
  }

  debug(message: string, details?: Partial<ErrorLog>) {
    if (this.isDevelopment) {
      return this.log('debug', message, details);
    }
  }

  success(message: string, details?: Partial<ErrorLog>) {
    console.log(`%c✅ ${message}`, this.colors.success);
    return this.log('info', message, details);
  }

  // 특수 메서드들
  featureNotImplemented(feature: string, component?: string) {
    const message = `🚧 기능이 아직 구현되지 않았습니다: ${feature}`;
    console.warn(`%c${message}`, 'background: #ff9800; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
    
    return this.warning(message, {
      component,
      metadata: { feature, status: 'not_implemented' }
    });
  }

  apiError(endpoint: string, error: any, details?: Record<string, any>) {
    const message = `API 호출 실패: ${endpoint}`;
    return this.error(message, error, {
      action: 'api_call',
      metadata: {
        endpoint,
        status: error.response?.status,
        statusText: error.response?.statusText,
        ...details
      }
    });
  }

  networkError(action: string, error: any) {
    const message = `네트워크 오류: ${action}`;
    return this.error(message, error, {
      action: 'network',
      metadata: {
        online: navigator.onLine,
        connectionType: (navigator as any).connection?.effectiveType
      }
    });
  }

  validationError(field: string, value: any, reason: string) {
    const message = `유효성 검사 실패: ${field}`;
    return this.warning(message, {
      action: 'validation',
      metadata: { field, value, reason }
    });
  }

  // 로그 조회 메서드
  getLogs(level?: ErrorLog['level']): ErrorLog[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    console.clear();
  }

  // 로그 내보내기
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  downloadLogs() {
    const data = this.exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teampulse-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Singleton instance
const errorLogger = new ErrorLogger();

// 전역 에러 핸들러 등록
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    errorLogger.error('처리되지 않은 Promise 거부', new Error(event.reason), {
      component: 'global',
      action: 'unhandledrejection'
    });
  });

  window.addEventListener('error', (event) => {
    errorLogger.error('전역 에러 발생', event.error, {
      component: 'global',
      action: 'error',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    });
  });
}

export default errorLogger;