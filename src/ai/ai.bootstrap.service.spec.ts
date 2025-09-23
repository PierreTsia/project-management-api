import { Test } from '@nestjs/testing';
import { AiBootstrapService } from './ai.bootstrap.service';
import { ProviderFactory } from './provider.factory';
import { ConfigService } from '@nestjs/config';

describe('AiBootstrapService', () => {
  it('does nothing when AI_TOOLS_ENABLED is false', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiBootstrapService,
        {
          provide: ProviderFactory,
          useValue: {
            get: () => ({
              getInfo: () => ({ provider: 'mistral', model: 'x' }),
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (k: string, d?: any) =>
              k === 'AI_TOOLS_ENABLED' ? 'false' : d,
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(AiBootstrapService);
    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });

  it('throws when enabled and missing API key', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiBootstrapService,
        {
          provide: ProviderFactory,
          useValue: {
            get: () => ({
              getInfo: () => ({ provider: 'mistral', model: 'x' }),
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (k: string) => (k === 'AI_TOOLS_ENABLED' ? 'true' : ''),
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(AiBootstrapService);
    await expect(service.onModuleInit()).rejects.toBeTruthy();
  });
});
