import { Test } from '@nestjs/testing';
import { AiRedactionService } from './ai.redaction.service';

describe('AiRedactionService (Nest)', () => {
  let svc: AiRedactionService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AiRedactionService],
    }).compile();
    svc = moduleRef.get(AiRedactionService);
  });

  it('masks PII consistently', () => {
    const out = svc.sanitizeText('a@b.com 123-456-7890 Bearer secret');
    expect(out).toContain('[EMAIL]');
    expect(out).toContain('[PHONE]');
    expect(out).toMatch(/Bearer \[SECRET\]/);
  });

  it('trims overly long input', () => {
    const out = svc.sanitizeText('x'.repeat(600));
    expect(out.length).toBeLessThanOrEqual(512);
  });
});
