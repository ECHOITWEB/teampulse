export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const ErrorCodes = {
  // Auth errors
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  
  // Workspace errors
  WORKSPACE_NOT_FOUND: 'WORKSPACE_NOT_FOUND',
  WORKSPACE_ACCESS_DENIED: 'WORKSPACE_ACCESS_DENIED',
  WORKSPACE_LIMIT_REACHED: 'WORKSPACE_LIMIT_REACHED',
  
  // API errors
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // General errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  
  if (error instanceof Error) {
    // Firebase auth errors
    if (error.message.includes('auth/')) {
      return new AppError(
        '인증 오류가 발생했습니다',
        ErrorCodes.AUTH_INVALID,
        401,
        error.message
      );
    }
    
    // Network errors
    if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
      return new AppError(
        '네트워크 연결을 확인해주세요',
        ErrorCodes.NETWORK_ERROR,
        0,
        error.message
      );
    }
    
    // Firestore errors
    if (error.message.includes('permission-denied')) {
      return new AppError(
        '권한이 없습니다',
        ErrorCodes.PERMISSION_DENIED,
        403,
        error.message
      );
    }
    
    return new AppError(
      error.message,
      ErrorCodes.UNKNOWN_ERROR,
      500,
      error
    );
  }
  
  return new AppError(
    '알 수 없는 오류가 발생했습니다',
    ErrorCodes.UNKNOWN_ERROR,
    500,
    error
  );
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.code === ErrorCodes.NETWORK_ERROR;
  }
  if (error instanceof Error) {
    return error.message.includes('Failed to fetch') || 
           error.message.includes('Network');
  }
  return false;
}

export function isAuthError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.code.startsWith('AUTH_');
  }
  if (error instanceof Error) {
    return error.message.includes('auth/');
  }
  return false;
}