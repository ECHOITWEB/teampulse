import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Download, Home } from 'lucide-react';
import errorLogger from '../../utils/errorLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 에러 로깅
    errorLogger.error('React Error Boundary Caught Error', error, {
      component: 'ErrorBoundary',
      action: 'componentDidCatch',
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    });

    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // 에러 발생 횟수가 3번 이상이면 페이지 새로고침 권장
    if (this.state.errorCount >= 3) {
      errorLogger.warning('Multiple errors detected, recommending page refresh', {
        component: 'ErrorBoundary',
        metadata: { errorCount: this.state.errorCount }
      });
    }
  }

  handleReset = () => {
    errorLogger.info('Error boundary reset by user', {
      component: 'ErrorBoundary',
      action: 'reset'
    });
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    });
  };

  handleReload = () => {
    errorLogger.info('Page reload requested by user', {
      component: 'ErrorBoundary',
      action: 'reload'
    });
    
    window.location.reload();
  };

  handleGoHome = () => {
    errorLogger.info('Navigation to home requested by user', {
      component: 'ErrorBoundary',
      action: 'navigate_home'
    });
    
    window.location.href = '/';
  };

  handleDownloadLogs = () => {
    errorLogger.info('Error logs download requested', {
      component: 'ErrorBoundary',
      action: 'download_logs'
    });
    
    errorLogger.downloadLogs();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-pink-500 p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">앗, 문제가 발생했습니다!</h1>
                  <p className="text-white text-opacity-90 mt-1">
                    예기치 않은 오류가 발생했습니다. 불편을 드려 죄송합니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Details */}
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h2 className="font-semibold text-red-900 mb-2">오류 정보</h2>
                <p className="text-red-700 font-mono text-sm">
                  {this.state.error?.toString()}
                </p>
                {this.state.error?.stack && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-red-600 hover:text-red-700 text-sm font-medium">
                      자세한 정보 보기
                    </summary>
                    <pre className="mt-2 text-xs text-red-600 overflow-x-auto bg-white p-3 rounded border border-red-200">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>

              {/* Error Count Warning */}
              {this.state.errorCount >= 3 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-yellow-800">
                    ⚠️ 여러 번의 오류가 감지되었습니다. 페이지를 새로고침하는 것을 권장합니다.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 mb-3">다음 작업을 시도해보세요:</h3>
                
                <button
                  onClick={this.handleReset}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  다시 시도하기
                </button>

                <button
                  onClick={this.handleReload}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  페이지 새로고침
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Home className="w-5 h-5" />
                  홈으로 이동
                </button>

                <button
                  onClick={this.handleDownloadLogs}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  오류 로그 다운로드
                </button>
              </div>

              {/* Development Mode Info */}
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">개발자 정보</h3>
                  <details>
                    <summary className="cursor-pointer text-gray-600 hover:text-gray-700 text-sm">
                      Component Stack
                    </summary>
                    <pre className="mt-2 text-xs text-gray-600 overflow-x-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                </div>
              )}

              {/* Help Text */}
              <div className="mt-6 text-center text-sm text-gray-500">
                <p>문제가 계속되면 지원팀에 문의해주세요.</p>
                <p className="mt-1">
                  이메일: <a href="mailto:support@teampulse.com" className="text-blue-600 hover:underline">
                    support@teampulse.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;