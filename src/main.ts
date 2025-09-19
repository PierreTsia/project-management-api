import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { I18nValidationPipe } from 'nestjs-i18n';
import { CustomLogger } from './common/services/logger.service';
import { DataSource } from 'typeorm';

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.log('No DATABASE_URL found, skipping migrations');
    console.log(
      'Available environment variables:',
      Object.keys(process.env).filter((key) => key.includes('DATABASE')),
    );
    return;
  }

  console.log('Running database migrations...');
  console.log(
    'Database URL (first 20 chars):',
    databaseUrl.substring(0, 20) + '...',
  );

  const isFlyDatabase =
    databaseUrl.includes('fly.io') ||
    databaseUrl.includes('flycast') ||
    databaseUrl.includes('supabase') ||
    databaseUrl.includes('heroku');

  console.log('Is Fly database:', isFlyDatabase);

  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    entities: ['dist/**/*.entity.js'],
    migrations: ['dist/migrations/*.js'],
    ...(isFlyDatabase && {
      ssl: {
        rejectUnauthorized: false,
      },
    }),
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established');

    const pendingMigrations = await dataSource.showMigrations();
    if (pendingMigrations) {
      console.log('Running pending migrations...');
      await dataSource.runMigrations();
      console.log('Migrations completed successfully');
    } else {
      console.log('No pending migrations');
    }

    await dataSource.destroy();
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}

async function bootstrap() {
  // Run migrations before starting the app
  try {
    await runMigrations();
  } catch (error) {
    console.error('Failed to run migrations:', error);
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = await app.resolve(CustomLogger);
  logger.setContext('Bootstrap');

  const corsOptions = {
    origin: configService.get<string>('CORS_ORIGIN'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Set-Cookie'],
  };
  app.enableCors(corsOptions);

  app.use(cookieParser());

  app.setGlobalPrefix('api/v1', {
    exclude: ['/', 'api/docs'],
  });

  // Enable validation
  app.useGlobalPipes(
    new I18nValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('The API documentation for the application')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('refreshToken')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(
    `📚 API Documentation available at http://localhost:${port}/api/docs`,
  );
}
bootstrap();
