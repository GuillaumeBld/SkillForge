import type { PartnerCredential } from '../config';

export const DEVELOPMENT_PARTNER_CREDENTIALS: PartnerCredential[] = [
  {
    partnerId: 'development-partner-1',
    apiKey: 'pk_dev_sample_123',
    apiSecret: 'sk_dev_sample_456',
    sandboxEnabled: true
  },
  {
    partnerId: 'development-partner-2',
    apiKey: 'pk_dev_sample_789',
    apiSecret: 'sk_dev_sample_012',
    sandboxEnabled: true
  }
];
