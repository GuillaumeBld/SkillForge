import { randomUUID } from 'crypto';
import type { Environment } from './config';

type WebhookHandler = (event: WebhookEvent) => Promise<void> | void;

export interface WebhookEvent<TPayload = Record<string, unknown>> {
  id: string;
  type: string;
  partnerId: string;
  environment: Environment;
  payload: TPayload;
  attempts: number;
  createdAt: string;
}

export class WebhookService {
  private readonly queue: WebhookEvent[] = [];
  private readonly deadLetterQueue: WebhookEvent[] = [];
  private readonly consumers = new Map<string, Set<WebhookHandler>>();
  private processing = false;

  publish<TPayload extends Record<string, unknown>>(
    event: Omit<WebhookEvent<TPayload>, 'id' | 'attempts' | 'createdAt'>
  ): WebhookEvent<TPayload> {
    const fullEvent: WebhookEvent<TPayload> = {
      ...event,
      id: randomUUID(),
      attempts: 0,
      createdAt: new Date().toISOString()
    };

    this.queue.push(fullEvent);
    void this.process();

    return fullEvent;
  }

  registerConsumer(eventType: string, handler: WebhookHandler): void {
    const existing = this.consumers.get(eventType) ?? new Set<WebhookHandler>();
    existing.add(handler);
    this.consumers.set(eventType, existing);
  }

  getDeadLetterQueue(): WebhookEvent[] {
    return [...this.deadLetterQueue];
  }

  clear(): void {
    this.queue.length = 0;
    this.deadLetterQueue.length = 0;
    this.processing = false;
  }

  reset(): void {
    this.clear();
    this.consumers.clear();
  }

  private async process(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const event = this.queue.shift();
      if (!event) {
        continue;
      }

      const handlers = this.consumers.get(event.type);

      if (!handlers || handlers.size === 0) {
        continue;
      }

      for (const handler of handlers) {
        try {
          event.attempts += 1;
          await handler(event);
        } catch (error) {
          if (event.attempts >= 3) {
            this.deadLetterQueue.push({ ...event });
          } else {
            this.queue.push(event);
          }
        }
      }
    }

    this.processing = false;
  }

  async drain(): Promise<void> {
    while (this.processing || this.queue.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }
}

export const webhookService = new WebhookService();
