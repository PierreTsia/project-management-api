import * as fs from 'fs';
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { extractPublicId } from 'cloudinary-build-url';
import { I18nService } from 'nestjs-i18n';
import { CustomLogger } from '../common/services/logger.service';
import { AttachmentEntityType } from '../attachments/entities/attachment.entity';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

// Supported file types for different categories
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

@Injectable()
export class CloudinaryService {
  private readonly folder: string;
  private projectName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext('CloudinaryService');

    const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.error('Missing Cloudinary credentials');
      throw new Error('Missing Cloudinary credentials');
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    this.projectName = this.configService.get('PROJECT_NAME') || 'default';
    this.folder =
      this.configService.get('NODE_ENV') === 'production'
        ? `${this.projectName}/prod/avatars`
        : `${this.projectName}/dev/avatars`;
  }

  async uploadFile(
    file: Express.Multer.File,
    entityType: AttachmentEntityType,
    entityId: string,
    uploadedById: string,
    acceptLanguage?: string,
  ) {
    try {
      // Validate file type
      const supportedTypes = [
        ...SUPPORTED_IMAGE_TYPES,
        ...SUPPORTED_DOCUMENT_TYPES,
      ];
      if (!supportedTypes.includes(file.mimetype)) {
        throw new BadRequestException({
          status: 400,
          code: 'CLOUDINARY.INVALID_FILE_TYPE',
          message: this.i18n.translate('errors.cloudinary.invalid_file_type', {
            lang: acceptLanguage,
          }),
        });
      }

      // Determine max file size based on file type
      const maxSize = SUPPORTED_IMAGE_TYPES.includes(file.mimetype)
        ? MAX_FILE_SIZE
        : MAX_DOCUMENT_SIZE;

      if (file.size > maxSize) {
        throw new BadRequestException({
          status: 400,
          code: 'CLOUDINARY.FILE_TOO_LARGE',
          message: this.i18n.translate('errors.cloudinary.file_too_large', {
            lang: acceptLanguage,
            args: { maxSize: Math.round(maxSize / (1024 * 1024)) },
          }),
        });
      }

      if (!file.buffer && !file.path) {
        throw new BadRequestException({
          status: 400,
          code: 'CLOUDINARY.INVALID_FILE',
          message: this.i18n.translate('errors.cloudinary.invalid_file', {
            lang: acceptLanguage,
          }),
        });
      }

      const timestamp = Date.now();
      const fileExtension = this.getFileExtension(file.originalname);
      const publicId = `${this.getAttachmentFolder(entityType, entityId)}/${uploadedById}/file-${timestamp}${fileExtension}`;

      let result;

      if (file.buffer) {
        // Upload from buffer (memory) - convert to base64
        try {
          const base64Data = file.buffer.toString('base64');
          const dataURI = `data:${file.mimetype};base64,${base64Data}`;

          result = await cloudinary.uploader.upload(dataURI, {
            public_id: publicId,
            resource_type: 'auto',
          });
        } catch (error) {
          this.logger.error(
            `Failed to upload buffer to Cloudinary: ${JSON.stringify({
              entityType,
              entityId,
              uploadedById,
              fileSize: file?.size,
              fileType: file?.mimetype,
            })}`,
            error instanceof Error ? error.stack : undefined,
          );
          throw new InternalServerErrorException({
            status: 500,
            code: 'CLOUDINARY.UPLOAD_FAILED',
            message: this.i18n.translate('errors.cloudinary.upload_failed', {
              lang: acceptLanguage,
            }),
          });
        }
      } else if (file.path) {
        // Check if file exists and is readable
        try {
          await fs.promises.access(file.path, fs.constants.R_OK);
        } catch (err) {
          throw new BadRequestException({
            status: 400,
            code: 'CLOUDINARY.INVALID_FILE',
            message: this.i18n.translate('errors.cloudinary.invalid_file', {
              lang: acceptLanguage,
            }),
          });
        }

        // Upload from file path
        result = await cloudinary.uploader.upload(file.path, {
          public_id: publicId,
          resource_type: 'auto',
        });
      } else {
        throw new BadRequestException({
          status: 400,
          code: 'CLOUDINARY.INVALID_FILE',
          message: this.i18n.translate('errors.cloudinary.invalid_file', {
            lang: acceptLanguage,
          }),
        });
      }

      return {
        url: result.secure_url,
        publicId: result.public_id,
        version: result.version,
      };
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Failed to upload file to Cloudinary: ${JSON.stringify({
          entityType,
          entityId,
          uploadedById,
          fileSize: file?.size,
          fileType: file?.mimetype,
        })}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new InternalServerErrorException({
        status: 500,
        code: 'CLOUDINARY.UPLOAD_FAILED',
        message: this.i18n.translate('errors.cloudinary.upload_failed', {
          lang: acceptLanguage,
        }),
      });
    } finally {
      // Clean up the temporary file
      if (file.path) {
        fs.unlink(file.path, (err) => {
          if (err) {
            this.logger.warn(
              `Failed to delete temporary file: ${JSON.stringify({
                path: file.path,
                error: err.message,
              })}`,
            );
          }
        });
      }
    }
  }

  private getAttachmentFolder(
    entityType: AttachmentEntityType,
    entityId: string,
  ): string {
    const env =
      this.configService.get('NODE_ENV') === 'production' ? 'prod' : 'dev';
    const baseFolder = `${this.projectName}/${env}`;

    switch (entityType) {
      case AttachmentEntityType.PROJECT:
        return `${baseFolder}/projects/${entityId}/attachments`;
      case AttachmentEntityType.TASK:
        return `${baseFolder}/tasks/${entityId}/attachments`;
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }

  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';
  }

  async deleteImage(publicId: string, acceptLanguage?: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to delete image from Cloudinary: ${JSON.stringify({ publicId })}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new InternalServerErrorException({
        status: 500,
        code: 'CLOUDINARY.DELETE_FAILED',
        message: this.i18n.translate('errors.cloudinary.delete_failed', {
          lang: acceptLanguage,
        }),
      });
    }
  }

  extractPublicIdFromUrl(url: string): string | null {
    try {
      return extractPublicId(url);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to extract publicId from URL: ${JSON.stringify({ url })}`,
        error instanceof Error ? error.stack : undefined,
      );
      return null;
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    userId: string,
    acceptLanguage?: string,
  ) {
    try {
      // Validate file type
      if (!SUPPORTED_IMAGE_TYPES.includes(file.mimetype)) {
        throw new BadRequestException({
          status: 400,
          code: 'CLOUDINARY.INVALID_FILE',
          message: this.i18n.translate('errors.cloudinary.invalid_file', {
            lang: acceptLanguage,
          }),
        });
      }

      const maxSize = MAX_FILE_SIZE;
      if (file.size > maxSize) {
        throw new BadRequestException({
          status: 400,
          code: 'CLOUDINARY.INVALID_FILE',
          message: this.i18n.translate('errors.cloudinary.invalid_file', {
            lang: acceptLanguage,
          }),
        });
      }

      if (!file.buffer && !file.path) {
        throw new BadRequestException({
          status: 400,
          code: 'CLOUDINARY.INVALID_FILE',
          message: this.i18n.translate('errors.cloudinary.invalid_file', {
            lang: acceptLanguage,
          }),
        });
      }

      const timestamp = Date.now();
      const publicId = `${this.folder}/${userId}/avatar-${timestamp}`;

      // Check if file exists and is readable
      try {
        await fs.promises.access(file.path, fs.constants.R_OK);
      } catch (err) {
        throw new BadRequestException({
          status: 400,
          code: 'CLOUDINARY.INVALID_FILE',
          message: this.i18n.translate('errors.cloudinary.invalid_file', {
            lang: acceptLanguage,
          }),
        });
      }

      const result = await cloudinary.uploader.upload(file.path, {
        public_id: publicId,
        resource_type: 'auto',
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        version: result.version,
      };
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Failed to upload image to Cloudinary: ${JSON.stringify({
          userId,
          fileSize: file?.size,
          fileType: file?.mimetype,
        })}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new InternalServerErrorException({
        status: 500,
        code: 'CLOUDINARY.UPLOAD_FAILED',
        message: this.i18n.translate('errors.cloudinary.upload_failed', {
          lang: acceptLanguage,
        }),
      });
    } finally {
      // Clean up the temporary file
      if (file.path) {
        fs.unlink(file.path, (err) => {
          if (err) {
            this.logger.warn(
              `Failed to delete temporary file: ${JSON.stringify({
                path: file.path,
                error: err.message,
              })}`,
            );
          }
        });
      }
    }
  }

  async deleteFile(publicId: string, acceptLanguage?: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to delete file from Cloudinary: ${JSON.stringify({ publicId })}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new InternalServerErrorException({
        status: 500,
        code: 'CLOUDINARY.DELETE_FAILED',
        message: this.i18n.translate('errors.cloudinary.delete_failed', {
          lang: acceptLanguage,
        }),
      });
    }
  }
}
