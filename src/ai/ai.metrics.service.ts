import { Injectable } from '@nestjs/common';

@Injectable()
export class AiMetricsService {
  recordRequest(route: string): void {
    // TODO: Implement
    void route;
  }

  recordError(route: string, code: string): void {
    // TODO: Implement
    void route;
    void code;
  }

  recordLatency(route: string, millis: number): void {
    // TODO: Implement
    void route;
    void millis;
  }
}
