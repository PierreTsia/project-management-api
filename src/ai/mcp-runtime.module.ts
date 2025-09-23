import { DynamicModule, Module } from '@nestjs/common';

@Module({})
export class McpRuntimeModule {
  static register(options: { enabled: boolean }): DynamicModule {
    if (!options.enabled) {
      return {
        module: McpRuntimeModule,
        imports: [],
      };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { McpModule } = require('@rekog/mcp-nest');
      return {
        module: McpRuntimeModule,
        imports: [McpModule.forRoot({ name: 'pm-ai-mcp', version: '0.0.1' })],
      };
    } catch {
      return {
        module: McpRuntimeModule,
        imports: [],
      };
    }
  }
}
