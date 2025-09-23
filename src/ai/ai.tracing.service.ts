import { Injectable } from '@nestjs/common';

@Injectable()
export class AiTracingService {
  async withSpan<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      return await fn();
    } finally {
      const duration = Date.now() - start;
      // eslint-disable-next-line no-console
      console.debug('[trace]', name, { durationMs: duration });
    }
  }
}
