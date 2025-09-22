import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  
  // 워크스페이스 설정 관련 페이지들과 특정 페이지에서는 푸터를 완전히 숨김
  const hideFooter = location.pathname.includes('/settings') || 
                     location.pathname.includes('/workspace-settings') ||
                     location.pathname.includes('/workspaces') ||
                     location.pathname === '/workspace-selection' ||
                     location.pathname.includes('/goals') ||
                     location.pathname.includes('/okr') ||
                     location.pathname.includes('/meetings') ||
                     location.pathname.includes('/ai-tools') ||
                     location.pathname.includes('/team-chat');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-white">
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
};

export default Layout;