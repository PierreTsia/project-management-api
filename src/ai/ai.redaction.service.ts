import { Injectable } from '@nestjs/common';

@Injectable()
export class AiRedactionService {
  sanitizeText(input: string, env: string): string {
    if (!input) return '';
    if (env === 'production') return '[REDACTED]';
    const masked = input
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[EMAIL]')
      .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[PHONE]')
      .replace(/(Bearer|apikey|token)\s+[A-Za-z0-9._-]+/gi, '$1 [SECRET]');
    return masked.slice(0, 512);
  }
}
