import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children?: React.ReactNode;
  className?: string;
  'aria-label'?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      fullWidth = false,
      icon,
      iconPosition = 'left',
      children,
      className,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      relative inline-flex items-center justify-center
      font-medium rounded-lg
      transition-all duration-200
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      transform-gpu
    `;

    const variants = {
      primary: `
        bg-gradient-to-r from-blue-600 to-blue-700 text-white
        hover:from-blue-700 hover:to-blue-800
        focus-visible:ring-blue-500
        active:scale-[0.98]
        shadow-sm hover:shadow-md
      `,
      secondary: `
        bg-gradient-to-r from-purple-600 to-purple-700 text-white
        hover:from-purple-700 hover:to-purple-800
        focus-visible:ring-purple-500
        active:scale-[0.98]
        shadow-sm hover:shadow-md
      `,
      outline: `
        border-2 border-gray-300 text-gray-700
        hover:border-gray-400 hover:bg-gray-50
        focus-visible:ring-gray-500
        dark:border-gray-600 dark:text-gray-300
        dark:hover:border-gray-500 dark:hover:bg-gray-800
      `,
      ghost: `
        text-gray-700 hover:bg-gray-100
        focus-visible:ring-gray-500
        dark:text-gray-300 dark:hover:bg-gray-800
      `,
      danger: `
        bg-gradient-to-r from-red-600 to-red-700 text-white
        hover:from-red-700 hover:to-red-800
        focus-visible:ring-red-500
        active:scale-[0.98]
        shadow-sm hover:shadow-md
      `,
      success: `
        bg-gradient-to-r from-green-600 to-green-700 text-white
        hover:from-green-700 hover:to-green-800
        focus-visible:ring-green-500
        active:scale-[0.98]
        shadow-sm hover:shadow-md
      `,
    };

    const sizes = {
      xs: 'px-2.5 py-1.5 text-xs gap-1.5',
      sm: 'px-3 py-2 text-sm gap-2',
      md: 'px-4 py-2.5 text-base gap-2',
      lg: 'px-6 py-3 text-lg gap-2.5',
      xl: 'px-8 py-4 text-xl gap-3',
    };

    const iconSizes = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
      xl: 'w-7 h-7',
    };

    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={isDisabled}
        aria-label={ariaLabel}
        aria-busy={loading}
        whileHover={!isDisabled ? { scale: 1.02 } : {}}
        whileTap={!isDisabled ? { scale: 0.98 } : {}}
        transition={{ duration: 0.15 }}
        {...props}
      >
        {loading && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-inherit rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Loader2 className={cn('animate-spin', iconSizes[size])} />
          </motion.div>
        )}
        
        <span className={cn(
          'flex items-center gap-2',
          loading && 'opacity-0'
        )}>
          {icon && iconPosition === 'left' && (
            <span className={iconSizes[size]}>{icon}</span>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <span className={iconSizes[size]}>{icon}</span>
          )}
        </span>
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;