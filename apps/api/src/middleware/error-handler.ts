import type { NextFunction, Request, Response } from 'express';

export interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (error: unknown, req: Request, res: Response, _next: NextFunction): void => {
  const apiError =
    error instanceof ApiError
      ? error
      : new ApiError(
          error instanceof Error ? error.message : 'Internal server error',
          error instanceof ApiError ? error.statusCode : 500
        );

  const payload: { error: ErrorPayload & { requestId?: string } } = {
    error: {
      code: apiError.name ?? 'Error',
      message: apiError.message,
      requestId: req.requestId,
      ...(apiError.details ? { details: apiError.details } : {})
    }
  };

  if (apiError.statusCode >= 500) {
    console.error('Unhandled API error', error);
  }

  res.status(apiError.statusCode).json(payload);
};

export default errorHandler;
