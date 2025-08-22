import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

export interface CardProps extends HTMLMotionProps<"div"> {
  variant?: 'default' | 'elevated' | 'bordered' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      interactive = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      relative rounded-xl
      transition-all duration-200
      transform-gpu
    `;

    const variants = {
      default: `
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        shadow-sm
      `,
      elevated: `
        bg-white dark:bg-gray-800
        shadow-lg hover:shadow-xl
        border border-gray-100 dark:border-gray-700
      `,
      bordered: `
        bg-transparent
        border-2 border-gray-300 dark:border-gray-600
      `,
      ghost: `
        bg-gray-50 dark:bg-gray-900
        hover:bg-gray-100 dark:hover:bg-gray-800
      `,
    };

    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-10',
    };

    const interactiveStyles = interactive ? `
      cursor-pointer
      hover:scale-[1.02]
      active:scale-[0.98]
      focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
    ` : '';

    return (
      <motion.div
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          paddings[padding],
          interactiveStyles,
          className
        )}
        whileHover={interactive ? { y: -2 } : {}}
        transition={{ duration: 0.15 }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

// Card Header Component
export const CardHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('pb-4 border-b border-gray-200 dark:border-gray-700', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

// Card Title Component
export const CardTitle = forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-xl font-semibold text-gray-900 dark:text-gray-100',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

// Card Description Component
export const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-gray-600 dark:text-gray-400 mt-1', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

// Card Content Component
export const CardContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('pt-4', className)} {...props} />
));
CardContent.displayName = 'CardContent';

// Card Footer Component
export const CardFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 flex items-center',
      className
    )}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export default Card;