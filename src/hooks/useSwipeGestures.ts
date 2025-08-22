import { useCallback, useRef, useEffect } from 'react';
import HapticFeedback from '../utils/hapticFeedback';

export interface SwipeGestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  velocityThreshold?: number;
  enableHaptic?: boolean;
  preventScroll?: boolean;
}

export interface SwipeGestureState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  isActive: boolean;
  direction: 'left' | 'right' | 'up' | 'down' | null;
}

const useSwipeGestures = (config: SwipeGestureConfig) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    velocityThreshold = 300,
    enableHaptic = true,
    preventScroll = false
  } = config;

  const stateRef = useRef<SwipeGestureState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    isActive: false,
    direction: null
  });

  const startTimeRef = useRef<number>(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    const state = stateRef.current;
    
    state.startX = touch.clientX;
    state.startY = touch.clientY;
    state.currentX = touch.clientX;
    state.currentY = touch.clientY;
    state.deltaX = 0;
    state.deltaY = 0;
    state.isActive = true;
    state.direction = null;
    
    startTimeRef.current = Date.now();

    if (enableHaptic && HapticFeedback.supported) {
      HapticFeedback.light();
    }
  }, [enableHaptic]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!stateRef.current.isActive) return;

    const touch = e.touches[0];
    const state = stateRef.current;
    
    state.currentX = touch.clientX;
    state.currentY = touch.clientY;
    state.deltaX = state.currentX - state.startX;
    state.deltaY = state.currentY - state.startY;

    // Determine primary direction
    const absX = Math.abs(state.deltaX);
    const absY = Math.abs(state.deltaY);
    
    if (absX > absY) {
      // Horizontal swipe
      state.direction = state.deltaX > 0 ? 'right' : 'left';
      if (preventScroll) {
        e.preventDefault();
      }
    } else {
      // Vertical swipe
      state.direction = state.deltaY > 0 ? 'down' : 'up';
    }

    // Provide haptic feedback when threshold is reached
    if (enableHaptic && HapticFeedback.supported) {
      const distance = Math.sqrt(state.deltaX ** 2 + state.deltaY ** 2);
      if (distance > threshold) {
        HapticFeedback.selection();
      }
    }
  }, [threshold, enableHaptic, preventScroll]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!stateRef.current.isActive) return;

    const state = stateRef.current;
    const duration = Date.now() - startTimeRef.current;
    const distance = Math.sqrt(state.deltaX ** 2 + state.deltaY ** 2);
    const velocity = distance / duration * 1000; // pixels per second

    // Check if swipe meets threshold criteria
    const meetsThreshold = distance > threshold || velocity > velocityThreshold;
    
    if (meetsThreshold && state.direction) {
      if (enableHaptic && HapticFeedback.supported) {
        HapticFeedback.medium();
      }

      // Trigger appropriate callback
      switch (state.direction) {
        case 'left':
          onSwipeLeft?.();
          break;
        case 'right':
          onSwipeRight?.();
          break;
        case 'up':
          onSwipeUp?.();
          break;
        case 'down':
          onSwipeDown?.();
          break;
      }
    }

    // Reset state
    state.isActive = false;
    state.direction = null;
    state.deltaX = 0;
    state.deltaY = 0;
  }, [threshold, velocityThreshold, enableHaptic, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  const bindToElement = useCallback((element: HTMLElement | null) => {
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventScroll });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventScroll });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, preventScroll]);

  const getSwipeHandlers = useCallback(() => ({
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  }), [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    bindToElement,
    getSwipeHandlers,
    swipeState: stateRef.current
  };
};

export default useSwipeGestures;