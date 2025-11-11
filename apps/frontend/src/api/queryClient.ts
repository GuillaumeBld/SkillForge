import { QueryClient } from '@tanstack/react-query';
import { normalizeApiError } from './errors';

const baseRetryDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, 60_000);

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          const normalized = normalizeApiError(error);
          if (normalized.status && normalized.status < 500) {
            return false;
          }
          return failureCount < 3;
        },
        retryDelay: (attempt) => baseRetryDelay(attempt),
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        meta: {
          failureBackoff: 'exponential'
        }
      },
      mutations: {
        retry: false
      }
    }
  });

export const queryClient = createQueryClient();
