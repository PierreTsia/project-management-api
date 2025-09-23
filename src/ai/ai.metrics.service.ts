import { Injectable } from '@nestjs/common';

@Injectable()
export class AiMetricsService {
  recordRequest(route: string): void {
    void route;
  }

  recordError(route: string, code: string): void {
    void route;
    void code;
  }

  recordLatency(route: string, millis: number): void {
    void route;
    void millis;
  }
}
