import { useState, useEffect } from 'react';

export interface MobileInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  isPortrait: boolean;
  isLandscape: boolean;
  canHover: boolean;
  hasTouch: boolean;
  isOneHandedMode: boolean; // For screens ≤ 375px width (typical one-handed usage)
}

const useMobileDetection = (): MobileInfo => {
  const [mobileInfo, setMobileInfo] = useState<MobileInfo>(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      screenWidth: width,
      screenHeight: height,
      isPortrait: height > width,
      isLandscape: width > height,
      canHover: window.matchMedia('(hover: hover)').matches,
      hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      isOneHandedMode: width <= 375
    };
  });

  useEffect(() => {
    const updateMobileInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setMobileInfo({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        screenWidth: width,
        screenHeight: height,
        isPortrait: height > width,
        isLandscape: width > height,
        canHover: window.matchMedia('(hover: hover)').matches,
        hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        isOneHandedMode: width <= 375
      });
    };

    // Create media query listeners for different breakpoints
    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const tabletQuery = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
    const orientationQuery = window.matchMedia('(orientation: portrait)');
    const hoverQuery = window.matchMedia('(hover: hover)');

    // Add listeners
    const listeners = [mobileQuery, tabletQuery, orientationQuery, hoverQuery];
    listeners.forEach(query => query.addEventListener('change', updateMobileInfo));

    // Also listen for resize events
    window.addEventListener('resize', updateMobileInfo);

    return () => {
      listeners.forEach(query => query.removeEventListener('change', updateMobileInfo));
      window.addEventListener('resize', updateMobileInfo);
    };
  }, []);

  return mobileInfo;
};

export default useMobileDetection;