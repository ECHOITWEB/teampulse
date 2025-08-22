import { lazy, ComponentType } from 'react';

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
}

export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  options: RetryOptions = {}
): React.LazyExoticComponent<T> {
  const { maxRetries = 3, retryDelay = 1000 } = options;

  return lazy(async () => {
    let retries = 0;
    
    const tryImport = async (): Promise<{ default: T }> => {
      try {
        return await componentImport();
      } catch (error) {
        if (retries < maxRetries) {
          retries++;
          console.warn(`Failed to load component, retrying... (${retries}/${maxRetries})`);
          
          // Clear module cache for potential stale chunks
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
              cacheNames
                .filter(name => name.includes('webpack'))
                .map(name => caches.delete(name))
            );
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay * retries));
          
          return tryImport();
        }
        
        // If all retries failed, reload the page as last resort
        console.error('Failed to load component after retries, reloading page...');
        window.location.reload();
        throw error;
      }
    };
    
    return tryImport();
  });
}