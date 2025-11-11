import type { Request } from 'express';
import { DEVELOPMENT_PARTNER_CREDENTIALS } from './config/default-partner-credentials';

type Environment = 'production' | 'sandbox';

export interface PartnerCredential {
  partnerId: string;
  apiKey: string;
  apiSecret: string;
  sandboxEnabled: boolean;
}

export interface PartnerContext {
  credential: PartnerCredential;
  environment: Environment;
}

function parseCredentials(): PartnerCredential[] {
  const envValue = process.env.PARTNER_CREDENTIALS;

  if (!envValue) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PARTNER_CREDENTIALS must be configured in production environments');
    }

    return DEVELOPMENT_PARTNER_CREDENTIALS;
  }

  try {
    const parsed = JSON.parse(envValue) as PartnerCredential[];

    if (!Array.isArray(parsed)) {
      throw new Error('Credentials payload must be an array');
    }

    return parsed.map((item) => ({
      partnerId: item.partnerId,
      apiKey: item.apiKey,
      apiSecret: item.apiSecret,
      sandboxEnabled: item.sandboxEnabled ?? false
    }));
  } catch (error) {
    throw new Error(`Failed to parse PARTNER_CREDENTIALS: ${(error as Error).message}`);
  }
}

let cachedCredentials: PartnerCredential[] | undefined;

export function getPartnerCredentials(): PartnerCredential[] {
  if (!cachedCredentials) {
    cachedCredentials = parseCredentials();
  }

  return cachedCredentials;
}

export function findPartnerCredential(apiKey: string, apiSecret: string): PartnerCredential | undefined {
  return getPartnerCredentials().find((credential) => credential.apiKey === apiKey && credential.apiSecret === apiSecret);
}

export function resolveEnvironment(credential: PartnerCredential, request: Request): Environment {
  const headerValue = request.header('x-skillforge-environment');
  if (!headerValue) {
    return 'production';
  }

  const normalized = headerValue.toLowerCase();
  if (normalized === 'sandbox') {
    if (!credential.sandboxEnabled) {
      throw new Error('Sandbox access is not enabled for this partner');
    }

    return 'sandbox';
  }

  if (normalized === 'production') {
    return 'production';
  }

  throw new Error(`Unknown environment: ${headerValue}`);
}

export type { Environment };

export function __resetPartnerCredentialCache(): void {
  cachedCredentials = undefined;
}
