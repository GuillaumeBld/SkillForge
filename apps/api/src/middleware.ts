import type { NextFunction, Request, Response } from 'express';
import { findPartnerCredential, resolveEnvironment, type PartnerContext, type Environment } from './config';

export interface PartnerRequest extends Request {
  partnerContext?: PartnerContext;
}

export type RateLimitConfig = {
  production: number;
  sandbox: number;
  windowMs: number;
};

export class SlaThrottler {
  private counters = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly defaultWindowMs: number) {}

  public attempt(key: string, limit: RateLimitConfig, environment: Environment): boolean {
    const now = Date.now();
    const counterKey = `${key}:${environment}`;
    const record = this.counters.get(counterKey);
    const windowMs = limit.windowMs ?? this.defaultWindowMs;

    if (!record || record.resetAt <= now) {
      this.counters.set(counterKey, {
        count: 1,
        resetAt: now + windowMs
      });
      return true;
    }

    const nextCount = record.count + 1;
    const envLimit = environment === 'sandbox' ? limit.sandbox : limit.production;

    if (nextCount > envLimit) {
      return false;
    }

    this.counters.set(counterKey, {
      count: nextCount,
      resetAt: record.resetAt
    });

    return true;
  }

  public clear(): void {
    this.counters.clear();
  }
}

const throttler = new SlaThrottler(60 * 60 * 1000);

export function getThrottler(): SlaThrottler {
  return throttler;
}

export function apiKeyAuth(request: PartnerRequest, response: Response, next: NextFunction): void {
  try {
    const apiKey = request.header('x-api-key');
    const apiSecret = request.header('x-api-secret');
    const partnerId = request.header('x-partner-id');

    if (!apiKey || !apiSecret || !partnerId) {
      response.status(401).json({ status: 'error', message: 'Missing API credentials' });
      return;
    }

    const credential = findPartnerCredential(apiKey, apiSecret);

    if (!credential || credential.partnerId !== partnerId) {
      response.status(401).json({ status: 'error', message: 'Invalid partner credentials' });
      return;
    }

    const environment = resolveEnvironment(credential, request);

    request.partnerContext = { credential, environment };

    next();
  } catch (error) {
    response.status(403).json({ status: 'error', message: (error as Error).message });
  }
}

export function enforceRateLimit(endpointKey: string, limit: RateLimitConfig) {
  return (request: PartnerRequest, response: Response, next: NextFunction): void => {
    const context = request.partnerContext;

    if (!context) {
      response.status(500).json({ status: 'error', message: 'Partner context missing' });
      return;
    }

    const key = `${context.credential.partnerId}:${endpointKey}`;

    const allowed = throttler.attempt(key, limit, context.environment);

    if (!allowed) {
      response.status(429).json({ status: 'error', message: 'Rate limit exceeded' });
      return;
    }

    next();
  };
}

export const SLA_LIMITS = {
  candidateImport: {
    production: 1000,
    sandbox: 200,
    windowMs: 60 * 60 * 1000
  },
  assessmentSchedule: {
    production: 1000,
    sandbox: 200,
    windowMs: 60 * 60 * 1000
  },
  assessmentBatch: {
    production: 50,
    sandbox: 20,
    windowMs: 60 * 60 * 1000
  },
  placementRecord: {
    production: 500,
    sandbox: 200,
    windowMs: 60 * 60 * 1000
  }
} satisfies Record<string, RateLimitConfig>;
