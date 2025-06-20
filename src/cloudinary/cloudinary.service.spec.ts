import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import { extractPublicId } from 'cloudinary-build-url';
import { MockCustomLogger } from '../test/mocks';
import { CustomLogger } from '../common/services/logger.service';
import { AttachmentEntityType } from '../attachments/entities/attachment.entity';

jest.mock('cloudinary');
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    access: jest.fn().mockResolvedValue(undefined),
  },
  unlink: jest.fn((path, callback) => callback(null)),
}));
jest.mock('cloudinary-build-url', () => ({
  extractPublicId: jest.fn((url: string) => {
    if (url.includes('cloudinary.com')) {
      return 'test-project/dev/avatars/user123/avatar-123';
    }
    return null;
  }),
}));

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let i18nService: I18nService;
  let mockConfigService: Partial<ConfigService>;
  let mockI18nService: Partial<I18nService>;
  let mockLogger: MockCustomLogger;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        const config = {
          CLOUDINARY_CLOUD_NAME: 'test-cloud',
          CLOUDINARY_API_KEY: 'test-key',
          CLOUDINARY_API_SECRET: 'test-secret',
          PROJECT_NAME: 'test-project',
          NODE_ENV: 'test',
        };
        return config[key];
      }),
    };

    mockI18nService = {
      translate: jest.fn().mockReturnValue('translated message'),
    };

    mockLogger = new MockCustomLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudinaryService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: I18nService, useValue: mockI18nService },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<CloudinaryService>(CloudinaryService);
    i18nService = module.get<I18nService>(I18nService);

    // Verify cloudinary.config was called during service instantiation
    expect(cloudinary.config).toHaveBeenCalledWith({
      cloud_name: 'test-cloud',
      api_key: 'test-key',
      api_secret: 'test-secret',
    });

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should throw error when Cloudinary credentials are missing', async () => {
      const invalidConfigService = {
        get: jest.fn((key: string) => {
          const config = {
            CLOUDINARY_CLOUD_NAME: null,
            CLOUDINARY_API_KEY: null,
            CLOUDINARY_API_SECRET: null,
            PROJECT_NAME: 'test-project',
            NODE_ENV: 'test',
          };
          return config[key];
        }),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            CloudinaryService,
            { provide: ConfigService, useValue: invalidConfigService },
            { provide: I18nService, useValue: mockI18nService },
            { provide: CustomLogger, useValue: mockLogger },
          ],
        }).compile(),
      ).rejects.toThrow('Missing Cloudinary credentials');
    });
  });

  describe('uploadFile', () => {
    const mockFile = {
      fieldname: 'file',
      originalname: 'test.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: Buffer.from('test'),
      size: 1024,
      path: '/tmp/test.pdf',
      stream: {},
      destination: '/tmp',
      filename: 'test.pdf',
    } as Express.Multer.File;

    const mockEntityType = AttachmentEntityType.PROJECT;
    const mockEntityId = 'project123';
    const mockUploadedById = 'user123';
    const mockAcceptLanguage = 'en';

    it('should successfully upload a PDF file from buffer', async () => {
      const mockUploadResult = {
        secure_url: 'https://cloudinary.com/test.pdf',
        public_id:
          'test-project/dev/projects/project123/attachments/user123/file-123.pdf',
        version: '123',
      };

      (cloudinary.uploader.upload as jest.Mock).mockResolvedValue(
        mockUploadResult,
      );

      const result = await service.uploadFile(
        mockFile,
        mockEntityType,
        mockEntityId,
        mockUploadedById,
        mockAcceptLanguage,
      );

      expect(result).toEqual({
        url: mockUploadResult.secure_url,
        publicId: mockUploadResult.public_id,
        version: mockUploadResult.version,
      });
      expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
        expect.stringContaining('data:application/pdf;base64,'),
        {
          public_id: expect.stringContaining(
            'test-project/dev/projects/project123/attachments/user123/file-',
          ),
          resource_type: 'auto',
        },
      );
    });

    it('should successfully upload a file from path', async () => {
      const pathFile = {
        ...mockFile,
        buffer: null,
        path: '/tmp/test.pdf',
      } as Express.Multer.File;

      const mockUploadResult = {
        secure_url: 'https://cloudinary.com/test.pdf',
        public_id:
          'test-project/dev/projects/project123/attachments/user123/file-123.pdf',
        version: '123',
      };

      (cloudinary.uploader.upload as jest.Mock).mockResolvedValue(
        mockUploadResult,
      );

      const result = await service.uploadFile(
        pathFile,
        mockEntityType,
        mockEntityId,
        mockUploadedById,
        mockAcceptLanguage,
      );

      expect(result).toEqual({
        url: mockUploadResult.secure_url,
        publicId: mockUploadResult.public_id,
        version: mockUploadResult.version,
      });
      expect(cloudinary.uploader.upload).toHaveBeenCalledWith(pathFile.path, {
        public_id: expect.stringContaining(
          'test-project/dev/projects/project123/attachments/user123/file-',
        ),
        resource_type: 'auto',
      });
    });

    it('should successfully upload a DOCX file with octet-stream mimetype using extension validation', async () => {
      const docxFile = {
        ...mockFile,
        originalname: 'test.docx',
        mimetype: 'application/octet-stream',
      } as Express.Multer.File;

      const mockUploadResult = {
        secure_url: 'https://cloudinary.com/test.docx',
        public_id:
          'test-project/dev/projects/project123/attachments/user123/file-123.docx',
        version: '123',
      };

      (cloudinary.uploader.upload as jest.Mock).mockResolvedValue(
        mockUploadResult,
      );

      const result = await service.uploadFile(
        docxFile,
        mockEntityType,
        mockEntityId,
        mockUploadedById,
        mockAcceptLanguage,
      );

      expect(result).toEqual({
        url: mockUploadResult.secure_url,
        publicId: mockUploadResult.public_id,
        version: mockUploadResult.version,
      });
    });

    it('should throw BadRequestException for invalid file type', async () => {
      const invalidFile = {
        ...mockFile,
        mimetype: 'application/html',
        originalname: 'test.html',
      } as Express.Multer.File;

      await expect(
        service.uploadFile(
          invalidFile,
          mockEntityType,
          mockEntityId,
          mockUploadedById,
          mockAcceptLanguage,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(i18nService.translate).toHaveBeenCalledWith(
        'errors.cloudinary.invalid_file_type',
        { lang: mockAcceptLanguage },
      );
    });

    it('should throw BadRequestException for octet-stream with invalid extension', async () => {
      const invalidFile = {
        ...mockFile,
        mimetype: 'application/octet-stream',
        originalname: 'test.html',
      } as Express.Multer.File;

      await expect(
        service.uploadFile(
          invalidFile,
          mockEntityType,
          mockEntityId,
          mockUploadedById,
          mockAcceptLanguage,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(i18nService.translate).toHaveBeenCalledWith(
        'errors.cloudinary.invalid_file_type',
        { lang: mockAcceptLanguage },
      );
    });

    it('should throw BadRequestException for file too large (document)', async () => {
      const largeFile = {
        ...mockFile,
        size: 11 * 1024 * 1024, // 11MB
      } as Express.Multer.File;

      await expect(
        service.uploadFile(
          largeFile,
          mockEntityType,
          mockEntityId,
          mockUploadedById,
          mockAcceptLanguage,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(i18nService.translate).toHaveBeenCalledWith(
        'errors.cloudinary.file_too_large',
        { lang: mockAcceptLanguage, args: { maxSize: 10 } },
      );
    });

    it('should throw BadRequestException for file too large (image)', async () => {
      const largeImageFile = {
        ...mockFile,
        mimetype: 'image/jpeg',
        size: 6 * 1024 * 1024, // 6MB
      } as Express.Multer.File;

      await expect(
        service.uploadFile(
          largeImageFile,
          mockEntityType,
          mockEntityId,
          mockUploadedById,
          mockAcceptLanguage,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(i18nService.translate).toHaveBeenCalledWith(
        'errors.cloudinary.file_too_large',
        { lang: mockAcceptLanguage, args: { maxSize: 5 } },
      );
    });

    it('should throw BadRequestException for missing file content', async () => {
      const invalidFile = {
        ...mockFile,
        buffer: null,
        path: null,
      } as Express.Multer.File;

      await expect(
        service.uploadFile(
          invalidFile,
          mockEntityType,
          mockEntityId,
          mockUploadedById,
          mockAcceptLanguage,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(i18nService.translate).toHaveBeenCalledWith(
        'errors.cloudinary.invalid_file',
        { lang: mockAcceptLanguage },
      );
    });

    it('should throw BadRequestException when file is not accessible', async () => {
      const pathFile = {
        ...mockFile,
        buffer: null,
        path: '/tmp/test.pdf',
      } as Express.Multer.File;

      (fs.promises.access as jest.Mock).mockRejectedValueOnce(
        new Error('File not accessible'),
      );

      await expect(
        service.uploadFile(
          pathFile,
          mockEntityType,
          mockEntityId,
          mockUploadedById,
          mockAcceptLanguage,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(i18nService.translate).toHaveBeenCalledWith(
        'errors.cloudinary.invalid_file',
        { lang: mockAcceptLanguage },
      );
    });

    it('should throw InternalServerErrorException when buffer upload fails', async () => {
      (cloudinary.uploader.upload as jest.Mock).mockRejectedValue(
        new Error('Upload failed'),
      );

      await expect(
        service.uploadFile(
          mockFile,
          mockEntityType,
          mockEntityId,
          mockUploadedById,
          mockAcceptLanguage,
        ),
      ).rejects.toThrow(InternalServerErrorException);

      expect(i18nService.translate).toHaveBeenCalledWith(
        'errors.cloudinary.upload_failed',
        { lang: mockAcceptLanguage },
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to upload buffer to Cloudinary'),
        expect.any(String),
      );
    });

    it('should throw InternalServerErrorException when path upload fails', async () => {
      const pathFile = {
        ...mockFile,
        buffer: null,
        path: '/tmp/test.pdf',
      } as Express.Multer.File;

      (cloudinary.uploader.upload as jest.Mock).mockRejectedValue(
        new Error('Upload failed'),
      );

      await expect(
        service.uploadFile(
          pathFile,
          mockEntityType,
          mockEntityId,
          mockUploadedById,
          mockAcceptLanguage,
        ),
      ).rejects.toThrow(InternalServerErrorException);

      expect(i18nService.translate).toHaveBeenCalledWith(
        'errors.cloudinary.upload_failed',
        { lang: mockAcceptLanguage },
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to upload file to Cloudinary'),
        expect.any(String),
      );
    });

    it('should clean up temporary file after upload', async () => {
      const pathFile = {
        ...mockFile,
        buffer: null,
        path: '/tmp/test.pdf',
      } as Express.Multer.File;

      const mockUploadResult = {
        secure_url: 'https://cloudinary.com/test.pdf',
        public_id:
          'test-project/dev/projects/project123/attachments/user123/file-123.pdf',
        version: '123',
      };

      (cloudinary.uploader.upload as jest.Mock).mockResolvedValue(
        mockUploadResult,
      );

      await service.uploadFile(
        pathFile,
        mockEntityType,
        mockEntityId,
        mockUploadedById,
        mockAcceptLanguage,
      );

      expect(fs.unlink).toHaveBeenCalledWith(
        pathFile.path,
        expect.any(Function),
      );
    });

    it('should handle task entity type correctly', async () => {
      const mockUploadResult = {
        secure_url: 'https://cloudinary.com/test.pdf',
        public_id:
          'test-project/dev/tasks/task123/attachments/user123/file-123.pdf',
        version: '123',
      };

      (cloudinary.uploader.upload as jest.Mock).mockResolvedValue(
        mockUploadResult,
      );

      const result = await service.uploadFile(
        mockFile,
        AttachmentEntityType.TASK,
        'task123',
        mockUploadedById,
        mockAcceptLanguage,
      );

      expect(result).toEqual({
        url: mockUploadResult.secure_url,
        publicId: mockUploadResult.public_id,
        version: mockUploadResult.version,
      });
      expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
        expect.stringContaining('data:application/pdf;base64,'),
        {
          public_id: expect.stringContaining(
            'test-project/dev/tasks/task123/attachments/user123/file-',
          ),
          resource_type: 'auto',
        },
      );
    });

    it('should throw error for unsupported entity type', async () => {
      await expect(
        service.uploadFile(
          mockFile,
          'UNSUPPORTED' as AttachmentEntityType,
          mockEntityId,
          mockUploadedById,
          mockAcceptLanguage,
        ),
      ).rejects.toThrow(InternalServerErrorException);

      expect(i18nService.translate).toHaveBeenCalledWith(
        'errors.cloudinary.upload_failed',
        { lang: mockAcceptLanguage },
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to upload file to Cloudinary'),
        expect.any(String),
      );
    });
  });

  describe('deleteFile', () => {
    const mockPublicId =
      'test-project/dev/projects/project123/attachments/user123/file-123.pdf';
    const mockAcceptLanguage = 'en';

    it('should successfully delete a file', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({
        result: 'ok',
      });

      await service.deleteFile(mockPublicId, mockAcceptLanguage);

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(mockPublicId);
    });

    it('should throw InternalServerErrorException when deletion fails', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockRejectedValue(
        new Error('Delete failed'),
      );

      await expect(
        service.deleteFile(mockPublicId, mockAcceptLanguage),
      ).rejects.toThrow(InternalServerErrorException);

      expect(i18nService.translate).toHaveBeenCalledWith(
        'errors.cloudinary.delete_failed',
        { lang: mockAcceptLanguage },
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete file from Cloudinary'),
        expect.any(String),
      );
    });
  });

  describe('uploadImage', () => {
    const mockFile = {
      fieldname: 'avatar',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test'),
      size: 1024,
      path: '/tmp/test.jpg',
      stream: {},
      destination: '/tmp',
      filename: 'test.jpg',
    } as Express.Multer.File;

    const mockUserId = 'user123';
    const mockAcceptLanguage = 'en';

    it('should successfully upload an image', async () => {
      const mockUploadResult = {
        secure_url: 'https://cloudinary.com/test.jpg',
        public_id: 'test-project/dev/avatars/user123/avatar-123',
        version: '123',
      };

      (cloudinary.uploader.upload as jest.Mock).mockResolvedValue(
        mockUploadResult,
      );

      const result = await service.uploadImage(
        mockFile,
        mockUserId,
        mockAcceptLanguage,
      );

      expect(result).toEqual({
        url: mockUploadResult.secure_url,
        publicId: mockUploadResult.public_id,
        version: mockUploadResult.version,
      });
      expect(cloudinary.uploader.upload).toHaveBeenCalledWith(mockFile.path, {
        public_id: expect.stringContaining(
          'test-project/dev/avatars/user123/avatar-',
        ),
        resource_type: 'auto',
      });
    });

    it('should throw BadRequestException for invalid file type', async () => {
      const invalidFile = {
        ...mockFile,
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      await expect(
        service.uploadImage(invalidFile, mockUserId, mockAcceptLanguage),
      ).rejects.toThrow(BadRequestException);

      expect(i18nService.translate).toHaveBeenCalledWith(
        'errors.cloudinary.invalid_file',
        { lang: mockAcceptLanguage },
      );
    });

    it('should throw BadRequestException for file too large', async () => {
      const largeFile = {
        ...mockFile,
        size: 6 * 1024 * 1024,
      } as Express.Multer.File; // 6MB

      await expect(
        service.uploadImage(largeFile, mockUserId, mockAcceptLanguage),
      ).rejects.toThrow(BadRequestException);

      expect(i18nService.translate).toHaveBeenCalledWith(
        'errors.cloudinary.invalid_file',
        { lang: mockAcceptLanguage },
      );
    });

    it('should throw BadRequestException for missing file content', async () => {
      const invalidFile = {
        ...mockFile,
        buffer: null,
        path: null,
      } as Express.Multer.File;

      await expect(
        service.uploadImage(invalidFile, mockUserId, mockAcceptLanguage),
      ).rejects.toThrow(BadRequestException);

      expect(i18nService.translate).toHaveBeenCalledWith(
        'errors.cloudinary.invalid_file',
        { lang: mockAcceptLanguage },
      );
    });

    it('should throw BadRequestException when file is not accessible', async () => {
      (fs.promises.access as jest.Mock).mockRejectedValueOnce(
        new Error('File not accessible'),
      );

      await expect(
        service.uploadImage(mockFile, mockUserId, mockAcceptLanguage),
      ).rejects.toThrow(BadRequestException);

      expect(i18nService.translate).toHaveBeenCalledWith(
        'errors.cloudinary.invalid_file',
        { lang: mockAcceptLanguage },
      );
    });

    it('should throw InternalServerErrorException when upload fails', async () => {
      (cloudinary.uploader.upload as jest.Mock).mockRejectedValue(
        new Error('Upload failed'),
      );

      await expect(
        service.uploadImage(mockFile, mockUserId, mockAcceptLanguage),
      ).rejects.toThrow(InternalServerErrorException);

      expect(i18nService.translate).toHaveBeenCalledWith(
        'errors.cloudinary.upload_failed',
        { lang: mockAcceptLanguage },
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to upload image to Cloudinary'),
        expect.any(String),
      );
    });

    it('should clean up temporary file after upload', async () => {
      const mockUploadResult = {
        secure_url: 'https://cloudinary.com/test.jpg',
        public_id: 'test-project/dev/avatars/user123/avatar-123',
        version: '123',
      };

      (cloudinary.uploader.upload as jest.Mock).mockResolvedValue(
        mockUploadResult,
      );

      await service.uploadImage(mockFile, mockUserId, mockAcceptLanguage);

      expect(fs.unlink).toHaveBeenCalledWith(
        mockFile.path,
        expect.any(Function),
      );
    });
  });

  describe('deleteImage', () => {
    const mockPublicId = 'test-project/dev/avatars/user123/avatar-123';
    const mockAcceptLanguage = 'en';

    it('should successfully delete an image', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({
        result: 'ok',
      });

      await service.deleteImage(mockPublicId, mockAcceptLanguage);

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(mockPublicId);
    });

    it('should throw InternalServerErrorException when deletion fails', async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockRejectedValue(
        new Error('Delete failed'),
      );

      await expect(
        service.deleteImage(mockPublicId, mockAcceptLanguage),
      ).rejects.toThrow(InternalServerErrorException);

      expect(i18nService.translate).toHaveBeenCalledWith(
        'errors.cloudinary.delete_failed',
        { lang: mockAcceptLanguage },
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete image from Cloudinary'),
        expect.any(String),
      );
    });
  });

  describe('extractPublicIdFromUrl', () => {
    it('should extract public ID from a valid Cloudinary URL', () => {
      const url =
        'https://res.cloudinary.com/test-cloud/image/upload/v123/test-project/dev/avatars/user123/avatar-123.jpg';
      const result = service.extractPublicIdFromUrl(url);
      expect(result).toBe('test-project/dev/avatars/user123/avatar-123');
      expect(extractPublicId).toHaveBeenCalledWith(url);
    });

    it('should return null for invalid URL', () => {
      const url = 'https://invalid-url.com/image.jpg';
      const result = service.extractPublicIdFromUrl(url);
      expect(result).toBeNull();
      expect(extractPublicId).toHaveBeenCalledWith(url);
    });
  });
});
