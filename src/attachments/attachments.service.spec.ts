import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { AttachmentsService } from './attachments.service';
import { Attachment, AttachmentEntityType } from './entities/attachment.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ProjectPermissionService } from '../projects/services/project-permission.service';
import { ProjectRole } from '../projects/enums/project-role.enum';
import { CustomLogger } from '../common/services/logger.service';
import { AttachmentResponseDto } from './dto/attachment-response.dto';
import { MockCustomLogger } from '../test/mocks';

describe('AttachmentsService', () => {
  let service: AttachmentsService;
  let mockLogger: MockCustomLogger;

  const mockAttachmentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
    remove: jest.fn(),
  };

  const mockCloudinaryService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockI18nService = {
    translate: jest.fn(),
  };

  const mockProjectPermissionService = {
    hasProjectPermission: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  const mockAttachment = {
    id: 'attachment-1',
    filename: 'test.pdf',
    fileType: 'application/pdf',
    fileSize: 1024,
    cloudinaryUrl: 'https://cloudinary.com/test.pdf',
    cloudinaryPublicId: 'test-public-id',
    entityType: AttachmentEntityType.PROJECT,
    entityId: 'project-1',
    uploadedById: 'user-1',
    uploadedBy: mockUser,
    uploadedAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    destination: '',
    filename: '',
    path: '',
    buffer: Buffer.from('test'),
    stream: null,
  };

  beforeEach(async () => {
    mockLogger = new MockCustomLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentsService,
        {
          provide: getRepositoryToken(Attachment),
          useValue: mockAttachmentRepository,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
        {
          provide: ProjectPermissionService,
          useValue: mockProjectPermissionService,
        },
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<AttachmentsService>(AttachmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('uploadAttachment', () => {
    it('should upload project attachment successfully', async () => {
      // Arrange
      const projectId = 'project-1';
      const userId = 'user-1';
      const acceptLanguage = 'en';
      const uploadResult = {
        url: 'https://cloudinary.com/test.pdf',
        publicId: 'test-public-id',
      };

      mockProjectPermissionService.hasProjectPermission.mockResolvedValue(true);
      mockCloudinaryService.uploadFile.mockResolvedValue(uploadResult);
      mockAttachmentRepository.create.mockReturnValue(mockAttachment);
      mockAttachmentRepository.save.mockResolvedValue(mockAttachment);
      mockAttachmentRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockAttachment),
      });

      // Act
      const result = await service.uploadAttachment(
        mockFile,
        AttachmentEntityType.PROJECT,
        projectId,
        userId,
        projectId,
        acceptLanguage,
      );

      // Assert
      expect(
        mockProjectPermissionService.hasProjectPermission,
      ).toHaveBeenCalledWith(userId, projectId, ProjectRole.WRITE);
      expect(mockCloudinaryService.uploadFile).toHaveBeenCalledWith(
        mockFile,
        AttachmentEntityType.PROJECT,
        projectId,
        userId,
        acceptLanguage,
      );
      expect(mockAttachmentRepository.create).toHaveBeenCalledWith({
        filename: mockFile.originalname,
        fileType: mockFile.mimetype,
        fileSize: mockFile.size,
        cloudinaryUrl: uploadResult.url,
        cloudinaryPublicId: uploadResult.publicId,
        entityType: AttachmentEntityType.PROJECT,
        entityId: projectId,
        uploadedById: userId,
      });
      expect(result).toBeInstanceOf(AttachmentResponseDto);
    });

    it('should upload task attachment successfully', async () => {
      // Arrange
      const projectId = 'project-1';
      const taskId = 'task-1';
      const userId = 'user-1';
      const acceptLanguage = 'en';
      const uploadResult = {
        url: 'https://cloudinary.com/test.pdf',
        publicId: 'test-public-id',
      };

      mockProjectPermissionService.hasProjectPermission.mockResolvedValue(true);
      mockCloudinaryService.uploadFile.mockResolvedValue(uploadResult);
      mockAttachmentRepository.create.mockReturnValue(mockAttachment);
      mockAttachmentRepository.save.mockResolvedValue(mockAttachment);
      mockAttachmentRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockAttachment),
      });

      // Act
      const result = await service.uploadAttachment(
        mockFile,
        AttachmentEntityType.TASK,
        taskId,
        userId,
        projectId,
        acceptLanguage,
      );

      // Assert
      expect(
        mockProjectPermissionService.hasProjectPermission,
      ).toHaveBeenCalledWith(userId, projectId, ProjectRole.WRITE);
      expect(mockCloudinaryService.uploadFile).toHaveBeenCalledWith(
        mockFile,
        AttachmentEntityType.TASK,
        taskId,
        userId,
        acceptLanguage,
      );
      expect(result).toBeInstanceOf(AttachmentResponseDto);
    });

    it('should throw ForbiddenException when user lacks permission for project upload', async () => {
      // Arrange
      const projectId = 'project-1';
      const userId = 'user-1';
      const acceptLanguage = 'en';

      mockProjectPermissionService.hasProjectPermission.mockResolvedValue(
        false,
      );
      mockI18nService.translate.mockReturnValue('Insufficient permissions');

      // Act & Assert
      await expect(
        service.uploadAttachment(
          mockFile,
          AttachmentEntityType.PROJECT,
          projectId,
          userId,
          projectId,
          acceptLanguage,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(
        mockProjectPermissionService.hasProjectPermission,
      ).toHaveBeenCalledWith(userId, projectId, ProjectRole.WRITE);
    });

    it('should throw ForbiddenException when user lacks permission for task upload', async () => {
      // Arrange
      const projectId = 'project-1';
      const taskId = 'task-1';
      const userId = 'user-1';
      const acceptLanguage = 'en';

      mockProjectPermissionService.hasProjectPermission.mockResolvedValue(
        false,
      );
      mockI18nService.translate.mockReturnValue('Insufficient permissions');

      // Act & Assert
      await expect(
        service.uploadAttachment(
          mockFile,
          AttachmentEntityType.TASK,
          taskId,
          userId,
          projectId,
          acceptLanguage,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(
        mockProjectPermissionService.hasProjectPermission,
      ).toHaveBeenCalledWith(userId, projectId, ProjectRole.WRITE);
    });
  });

  describe('getAttachments', () => {
    it('should return attachments for project', async () => {
      // Arrange
      const projectId = 'project-1';
      const userId = 'user-1';
      const acceptLanguage = 'en';
      const mockAttachments = [mockAttachment];

      mockProjectPermissionService.hasProjectPermission.mockResolvedValue(true);
      mockAttachmentRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAttachments),
      });

      // Act
      const result = await service.getAttachments(
        AttachmentEntityType.PROJECT,
        projectId,
        projectId,
        userId,
        acceptLanguage,
      );

      // Assert
      expect(
        mockProjectPermissionService.hasProjectPermission,
      ).toHaveBeenCalledWith(userId, projectId, ProjectRole.READ);
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(AttachmentResponseDto);
    });

    it('should return attachments for task', async () => {
      // Arrange
      const projectId = 'project-1';
      const taskId = 'task-1';
      const userId = 'user-1';
      const acceptLanguage = 'en';
      const mockAttachments = [mockAttachment];

      mockProjectPermissionService.hasProjectPermission.mockResolvedValue(true);
      mockAttachmentRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAttachments),
      });

      // Act
      const result = await service.getAttachments(
        AttachmentEntityType.TASK,
        taskId,
        projectId,
        userId,
        acceptLanguage,
      );

      // Assert
      expect(
        mockProjectPermissionService.hasProjectPermission,
      ).toHaveBeenCalledWith(userId, projectId, ProjectRole.READ);
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(AttachmentResponseDto);
    });

    it('should throw ForbiddenException when user lacks permission', async () => {
      // Arrange
      const projectId = 'project-1';
      const userId = 'user-1';
      const acceptLanguage = 'en';

      mockProjectPermissionService.hasProjectPermission.mockResolvedValue(
        false,
      );
      mockI18nService.translate.mockReturnValue('Insufficient permissions');

      // Act & Assert
      await expect(
        service.getAttachments(
          AttachmentEntityType.PROJECT,
          projectId,
          projectId,
          userId,
          acceptLanguage,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return empty array when no attachments found', async () => {
      // Arrange
      const projectId = 'project-1';
      const userId = 'user-1';
      const acceptLanguage = 'en';

      mockProjectPermissionService.hasProjectPermission.mockResolvedValue(true);
      mockAttachmentRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });

      // Act
      const result = await service.getAttachments(
        AttachmentEntityType.PROJECT,
        projectId,
        projectId,
        userId,
        acceptLanguage,
      );

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('deleteAttachment', () => {
    it('should delete attachment when user is uploader', async () => {
      // Arrange
      const attachmentId = 'attachment-1';
      const projectId = 'project-1';
      const userId = 'user-1';
      const acceptLanguage = 'en';

      mockAttachmentRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockAttachment),
      });
      mockCloudinaryService.deleteFile.mockResolvedValue(undefined);
      mockAttachmentRepository.remove.mockResolvedValue(undefined);

      // Act
      await service.deleteAttachment(
        attachmentId,
        projectId,
        userId,
        acceptLanguage,
      );

      // Assert
      expect(mockCloudinaryService.deleteFile).toHaveBeenCalledWith(
        mockAttachment.cloudinaryPublicId,
        acceptLanguage,
      );
      expect(mockAttachmentRepository.remove).toHaveBeenCalledWith(
        mockAttachment,
      );
    });

    it('should delete attachment when user is admin', async () => {
      // Arrange
      const attachmentId = 'attachment-1';
      const projectId = 'project-1';
      const userId = 'admin-user';
      const acceptLanguage = 'en';
      const adminAttachment = { ...mockAttachment, uploadedById: 'other-user' };

      mockAttachmentRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(adminAttachment),
      });
      mockProjectPermissionService.hasProjectPermission.mockResolvedValue(true);
      mockCloudinaryService.deleteFile.mockResolvedValue(undefined);
      mockAttachmentRepository.remove.mockResolvedValue(undefined);

      // Act
      await service.deleteAttachment(
        attachmentId,
        projectId,
        userId,
        acceptLanguage,
      );

      // Assert
      expect(
        mockProjectPermissionService.hasProjectPermission,
      ).toHaveBeenCalledWith(userId, projectId, ProjectRole.ADMIN);
      expect(mockCloudinaryService.deleteFile).toHaveBeenCalled();
      expect(mockAttachmentRepository.remove).toHaveBeenCalled();
    });

    it('should throw NotFoundException when attachment not found', async () => {
      // Arrange
      const attachmentId = 'non-existent';
      const projectId = 'project-1';
      const userId = 'user-1';
      const acceptLanguage = 'en';

      mockAttachmentRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });
      mockI18nService.translate.mockReturnValue('Attachment not found');

      // Act & Assert
      await expect(
        service.deleteAttachment(
          attachmentId,
          projectId,
          userId,
          acceptLanguage,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not uploader or admin', async () => {
      // Arrange
      const attachmentId = 'attachment-1';
      const projectId = 'project-1';
      const userId = 'other-user';
      const acceptLanguage = 'en';
      const otherUserAttachment = {
        ...mockAttachment,
        uploadedById: 'different-user',
      };

      mockAttachmentRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(otherUserAttachment),
      });
      mockProjectPermissionService.hasProjectPermission.mockResolvedValue(
        false,
      );
      mockI18nService.translate.mockReturnValue('Cannot delete attachment');

      // Act & Assert
      await expect(
        service.deleteAttachment(
          attachmentId,
          projectId,
          userId,
          acceptLanguage,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle Cloudinary deletion error', async () => {
      // Arrange
      const attachmentId = 'attachment-1';
      const projectId = 'project-1';
      const userId = 'user-1';
      const acceptLanguage = 'en';
      const cloudinaryError = new Error('Cloudinary error');

      mockAttachmentRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockAttachment),
      });
      mockCloudinaryService.deleteFile.mockRejectedValue(cloudinaryError);

      // Act & Assert
      await expect(
        service.deleteAttachment(
          attachmentId,
          projectId,
          userId,
          acceptLanguage,
        ),
      ).rejects.toThrow(cloudinaryError);
    });
  });

  describe('getAttachmentById', () => {
    it('should return attachment by ID', async () => {
      // Arrange
      const attachmentId = 'attachment-1';
      const projectId = 'project-1';
      const userId = 'user-1';
      const acceptLanguage = 'en';

      mockProjectPermissionService.hasProjectPermission.mockResolvedValue(true);
      mockAttachmentRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockAttachment),
      });

      // Act
      const result = await service.getAttachmentById(
        attachmentId,
        projectId,
        userId,
        acceptLanguage,
      );

      // Assert
      expect(
        mockProjectPermissionService.hasProjectPermission,
      ).toHaveBeenCalledWith(userId, projectId, ProjectRole.READ);
      expect(result).toBeInstanceOf(AttachmentResponseDto);
    });

    it('should throw ForbiddenException when user lacks permission', async () => {
      // Arrange
      const attachmentId = 'attachment-1';
      const projectId = 'project-1';
      const userId = 'user-1';
      const acceptLanguage = 'en';

      mockProjectPermissionService.hasProjectPermission.mockResolvedValue(
        false,
      );
      mockI18nService.translate.mockReturnValue('Insufficient permissions');

      // Act & Assert
      await expect(
        service.getAttachmentById(
          attachmentId,
          projectId,
          userId,
          acceptLanguage,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when attachment not found', async () => {
      // Arrange
      const attachmentId = 'non-existent';
      const projectId = 'project-1';
      const userId = 'user-1';
      const acceptLanguage = 'en';

      mockProjectPermissionService.hasProjectPermission.mockResolvedValue(true);
      mockAttachmentRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });
      mockI18nService.translate.mockReturnValue('Attachment not found');

      // Act & Assert
      await expect(
        service.getAttachmentById(
          attachmentId,
          projectId,
          userId,
          acceptLanguage,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAttachmentsCountForProjectAndDateRange', () => {
    it('should return correct count of attachments for project in date range', async () => {
      // Arrange
      const projectId = 'project-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const expectedCount = 8;

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(expectedCount),
      };

      jest
        .spyOn(mockAttachmentRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getAttachmentsCountForProjectAndDateRange(
        projectId,
        startDate,
        endDate,
      );

      // Assert
      expect(result).toBe(expectedCount);
      expect(mockAttachmentRepository.createQueryBuilder).toHaveBeenCalledWith(
        'attachment',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        '(attachment.entityType = :projectType AND attachment.entityId = :projectId) OR (attachment.entityType = :taskType AND attachment.entityId IN (SELECT id FROM tasks WHERE project_id = :projectId))',
        {
          projectType: 'PROJECT',
          taskType: 'TASK',
          projectId,
        },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'attachment.uploadedAt >= :startDate',
        { startDate },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'attachment.uploadedAt <= :endDate',
        { endDate },
      );
      expect(mockQueryBuilder.getCount).toHaveBeenCalled();
    });

    it('should return 0 when no attachments found', async () => {
      // Arrange
      const projectId = 'project-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };

      jest
        .spyOn(mockAttachmentRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getAttachmentsCountForProjectAndDateRange(
        projectId,
        startDate,
        endDate,
      );

      // Assert
      expect(result).toBe(0);
    });

    it('should handle database errors gracefully and return 0', async () => {
      // Arrange
      const projectId = 'project-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest
          .fn()
          .mockRejectedValue(new Error('Database connection failed')),
      };

      jest
        .spyOn(mockAttachmentRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getAttachmentsCountForProjectAndDateRange(
        projectId,
        startDate,
        endDate,
      );

      // Assert
      expect(result).toBe(0);
    });
  });
});
