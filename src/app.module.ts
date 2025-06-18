import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { APP_FILTER } from '@nestjs/core';
import {
  AcceptLanguageResolver,
  I18nModule,
  I18nValidationExceptionFilter,
  I18nService,
} from 'nestjs-i18n';
import * as path from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from './config/validation.schema';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { LoggerModule } from './common/services/logger.module';
import { CustomLogger } from './common/services/logger.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '..', 'i18n'),
        watch: true,
      },
      resolvers: [AcceptLanguageResolver],
    }),
    UsersModule,
    AuthModule,
    ProjectsModule,
    CloudinaryModule,
    LoggerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useFactory: (i18n: I18nService, logger: CustomLogger) =>
        new AllExceptionsFilter(i18n, logger),
      inject: [I18nService, CustomLogger],
    },
    {
      provide: APP_FILTER,
      useFactory: (i18n) => new I18nValidationExceptionFilter(i18n),
      inject: [I18nService],
    },
  ],
})
export class AppModule {}
