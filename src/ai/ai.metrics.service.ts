import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiRedactionService } from './ai.redaction.service';

@Injectable()
export class AiMetricsService {
  constructor(
    private readonly config: ConfigService,
    private readonly redaction: AiRedactionService,
  ) {}

  recordRequest(
    route: string,
    labels: { provider: string; model: string },
  ): void {
    if (this.isProduction()) return;
    // Non-prod: lightweight console for visibility, sanitized
    // Never include prompts/responses
    // eslint-disable-next-line no-console
    console.debug('[metrics] ai.provider.request', { route, ...labels });
  }

  recordError(
    route: string,
    errorCode: string,
    labels: { provider: string; model: string },
  ): void {
    if (this.isProduction()) return;
    // eslint-disable-next-line no-console
    console.debug('[metrics] ai.provider.error', {
      route,
      errorCode,
      ...labels,
    });
  }

  recordLatency(
    route: string,
    millis: number,
    labels: { provider: string; model: string },
  ): void {
    if (this.isProduction()) return;
    // eslint-disable-next-line no-console
    console.debug('[metrics] ai.provider.latency', {
      route,
      millis,
      ...labels,
    });
  }

  sanitizeForLog(text: string): string {
    return this.redaction.sanitizeText(text);
  }

  private isProduction(): boolean {
    return this.config.get<string>('NODE_ENV', 'development') === 'production';
  }
}
