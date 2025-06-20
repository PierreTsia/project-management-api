import { Test, TestingModule } from '@nestjs/testing';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { CustomLogger } from '../common/services/logger.service';
import { AttachmentEntityType } from './entities/attachment.entity';
import { AttachmentResponseDto } from './dto/attachment-response.dto';
import { User } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectPermissionGuard } from '../projects/guards/project-permission.guard';
import { ProjectPermissionService } from '../projects/services/project-permission.service';
import { I18nService } from 'nestjs-i18n';

describe('AttachmentsController', () => {
  let controller: AttachmentsController;

  const mockAttachmentsService = {
    uploadAttachment: jest.fn(),
    getAttachments: jest.fn(),
    deleteAttachment: jest.fn(),
    getAttachmentById: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  };

  const mockProjectPermissionService = {
    hasProjectPermission: jest.fn(),
  };

  const mockI18nService = {
    translate: jest.fn(),
  };

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    refreshTokens: [],
    password: 'hashedPassword',
    isEmailConfirmed: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAttachmentResponse: AttachmentResponseDto = {
    id: 'attachment-1',
    filename: 'test.pdf',
    fileType: 'application/pdf',
    fileSize: 1024,
    cloudinaryUrl: 'https://cloudinary.com/test.pdf',
    cloudinaryPublicId: 'test-public-id',
    entityType: AttachmentEntityType.PROJECT,
    entityId: 'project-1',
    uploadedBy: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      bio: null,
      dob: null,
      phone: null,
      avatarUrl: 'https://example.com/avatar.jpg',
      isEmailConfirmed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
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
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttachmentsController],
      providers: [
        {
          provide: AttachmentsService,
          useValue: mockAttachmentsService,
        },
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
        {
          provide: ProjectPermissionService,
          useValue: mockProjectPermissionService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ProjectPermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AttachmentsController>(AttachmentsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadProjectAttachment', () => {
    it('should upload project attachment successfully', async () => {
      // Arrange
      const projectId = 'project-1';
      const acceptLanguage = 'en';

      mockAttachmentsService.uploadAttachment.mockResolvedValue(
        mockAttachmentResponse,
      );

      // Act
      const result = await controller.uploadProjectAttachment(
        projectId,
        mockFile,
        mockUser,
        acceptLanguage,
      );

      // Assert
      expect(mockAttachmentsService.uploadAttachment).toHaveBeenCalledWith(
        mockFile,
        AttachmentEntityType.PROJECT,
        projectId,
        mockUser.id,
        projectId,
        acceptLanguage,
      );
      expect(result).toEqual(mockAttachmentResponse);
    });

    it('should use default accept-language when not provided', async () => {
      // Arrange
      const projectId = 'project-1';

      mockAttachmentsService.uploadAttachment.mockResolvedValue(
        mockAttachmentResponse,
      );

      // Act
      const result = await controller.uploadProjectAttachment(
        projectId,
        mockFile,
        mockUser,
      );

      // Assert
      expect(mockAttachmentsService.uploadAttachment).toHaveBeenCalledWith(
        mockFile,
        AttachmentEntityType.PROJECT,
        projectId,
        mockUser.id,
        projectId,
        'en',
      );
      expect(result).toEqual(mockAttachmentResponse);
    });
  });

  describe('getProjectAttachments', () => {
    it('should return project attachments successfully', async () => {
      // Arrange
      const projectId = 'project-1';
      const acceptLanguage = 'en';
      const mockAttachments = [mockAttachmentResponse];

      mockAttachmentsService.getAttachments.mockResolvedValue(mockAttachments);

      // Act
      const result = await controller.getProjectAttachments(
        projectId,
        mockUser,
        acceptLanguage,
      );

      // Assert
      expect(mockAttachmentsService.getAttachments).toHaveBeenCalledWith(
        AttachmentEntityType.PROJECT,
        projectId,
        projectId,
        mockUser.id,
        acceptLanguage,
      );
      expect(result).toEqual(mockAttachments);
    });

    it('should use default accept-language when not provided', async () => {
      // Arrange
      const projectId = 'project-1';
      const mockAttachments = [mockAttachmentResponse];

      mockAttachmentsService.getAttachments.mockResolvedValue(mockAttachments);

      // Act
      const result = await controller.getProjectAttachments(
        projectId,
        mockUser,
      );

      // Assert
      expect(mockAttachmentsService.getAttachments).toHaveBeenCalledWith(
        AttachmentEntityType.PROJECT,
        projectId,
        projectId,
        mockUser.id,
        'en',
      );
      expect(result).toEqual(mockAttachments);
    });
  });

  describe('deleteProjectAttachment', () => {
    it('should delete project attachment successfully', async () => {
      // Arrange
      const projectId = 'project-1';
      const attachmentId = 'attachment-1';
      const acceptLanguage = 'en';

      mockAttachmentsService.deleteAttachment.mockResolvedValue(undefined);

      // Act
      await controller.deleteProjectAttachment(
        projectId,
        attachmentId,
        mockUser,
        acceptLanguage,
      );

      // Assert
      expect(mockAttachmentsService.deleteAttachment).toHaveBeenCalledWith(
        attachmentId,
        projectId,
        mockUser.id,
        acceptLanguage,
      );
    });

    it('should use default accept-language when not provided', async () => {
      // Arrange
      const projectId = 'project-1';
      const attachmentId = 'attachment-1';

      mockAttachmentsService.deleteAttachment.mockResolvedValue(undefined);

      // Act
      await controller.deleteProjectAttachment(
        projectId,
        attachmentId,
        mockUser,
      );

      // Assert
      expect(mockAttachmentsService.deleteAttachment).toHaveBeenCalledWith(
        attachmentId,
        projectId,
        mockUser.id,
        'en',
      );
    });
  });

  describe('getProjectAttachmentById', () => {
    it('should return project attachment by ID successfully', async () => {
      // Arrange
      const projectId = 'project-1';
      const attachmentId = 'attachment-1';
      const acceptLanguage = 'en';

      mockAttachmentsService.getAttachmentById.mockResolvedValue(
        mockAttachmentResponse,
      );

      // Act
      const result = await controller.getProjectAttachmentById(
        projectId,
        attachmentId,
        mockUser,
        acceptLanguage,
      );

      // Assert
      expect(mockAttachmentsService.getAttachmentById).toHaveBeenCalledWith(
        attachmentId,
        projectId,
        mockUser.id,
        acceptLanguage,
      );
      expect(result).toEqual(mockAttachmentResponse);
    });

    it('should use default accept-language when not provided', async () => {
      // Arrange
      const projectId = 'project-1';
      const attachmentId = 'attachment-1';

      mockAttachmentsService.getAttachmentById.mockResolvedValue(
        mockAttachmentResponse,
      );

      // Act
      const result = await controller.getProjectAttachmentById(
        projectId,
        attachmentId,
        mockUser,
      );

      // Assert
      expect(mockAttachmentsService.getAttachmentById).toHaveBeenCalledWith(
        attachmentId,
        projectId,
        mockUser.id,
        'en',
      );
      expect(result).toEqual(mockAttachmentResponse);
    });
  });

  describe('uploadTaskAttachment', () => {
    it('should upload task attachment successfully', async () => {
      // Arrange
      const projectId = 'project-1';
      const taskId = 'task-1';
      const acceptLanguage = 'en';

      mockAttachmentsService.uploadAttachment.mockResolvedValue(
        mockAttachmentResponse,
      );

      // Act
      const result = await controller.uploadTaskAttachment(
        projectId,
        taskId,
        mockFile,
        mockUser,
        acceptLanguage,
      );

      // Assert
      expect(mockAttachmentsService.uploadAttachment).toHaveBeenCalledWith(
        mockFile,
        AttachmentEntityType.TASK,
        taskId,
        mockUser.id,
        projectId,
        acceptLanguage,
      );
      expect(result).toEqual(mockAttachmentResponse);
    });

    it('should use default accept-language when not provided', async () => {
      // Arrange
      const projectId = 'project-1';
      const taskId = 'task-1';

      mockAttachmentsService.uploadAttachment.mockResolvedValue(
        mockAttachmentResponse,
      );

      // Act
      const result = await controller.uploadTaskAttachment(
        projectId,
        taskId,
        mockFile,
        mockUser,
      );

      // Assert
      expect(mockAttachmentsService.uploadAttachment).toHaveBeenCalledWith(
        mockFile,
        AttachmentEntityType.TASK,
        taskId,
        mockUser.id,
        projectId,
        'en',
      );
      expect(result).toEqual(mockAttachmentResponse);
    });
  });

  describe('getTaskAttachments', () => {
    it('should return task attachments successfully', async () => {
      // Arrange
      const projectId = 'project-1';
      const taskId = 'task-1';
      const acceptLanguage = 'en';
      const mockAttachments = [mockAttachmentResponse];

      mockAttachmentsService.getAttachments.mockResolvedValue(mockAttachments);

      // Act
      const result = await controller.getTaskAttachments(
        projectId,
        taskId,
        mockUser,
        acceptLanguage,
      );

      // Assert
      expect(mockAttachmentsService.getAttachments).toHaveBeenCalledWith(
        AttachmentEntityType.TASK,
        taskId,
        projectId,
        mockUser.id,
        acceptLanguage,
      );
      expect(result).toEqual(mockAttachments);
    });

    it('should use default accept-language when not provided', async () => {
      // Arrange
      const projectId = 'project-1';
      const taskId = 'task-1';
      const mockAttachments = [mockAttachmentResponse];

      mockAttachmentsService.getAttachments.mockResolvedValue(mockAttachments);

      // Act
      const result = await controller.getTaskAttachments(
        projectId,
        taskId,
        mockUser,
      );

      // Assert
      expect(mockAttachmentsService.getAttachments).toHaveBeenCalledWith(
        AttachmentEntityType.TASK,
        taskId,
        projectId,
        mockUser.id,
        'en',
      );
      expect(result).toEqual(mockAttachments);
    });
  });

  describe('deleteTaskAttachment', () => {
    it('should delete task attachment successfully', async () => {
      // Arrange
      const projectId = 'project-1';
      const taskId = 'task-1';
      const attachmentId = 'attachment-1';
      const acceptLanguage = 'en';

      mockAttachmentsService.deleteAttachment.mockResolvedValue(undefined);

      // Act
      await controller.deleteTaskAttachment(
        projectId,
        taskId,
        attachmentId,
        mockUser,
        acceptLanguage,
      );

      // Assert
      expect(mockAttachmentsService.deleteAttachment).toHaveBeenCalledWith(
        attachmentId,
        projectId,
        mockUser.id,
        acceptLanguage,
      );
    });

    it('should use default accept-language when not provided', async () => {
      // Arrange
      const projectId = 'project-1';
      const taskId = 'task-1';
      const attachmentId = 'attachment-1';

      mockAttachmentsService.deleteAttachment.mockResolvedValue(undefined);

      // Act
      await controller.deleteTaskAttachment(
        projectId,
        taskId,
        attachmentId,
        mockUser,
      );

      // Assert
      expect(mockAttachmentsService.deleteAttachment).toHaveBeenCalledWith(
        attachmentId,
        projectId,
        mockUser.id,
        'en',
      );
    });
  });

  describe('getTaskAttachmentById', () => {
    it('should return task attachment by ID successfully', async () => {
      // Arrange
      const projectId = 'project-1';
      const taskId = 'task-1';
      const attachmentId = 'attachment-1';
      const acceptLanguage = 'en';

      mockAttachmentsService.getAttachmentById.mockResolvedValue(
        mockAttachmentResponse,
      );

      // Act
      const result = await controller.getTaskAttachmentById(
        projectId,
        taskId,
        attachmentId,
        mockUser,
        acceptLanguage,
      );

      // Assert
      expect(mockAttachmentsService.getAttachmentById).toHaveBeenCalledWith(
        attachmentId,
        projectId,
        mockUser.id,
        acceptLanguage,
      );
      expect(result).toEqual(mockAttachmentResponse);
    });

    it('should use default accept-language when not provided', async () => {
      // Arrange
      const projectId = 'project-1';
      const taskId = 'task-1';
      const attachmentId = 'attachment-1';

      mockAttachmentsService.getAttachmentById.mockResolvedValue(
        mockAttachmentResponse,
      );

      // Act
      const result = await controller.getTaskAttachmentById(
        projectId,
        taskId,
        attachmentId,
        mockUser,
      );

      // Assert
      expect(mockAttachmentsService.getAttachmentById).toHaveBeenCalledWith(
        attachmentId,
        projectId,
        mockUser.id,
        'en',
      );
      expect(result).toEqual(mockAttachmentResponse);
    });
  });
});
