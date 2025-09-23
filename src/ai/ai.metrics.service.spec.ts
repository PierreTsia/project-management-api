import { Test } from '@nestjs/testing';
import { AiMetricsService } from './ai.metrics.service';
import { ConfigService } from '@nestjs/config';
import { AiRedactionService } from './ai.redaction.service';

describe('AiMetricsService', () => {
  let service: AiMetricsService;
  let configMock: { get: jest.Mock };
  let redactionMock: { sanitizeText: jest.Mock };
  const labels = {
    provider: 'mistral',
    model: 'mistral-small-latest',
  } as const;

  beforeEach(async () => {
    configMock = { get: jest.fn((k: string, d?: any) => d) };
    redactionMock = { sanitizeText: jest.fn((t: string) => t) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiMetricsService,
        { provide: ConfigService, useValue: configMock },
        { provide: AiRedactionService, useValue: redactionMock },
      ],
    }).compile();
    service = moduleRef.get(AiMetricsService);
  });

  it('records request in non-production', () => {
    const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    service.recordRequest('/ai/hello', labels);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('does not record in production', () => {
    configMock.get.mockImplementation((k: string) =>
      k === 'NODE_ENV' ? 'production' : undefined,
    );
    const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    service.recordLatency('/ai/hello', 10, labels);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('sanitizes via redaction service', () => {
    redactionMock.sanitizeText.mockReturnValue('[SAFE]');
    const result = service.sanitizeForLog('secret');
    expect(result).toBe('[SAFE]');
  });
});
