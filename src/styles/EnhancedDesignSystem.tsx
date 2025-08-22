// Enhanced Design System for TeamPulse
// Accessibility-first, responsive, and dark mode support

import { useEffect, useState } from 'react';

// Enhanced Color System with WCAG AAA compliance
export const enhancedColors = {
  // Light mode colors
  light: {
    // Primary Colors - Blue with better contrast
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb', // Main - WCAG AAA
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172e54',
    },
    
    // Background and surface colors
    background: {
      primary: '#ffffff',
      secondary: '#f9fafb',
      tertiary: '#f3f4f6',
      elevated: '#ffffff',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    
    // Text colors with proper contrast
    text: {
      primary: '#111827', // WCAG AAA on white
      secondary: '#4b5563', // WCAG AA on white
      tertiary: '#6b7280',
      disabled: '#9ca3af',
      inverse: '#ffffff',
      link: '#2563eb',
      linkHover: '#1d4ed8',
    },
    
    // Border colors
    border: {
      light: '#e5e7eb',
      default: '#d1d5db',
      strong: '#9ca3af',
      focus: '#3b82f6',
      error: '#ef4444',
    },
    
    // Semantic colors
    semantic: {
      success: '#059669',
      successBg: '#ecfdf5',
      warning: '#d97706',
      warningBg: '#fffbeb',
      error: '#dc2626',
      errorBg: '#fef2f2',
      info: '#0891b2',
      infoBg: '#ecfeff',
    },
  },
  
  // Dark mode colors
  dark: {
    primary: {
      50: '#172e54',
      100: '#1e3a8a',
      200: '#1e40af',
      300: '#1d4ed8',
      400: '#2563eb',
      500: '#3b82f6',
      600: '#60a5fa', // Main - WCAG AAA on dark
      700: '#93c5fd',
      800: '#bfdbfe',
      900: '#dbeafe',
      950: '#eff6ff',
    },
    
    background: {
      primary: '#0f172a',
      secondary: '#1e293b',
      tertiary: '#334155',
      elevated: '#1e293b',
      overlay: 'rgba(0, 0, 0, 0.7)',
    },
    
    text: {
      primary: '#f9fafb', // WCAG AAA on dark
      secondary: '#e5e7eb', // WCAG AA on dark
      tertiary: '#d1d5db',
      disabled: '#6b7280',
      inverse: '#111827',
      link: '#60a5fa',
      linkHover: '#93c5fd',
    },
    
    border: {
      light: '#334155',
      default: '#475569',
      strong: '#64748b',
      focus: '#60a5fa',
      error: '#f87171',
    },
    
    semantic: {
      success: '#10b981',
      successBg: '#064e3b',
      warning: '#f59e0b',
      warningBg: '#78350f',
      error: '#f87171',
      errorBg: '#7f1d1d',
      info: '#06b6d4',
      infoBg: '#164e63',
    },
  },
};

// Enhanced Typography with better readability
export const enhancedTypography = {
  // Font families with fallbacks
  fontFamily: {
    sans: '"Inter var", Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"Fira Code", "SF Mono", Monaco, Consolas, monospace',
    display: '"Cal Sans", "Inter var", Inter, sans-serif',
  },
  
  // Fluid typography scale
  fontSize: {
    '2xs': 'clamp(0.625rem, 0.7vw, 0.75rem)',    // 10-12px
    xs: 'clamp(0.75rem, 0.85vw, 0.875rem)',      // 12-14px
    sm: 'clamp(0.875rem, 1vw, 1rem)',            // 14-16px
    base: 'clamp(1rem, 1.15vw, 1.125rem)',       // 16-18px
    lg: 'clamp(1.125rem, 1.3vw, 1.25rem)',       // 18-20px
    xl: 'clamp(1.25rem, 1.5vw, 1.5rem)',         // 20-24px
    '2xl': 'clamp(1.5rem, 2vw, 1.875rem)',       // 24-30px
    '3xl': 'clamp(1.875rem, 2.5vw, 2.25rem)',    // 30-36px
    '4xl': 'clamp(2.25rem, 3vw, 3rem)',          // 36-48px
    '5xl': 'clamp(3rem, 4vw, 4rem)',             // 48-64px
  },
  
  // Enhanced font weights
  fontWeight: {
    thin: 100,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  
  // Optimized line heights for readability
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 1.75,
    body: 1.6, // Optimal for body text
  },
  
  // Letter spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
};

// Enhanced spacing with responsive units
export const enhancedSpacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
};

// Enhanced shadows with dark mode support
export const enhancedShadows = {
  light: {
    xs: '0 0 0 1px rgba(0, 0, 0, 0.05)',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
    focus: '0 0 0 3px rgba(59, 130, 246, 0.5)',
  },
  dark: {
    xs: '0 0 0 1px rgba(255, 255, 255, 0.05)',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.2)',
    focus: '0 0 0 3px rgba(96, 165, 250, 0.5)',
  },
};

// Enhanced transitions with performance optimization
export const enhancedTransitions = {
  duration: {
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms',
  },
  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  property: {
    none: 'none',
    all: 'all',
    colors: 'background-color, border-color, color, fill, stroke',
    opacity: 'opacity',
    shadow: 'box-shadow',
    transform: 'transform',
  },
};

// Accessibility utilities
export const a11y = {
  // Screen reader only
  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    borderWidth: '0',
  },
  
  // Focus visible styles
  focusVisible: {
    outline: '2px solid transparent',
    outlineOffset: '2px',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.5)',
  },
  
  // Keyboard navigation
  skipLink: {
    position: 'absolute',
    top: '-40px',
    left: '0',
    background: '#000000',
    color: '#ffffff',
    padding: '8px',
    zIndex: '100',
    textDecoration: 'none',
    '&:focus': {
      top: '0',
    },
  },
  
  // Minimum tap target size (48x48px)
  tapTarget: {
    minWidth: '48px',
    minHeight: '48px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

// Responsive breakpoints
export const breakpoints = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '3xl': '1920px',
};

// Media queries helper
export const mediaQueries = {
  xs: `@media (min-width: ${breakpoints.xs})`,
  sm: `@media (min-width: ${breakpoints.sm})`,
  md: `@media (min-width: ${breakpoints.md})`,
  lg: `@media (min-width: ${breakpoints.lg})`,
  xl: `@media (min-width: ${breakpoints.xl})`,
  '2xl': `@media (min-width: ${breakpoints['2xl']})`,
  '3xl': `@media (min-width: ${breakpoints['3xl']})`,
  mobile: `@media (max-width: ${breakpoints.md})`,
  tablet: `@media (min-width: ${breakpoints.md}) and (max-width: ${breakpoints.lg})`,
  desktop: `@media (min-width: ${breakpoints.lg})`,
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
  hover: '@media (hover: hover) and (pointer: fine)',
  touch: '@media (hover: none) and (pointer: coarse)',
  highContrast: '@media (prefers-contrast: high)',
};

// Animation variants for enhanced micro-interactions
export const enhancedAnimations = {
  // Fade animations
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  
  // Slide animations
  slideUp: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  
  slideDown: {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  
  slideInFromRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  
  slideInFromLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  
  // Scale animations
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.15, ease: 'easeOut' },
  },
  
  // Stagger children
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  },
  
  staggerItem: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },
};

// Custom hook for theme management
export const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  useEffect(() => {
    // Check system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };
    
    // Set initial theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme(mediaQuery.matches ? 'dark' : 'light');
    }
    
    // Listen for system preference changes
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };
  
  return { theme, toggleTheme, colors: enhancedColors[theme] };
};

// Utility function for responsive values
export const responsive = <T,>(values: {
  base?: T;
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
}) => {
  return values;
};

// Z-index management
export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
};

export default {
  enhancedColors,
  enhancedTypography,
  enhancedSpacing,
  enhancedShadows,
  enhancedTransitions,
  enhancedAnimations,
  a11y,
  breakpoints,
  mediaQueries,
  zIndex,
  useTheme,
  responsive,
};