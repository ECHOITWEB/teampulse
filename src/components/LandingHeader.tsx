import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, ChevronDown } from 'lucide-react';
import { signOut } from '../config/firebase';

const LandingHeader: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <motion.header 
      className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="flex items-center">
            <img 
              src="/image/TeamPulse_Logo_v2.png" 
              alt="TeamPulse Logo" 
              className="h-10 w-auto"
            />
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
              기능
            </a>
            <a href="#team-chat" className="text-gray-600 hover:text-gray-900 transition-colors">
              팀채팅
            </a>
            <a href="#ai-tools" className="text-gray-600 hover:text-gray-900 transition-colors">
              AI 도구
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
              가격
            </a>
            <a href="#contact" className="text-gray-600 hover:text-gray-900 transition-colors">
              문의
            </a>
          </nav>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <button
                  onClick={() => navigate('/workspaces')}
                  className="px-5 py-2.5 text-gray-700 font-medium hover:text-gray-900 transition-colors"
                >
                  워크스페이스
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-full h-full rounded-full" />
                      ) : (
                        <User className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <span className="font-medium text-gray-700">{user.email}</span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                  
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                    >
                      <div className="px-4 py-2 border-b border-gray-200">
                        <p className="text-sm text-gray-500">로그인 중</p>
                        <p className="font-medium text-gray-900">{user.name || user.email}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          navigate('/workspaces');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
                      >
                        프로젝트
                      </button>
                      <button
                        onClick={() => {
                          navigate('/workspaces');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
                      >
                        워크스페이스 선택
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 text-red-600 hover:text-red-700"
                      >
                        <LogOut className="w-4 h-4" />
                        로그아웃
                      </button>
                    </motion.div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-5 py-2.5 text-gray-700 font-medium hover:text-gray-900 transition-colors"
                >
                  로그인
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  무료 시작
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default LandingHeader;