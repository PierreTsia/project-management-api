import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { plainToClass } from 'class-transformer';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Attachment, AttachmentEntityType } from './entities/attachment.entity';
import { AttachmentResponseDto } from './dto/attachment-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { ProjectPermissionService } from '../projects/services/project-permission.service';
import { ProjectRole } from '../projects/enums/project-role.enum';
import { CustomLogger } from '../common/services/logger.service';

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepository: Repository<Attachment>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly i18n: I18nService,
    private readonly projectPermissionService: ProjectPermissionService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext('AttachmentsService');
  }

  async uploadAttachment(
    file: Express.Multer.File,
    entityType: AttachmentEntityType,
    entityId: string,
    uploadedById: string,
    projectId: string,
    acceptLanguage?: string,
  ): Promise<AttachmentResponseDto> {
    const hasPermission =
      await this.projectPermissionService.hasProjectPermission(
        uploadedById,
        projectId,
        ProjectRole.WRITE,
      );

    if (!hasPermission) {
      throw new ForbiddenException({
        status: 403,
        code: 'ATTACHMENTS.INSUFFICIENT_PERMISSIONS',
        message: this.i18n.translate(
          'errors.attachments.insufficient_permissions',
          {
            lang: acceptLanguage,
          },
        ),
      });
    }

    // Upload file to Cloudinary
    const uploadResult = await this.cloudinaryService.uploadFile(
      file,
      entityType,
      entityId,
      uploadedById,
      acceptLanguage,
    );

    // Create attachment record
    const attachment = this.attachmentRepository.create({
      filename: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      cloudinaryUrl: uploadResult.url,
      cloudinaryPublicId: uploadResult.publicId,
      entityType,
      entityId,
      uploadedById,
    });

    const savedAttachment = await this.attachmentRepository.save(attachment);

    // Load the uploadedBy relation
    const attachmentWithUser = await this.attachmentRepository
      .createQueryBuilder('attachment')
      .leftJoinAndSelect('attachment.uploadedBy', 'uploadedBy')
      .where('attachment.id = :id', { id: savedAttachment.id })
      .getOne();

    return new AttachmentResponseDto({
      ...attachmentWithUser,
      uploadedBy: plainToClass(UserResponseDto, attachmentWithUser.uploadedBy),
    });
  }

  async getAttachments(
    entityType: AttachmentEntityType,
    entityId: string,
    projectId: string,
    userId: string,
    acceptLanguage?: string,
  ): Promise<AttachmentResponseDto[]> {
    // Verify user has permission to view attachments
    const hasPermission =
      await this.projectPermissionService.hasProjectPermission(
        userId,
        projectId,
        ProjectRole.READ,
      );

    if (!hasPermission) {
      throw new ForbiddenException({
        status: 403,
        code: 'ATTACHMENTS.INSUFFICIENT_PERMISSIONS',
        message: this.i18n.translate(
          'errors.attachments.insufficient_permissions',
          {
            lang: acceptLanguage,
          },
        ),
      });
    }

    const attachments = await this.attachmentRepository
      .createQueryBuilder('attachment')
      .leftJoinAndSelect('attachment.uploadedBy', 'uploadedBy')
      .where('attachment.entityType = :entityType', { entityType })
      .andWhere('attachment.entityId = :entityId', { entityId })
      .orderBy('attachment.uploadedAt', 'DESC')
      .getMany();

    return attachments.map(
      (attachment) =>
        new AttachmentResponseDto({
          ...attachment,
          uploadedBy: plainToClass(UserResponseDto, attachment.uploadedBy),
        }),
    );
  }

  async deleteAttachment(
    attachmentId: string,
    projectId: string,
    userId: string,
    acceptLanguage?: string,
  ): Promise<void> {
    const attachment = await this.attachmentRepository
      .createQueryBuilder('attachment')
      .leftJoinAndSelect('attachment.uploadedBy', 'uploadedBy')
      .where('attachment.id = :id', { id: attachmentId })
      .getOne();

    if (!attachment) {
      throw new NotFoundException({
        status: 404,
        code: 'ATTACHMENTS.NOT_FOUND',
        message: this.i18n.translate('errors.attachments.not_found', {
          lang: acceptLanguage,
        }),
      });
    }

    // Check if user is the uploader or has admin permissions
    const isUploader = attachment.uploadedById === userId;
    const isAdmin = await this.projectPermissionService.hasProjectPermission(
      userId,
      projectId,
      ProjectRole.ADMIN,
    );

    if (!isUploader && !isAdmin) {
      throw new ForbiddenException({
        status: 403,
        code: 'ATTACHMENTS.CANNOT_DELETE',
        message: this.i18n.translate('errors.attachments.cannot_delete', {
          lang: acceptLanguage,
        }),
      });
    }

    try {
      // Delete from Cloudinary
      await this.cloudinaryService.deleteFile(
        attachment.cloudinaryPublicId,
        acceptLanguage,
      );

      // Delete from database
      await this.attachmentRepository.remove(attachment);

      this.logger.log(
        `Attachment deleted successfully: ${JSON.stringify({
          attachmentId,
          deletedBy: userId,
          entityType: attachment.entityType,
          entityId: attachment.entityId,
        })}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete attachment: ${JSON.stringify({
          attachmentId,
          error: error instanceof Error ? error.message : 'Unknown error',
        })}`,
      );
      throw error;
    }
  }

  async getAttachmentById(
    attachmentId: string,
    projectId: string,
    userId: string,
    acceptLanguage?: string,
  ): Promise<AttachmentResponseDto> {
    // Verify user has permission to view attachments
    const hasPermission =
      await this.projectPermissionService.hasProjectPermission(
        userId,
        projectId,
        ProjectRole.READ,
      );

    if (!hasPermission) {
      throw new ForbiddenException({
        status: 403,
        code: 'ATTACHMENTS.INSUFFICIENT_PERMISSIONS',
        message: this.i18n.translate(
          'errors.attachments.insufficient_permissions',
          {
            lang: acceptLanguage,
          },
        ),
      });
    }

    const attachment = await this.attachmentRepository
      .createQueryBuilder('attachment')
      .leftJoinAndSelect('attachment.uploadedBy', 'uploadedBy')
      .where('attachment.id = :id', { id: attachmentId })
      .getOne();

    if (!attachment) {
      throw new NotFoundException({
        status: 404,
        code: 'ATTACHMENTS.NOT_FOUND',
        message: this.i18n.translate('errors.attachments.not_found', {
          lang: acceptLanguage,
        }),
      });
    }

    return new AttachmentResponseDto({
      ...attachment,
      uploadedBy: plainToClass(UserResponseDto, attachment.uploadedBy),
    });
  }

  async getAttachmentsCountForProjectAndDateRange(
    projectId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    try {
      this.logger.debug(
        `Getting attachments count for project ${projectId} between ${startDate.toISOString()} and ${endDate.toISOString()}`,
      );

      const count = await this.attachmentRepository
        .createQueryBuilder('attachment')
        .where(
          '(attachment.entityType = :projectType AND attachment.entityId = :projectId) OR (attachment.entityType = :taskType AND attachment.entityId IN (SELECT id FROM tasks WHERE project_id = :projectId))',
          {
            projectType: 'PROJECT',
            taskType: 'TASK',
            projectId,
          },
        )
        .andWhere('attachment.uploadedAt >= :startDate', { startDate })
        .andWhere('attachment.uploadedAt <= :endDate', { endDate })
        .getCount();

      this.logger.debug(
        `Found ${count} attachments for project ${projectId} in date range`,
      );

      return count;
    } catch (error) {
      this.logger.error(
        `Error getting attachments count for project ${projectId}:`,
        error.stack,
      );
      // Return 0 instead of throwing to prevent snapshot generation from failing
      return 0;
    }
  }
}
