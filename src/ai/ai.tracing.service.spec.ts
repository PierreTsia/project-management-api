import { AiTracingService } from './ai.tracing.service';

describe('AiTracingService', () => {
  it('wraps fn and logs duration', async () => {
    const svc = new AiTracingService();
    const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    const result = await svc.withSpan('test', async () => 'ok');
    expect(result).toBe('ok');
    expect(spy).toHaveBeenCalledWith('[trace]', 'test', expect.any(Object));
    spy.mockRestore();
  });
});
