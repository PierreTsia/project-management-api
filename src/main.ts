import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const string: string = 12;
  console.log(string);
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const corsOptions = {
    origin: configService.get<string>('CORS_ORIGIN'),
    credentials: true,
  };
  app.enableCors(corsOptions);

  app.setGlobalPrefix('api/v1', {
    exclude: ['/', 'api/docs'],
  });

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Application is running on: http://localhost:${port}`);
}
bootstrap();
