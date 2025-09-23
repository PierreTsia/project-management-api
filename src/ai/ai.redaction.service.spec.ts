import { AiRedactionService } from './ai.redaction.service';

describe('AiRedactionService', () => {
  const svc = new AiRedactionService();

  it('redacts in production', () => {
    expect(svc.sanitizeText('anything', 'production')).toBe('[REDACTED]');
  });

  it('masks emails and phones and trims length in non-prod', () => {
    const input = 'contact me at a@b.com or 123-456-7890 and apikey ABC';
    const out = svc.sanitizeText(input, 'development');
    expect(out).toContain('[EMAIL]');
    expect(out).toContain('[PHONE]');
    expect(out).toMatch(/apikey \[SECRET\]/i);
  });
});
