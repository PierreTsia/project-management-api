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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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

  async uploadImage(
    file: Express.Multer.File,
    userId: string,
    acceptLanguage?: string,
  ) {
    try {
      // Validate file type
      const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!supportedMimeTypes.includes(file.mimetype)) {
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
}
