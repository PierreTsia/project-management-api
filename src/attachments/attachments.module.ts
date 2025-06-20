import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { Attachment } from './entities/attachment.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ProjectsModule } from '../projects/projects.module';
import { CustomLogger } from '../common/services/logger.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attachment]),
    CloudinaryModule,
    ProjectsModule,
  ],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, CustomLogger],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
