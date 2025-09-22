import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitationCode, setInvitationCode] = useState<string | null>(null);

  useEffect(() => {
    // Check if there's a pending invitation code
    const pendingCode = sessionStorage.getItem('pendingInvitationCode');
    if (pendingCode) {
      setInvitationCode(pendingCode);
    }
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await signIn();
      
      // Check if login was successful
      if (result === null) {
        // User cancelled or there was a non-critical error
        setLoading(false);
        return;
      }
      
      // Check for pending invitation code after successful login
      const pendingCode = sessionStorage.getItem('pendingInvitationCode');
      if (pendingCode) {
        // Navigate to the invitation acceptance page
        navigate(`/invite/${pendingCode}`);
      } else if (location.state?.from) {
        // Navigate to the originally requested page
        navigate(location.state.from);
        // Clear the saved return URL
        localStorage.removeItem('returnUrl');
      } else {
        // Check localStorage for saved return URL (persisted across refresh)
        const savedReturnUrl = localStorage.getItem('returnUrl');
        if (savedReturnUrl) {
          navigate(savedReturnUrl);
          localStorage.removeItem('returnUrl');
        } else {
          // Default navigation
          navigate('/workspaces');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      // Only show errors that are meant for the user
      if (error.message && !error.message.includes('INTERNAL ASSERTION FAILED')) {
        setError(error.message);
      } else {
        setError('로그인 중 문제가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img
            src="/image/TeamPulse_Logo_v2.png"
            alt="TeamPulse"
            className="mx-auto h-20 w-auto"
          />
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Welcome to TeamPulse
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {invitationCode 
              ? '초대를 수락하려면 로그인해주세요'
              : 'Sign in to access your team workspace'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-lg rounded-lg sm:px-10">
          {invitationCode && (
            <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-400 rounded-md text-sm">
              워크스페이스 초대가 대기 중입니다. 로그인 후 자동으로 초대 페이지로 이동합니다.
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>로그인 중...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Secure authentication via Google
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          By signing in, you agree to our{' '}
          <a href="/terms" className="font-medium text-blue-600 hover:text-blue-500">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="font-medium text-blue-600 hover:text-blue-500">
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;