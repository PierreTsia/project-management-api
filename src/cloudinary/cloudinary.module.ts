import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { I18nModule } from 'nestjs-i18n';
import { CloudinaryService } from './cloudinary.service';

@Module({
  imports: [ConfigModule, I18nModule],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
