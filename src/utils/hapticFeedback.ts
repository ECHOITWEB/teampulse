/**
 * Haptic feedback utility for mobile interactions
 * Provides different types of haptic feedback for various user actions
 */

export interface HapticOptions {
  pattern?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
  duration?: number;
}

export class HapticFeedback {
  private static isSupported = 'vibrate' in navigator;

  /**
   * Provides light haptic feedback for subtle interactions
   * Used for: hover states, button touches, swipe gestures
   */
  static light(options: HapticOptions = {}) {
    if (!this.isSupported) return;
    
    const { pattern = 'light' } = options;
    
    switch (pattern) {
      case 'light':
        navigator.vibrate(10);
        break;
      default:
        navigator.vibrate(10);
    }
  }

  /**
   * Provides medium haptic feedback for normal interactions
   * Used for: button presses, progress updates, selections
   */
  static medium(options: HapticOptions = {}) {
    if (!this.isSupported) return;
    
    const { pattern = 'medium' } = options;
    
    switch (pattern) {
      case 'medium':
        navigator.vibrate(25);
        break;
      default:
        navigator.vibrate(25);
    }
  }

  /**
   * Provides heavy haptic feedback for important interactions
   * Used for: confirmations, completions, important state changes
   */
  static heavy(options: HapticOptions = {}) {
    if (!this.isSupported) return;
    
    const { pattern = 'heavy' } = options;
    
    switch (pattern) {
      case 'heavy':
        navigator.vibrate(50);
        break;
      default:
        navigator.vibrate(50);
    }
  }

  /**
   * Provides success haptic feedback
   * Used for: goal completion, successful updates, achievements
   */
  static success(options: HapticOptions = {}) {
    if (!this.isSupported) return;
    
    // Double pulse for success
    navigator.vibrate([30, 20, 30]);
  }

  /**
   * Provides warning haptic feedback
   * Used for: validation errors, cautionary actions
   */
  static warning(options: HapticOptions = {}) {
    if (!this.isSupported) return;
    
    // Three short pulses for warning
    navigator.vibrate([20, 10, 20, 10, 20]);
  }

  /**
   * Provides error haptic feedback
   * Used for: errors, failures, critical issues
   */
  static error(options: HapticOptions = {}) {
    if (!this.isSupported) return;
    
    // Long pulse followed by short pulse for error
    navigator.vibrate([100, 50, 30]);
  }

  /**
   * Provides selection haptic feedback
   * Used for: slider interactions, value changes
   */
  static selection(options: HapticOptions = {}) {
    if (!this.isSupported) return;
    
    navigator.vibrate(15);
  }

  /**
   * Provides swipe haptic feedback
   * Used for: swipe gestures, card transitions
   */
  static swipe(options: HapticOptions = {}) {
    if (!this.isSupported) return;
    
    navigator.vibrate(12);
  }

  /**
   * Custom haptic feedback with specific pattern
   */
  static custom(pattern: number | number[]) {
    if (!this.isSupported) return;
    
    navigator.vibrate(pattern);
  }

  /**
   * Check if haptic feedback is supported
   */
  static get supported() {
    return this.isSupported;
  }
}

export default HapticFeedback;