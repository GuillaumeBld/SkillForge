import type { ApiErrorPayload } from './types';
import { isApiClientError } from './client';

export interface NormalizedApiError {
  status?: number;
  message: string;
  details?: ApiErrorPayload | Record<string, unknown> | undefined;
}

export const normalizeApiError = (error: unknown): NormalizedApiError => {
  if (isApiClientError(error)) {
    const payload = error.response?.data;
    const message = payload?.message ?? error.message;
    return {
      status: error.response?.status,
      message,
      details: payload ?? undefined
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'An unknown error occurred' };
};
