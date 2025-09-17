import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { I18nService } from 'nestjs-i18n';
import { NotFoundException } from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { MockCustomLogger } from '../test/mocks';
import { CustomLogger } from '../common/services/logger.service';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: Repository<User>;
  let mockLogger: MockCustomLogger;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
    isEmailConfirmed: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    refreshTokens: [],
    avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=default',
    provider: null,
    providerId: null,
  };

  const mockRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockI18nService = {
    translate: jest.fn().mockReturnValue((key) => key),
  };

  const mockCloudinaryService = {
    uploadAvatar: jest.fn(),
    deleteImage: jest.fn(),
    extractPublicIdFromUrl: jest.fn(),
  };

  beforeEach(async () => {
    mockLogger = new MockCustomLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findOne('user-1');

      expect(result).toEqual(mockUser);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should return null and log debug if user not found', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findOne('non-existent');

      expect(result).toBeNull();
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'User not found with id: non-existent',
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null and log debug if user not found', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'User not found with email: nonexistent@example.com',
      );
    });
  });

  describe('update', () => {
    it('should update a user and log the update', async () => {
      const updateData = { name: 'Updated Name' };
      const updatedUser = { ...mockUser, ...updateData };

      (usersRepository.update as jest.Mock).mockResolvedValue({ affected: 1 });
      (usersRepository.findOne as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.update('user-1', updateData);

      expect(result).toEqual(updatedUser);
      expect(usersRepository.update).toHaveBeenCalledWith('user-1', updateData);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Updating user user-1 with data: ${JSON.stringify(updateData)}`,
      );
    });
  });

  describe('create', () => {
    it('should create and return a new user with logging', async () => {
      const createData = {
        email: 'new@example.com',
        name: 'New User',
        password: 'password123',
      };

      (usersRepository.create as jest.Mock).mockReturnValue({
        ...createData,
        id: 'new-user-id',
      });
      (usersRepository.save as jest.Mock).mockResolvedValue({
        ...createData,
        id: 'new-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(createData);

      expect(result).toEqual(
        expect.objectContaining({
          ...createData,
          id: 'new-user-id',
        }),
      );
      expect(usersRepository.create).toHaveBeenCalledWith(createData);
      expect(usersRepository.save).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Creating new user with email: ${createData.email}`,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'User created successfully with id: new-user-id',
      );
    });
  });

  describe('findByEmailConfirmationToken', () => {
    it('should return a user by confirmation token', async () => {
      const token = 'valid-token';
      (usersRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findByEmailConfirmationToken(token);

      expect(result).toEqual(mockUser);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { emailConfirmationToken: token },
      });
    });

    it('should return null and log debug if token not found', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result =
        await service.findByEmailConfirmationToken('invalid-token');

      expect(result).toBeNull();
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { emailConfirmationToken: 'invalid-token' },
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'No user found with confirmation token: invalid-token',
      );
    });
  });

  describe('findByPasswordResetToken', () => {
    it('should return a user by valid reset token', async () => {
      const token = 'valid-token';
      (usersRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findByPasswordResetToken(token);

      expect(result).toEqual(mockUser);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: {
          passwordResetToken: token,
          passwordResetExpires: expect.any(Object),
        },
      });
    });

    it('should return null and log debug if token not found', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findByPasswordResetToken('invalid-token');

      expect(result).toBeNull();
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: {
          passwordResetToken: 'invalid-token',
          passwordResetExpires: expect.any(Object),
        },
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'No user found with valid password reset token: invalid-token',
      );
    });
  });

  describe('findByProviderId', () => {
    it('should return a user by provider and providerId', async () => {
      const provider = 'google';
      const providerId = 'google123';
      (usersRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findByProviderId(provider, providerId);

      expect(result).toEqual(mockUser);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { provider, providerId },
      });
    });

    it('should return null and log debug if provider combination not found', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findByProviderId('google', 'nonexistent');

      expect(result).toBeNull();
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { provider: 'google', providerId: 'nonexistent' },
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'No user found with provider google and id nonexistent',
      );
    });
  });

  describe('uploadAvatar', () => {
    const mockFile = {
      fieldname: 'avatar',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test'),
      size: 1024,
    } as Express.Multer.File;

    it('should throw NotFoundException if user not found', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.uploadAvatar('non-existent', mockFile),
      ).rejects.toThrow(NotFoundException);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'User not found for avatar upload: non-existent',
      );
    });

    it('should upload avatar and clean up old one', async () => {
      const oldAvatarUrl = 'https://res.cloudinary.com/test/image/upload/old';
      const newAvatarUrl = 'https://res.cloudinary.com/test/image/upload/new';
      const oldPublicId = 'old';
      const newPublicId = 'new';
      const userWithOldAvatar = { ...mockUser, avatarUrl: oldAvatarUrl };
      const userWithNewAvatar = { ...mockUser, avatarUrl: newAvatarUrl };

      (usersRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(userWithOldAvatar)
        .mockResolvedValueOnce(userWithNewAvatar)
        .mockResolvedValueOnce(userWithNewAvatar);
      (usersRepository.update as jest.Mock).mockResolvedValue({ affected: 1 });
      (mockCloudinaryService.uploadAvatar as jest.Mock).mockResolvedValue({
        url: newAvatarUrl,
        publicId: newPublicId,
      });
      (
        mockCloudinaryService.extractPublicIdFromUrl as jest.Mock
      ).mockReturnValue(oldPublicId);
      (mockCloudinaryService.deleteImage as jest.Mock).mockResolvedValue(
        undefined,
      );

      const result = await service.uploadAvatar('user-1', mockFile);

      expect(result.avatarUrl).toBe(newAvatarUrl);
      expect(mockCloudinaryService.uploadAvatar).toHaveBeenCalledWith(
        mockFile,
        'user-1',
        undefined,
      );
      expect(mockCloudinaryService.deleteImage).toHaveBeenCalledWith(
        oldPublicId,
        undefined,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Old avatar deleted for user user-1',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Avatar updated successfully for user user-1',
      );
    });

    it('should handle cleanup failure gracefully', async () => {
      const oldAvatarUrl = 'https://res.cloudinary.com/test/image/upload/old';
      const newAvatarUrl = 'https://res.cloudinary.com/test/image/upload/new';
      const oldPublicId = 'old';
      const newPublicId = 'new';
      const cleanupError = new Error('Cleanup failed');
      const userWithOldAvatar = { ...mockUser, avatarUrl: oldAvatarUrl };
      const userWithNewAvatar = { ...mockUser, avatarUrl: newAvatarUrl };

      (usersRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(userWithOldAvatar)
        .mockResolvedValueOnce(userWithNewAvatar)
        .mockResolvedValueOnce(userWithNewAvatar);
      (usersRepository.update as jest.Mock).mockResolvedValue({ affected: 1 });
      (mockCloudinaryService.uploadAvatar as jest.Mock).mockResolvedValue({
        url: newAvatarUrl,
        publicId: newPublicId,
      });
      (
        mockCloudinaryService.extractPublicIdFromUrl as jest.Mock
      ).mockReturnValue(oldPublicId);
      (mockCloudinaryService.deleteImage as jest.Mock).mockRejectedValue(
        cleanupError,
      );

      const result = await service.uploadAvatar('user-1', mockFile);

      expect(result.avatarUrl).toBe(newAvatarUrl);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to delete old avatar for user user-1: ${cleanupError.message}`,
        cleanupError.stack,
      );
    });

    it('should handle upload failure and cleanup', async () => {
      const uploadError = new Error('Upload failed');
      const cleanupError = new Error('Cleanup failed');
      const userWithOldAvatar = { ...mockUser, avatarUrl: 'old-url' };

      (usersRepository.findOne as jest.Mock).mockResolvedValue(
        userWithOldAvatar,
      );
      (usersRepository.update as jest.Mock).mockRejectedValue(uploadError);
      (mockCloudinaryService.uploadAvatar as jest.Mock).mockResolvedValue({
        url: 'new-url',
        publicId: 'new-id',
      });
      (mockCloudinaryService.deleteImage as jest.Mock).mockRejectedValue(
        cleanupError,
      );

      await expect(service.uploadAvatar('user-1', mockFile)).rejects.toThrow(
        uploadError,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to clean up uploaded image after error for user user-1: ${cleanupError.message}`,
        cleanupError.stack,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update avatar for user user-1'),
        expect.any(String),
      );
    });
  });

  describe('updateProfile', () => {
    it('should throw NotFoundException if user not found', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue(null);

      const updateProfileDto: UpdateUserProfileDto = { name: 'New Name' };

      await expect(
        service.updateProfile('non-existent', updateProfileDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'User not found for profile update: non-existent',
      );
    });

    it('should update profile fields and log the change', async () => {
      const updateProfileDto: UpdateUserProfileDto = {
        name: 'New Name',
        bio: 'Test bio',
        phone: '+15551234567',
        dob: '1990-05-20',
      };
      const updatedUser = {
        ...mockUser,
        name: updateProfileDto.name,
        bio: updateProfileDto.bio,
        phone: updateProfileDto.phone,
        dob: new Date(updateProfileDto.dob),
      };

      (usersRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(updatedUser)
        .mockResolvedValueOnce(updatedUser);
      (usersRepository.update as jest.Mock).mockResolvedValue({ affected: 1 });

      const result = await service.updateProfile('user-1', updateProfileDto);

      expect(result.name).toBe(updateProfileDto.name);
      expect(result.bio).toBe(updateProfileDto.bio);
      expect(result.phone).toBe(updateProfileDto.phone);
      expect(result.dob).toEqual(new Date(updateProfileDto.dob));
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Updating profile for user user-1 with fields: name, bio, phone, dob',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Profile updated successfully for user user-1',
      );
    });

    it('should return existing user if no fields provided', async () => {
      const updateProfileDto: UpdateUserProfileDto = { name: '' };
      (usersRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.updateProfile('user-1', updateProfileDto);

      expect(result).toBe(mockUser);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'No profile fields provided for update for user user-1; returning existing profile',
      );
      expect(usersRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteExpiredUnconfirmedAccounts', () => {
    it('should delete expired unconfirmed accounts and return count', async () => {
      const expirationDate = new Date('2024-01-01');
      const deletedCount = 3;

      (usersRepository.delete as jest.Mock).mockResolvedValue({
        affected: deletedCount,
      });

      const result =
        await service.deleteExpiredUnconfirmedAccounts(expirationDate);

      expect(result).toBe(deletedCount);
      expect(usersRepository.delete).toHaveBeenCalledWith({
        isEmailConfirmed: false,
        emailConfirmationExpires: expect.any(Object), // LessThan operator
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Deleting expired unconfirmed accounts before ${expirationDate}`,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Deleted ${deletedCount} expired unconfirmed accounts`,
      );
    });

    it('should return 0 when no accounts are deleted', async () => {
      const expirationDate = new Date('2024-01-01');

      (usersRepository.delete as jest.Mock).mockResolvedValue({
        affected: 0,
      });

      const result =
        await service.deleteExpiredUnconfirmedAccounts(expirationDate);

      expect(result).toBe(0);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Deleted 0 expired unconfirmed accounts',
      );
    });
  });
});
