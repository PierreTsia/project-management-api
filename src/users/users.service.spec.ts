import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UpdateNameDto } from './dto/update-name.dto';
import { I18nService } from 'nestjs-i18n';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: Repository<User>;

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
  };

  const mockI18nService = {
    translate: jest.fn().mockReturnValue((key) => key),
  };

  beforeEach(async () => {
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

    it('should return null if user not found', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findOne('non-existent');

      expect(result).toBeNull();
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
      });
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

    it('should return null if user not found', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });
    });
  });

  describe('update', () => {
    it('should update a user and return the updated user', async () => {
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
    });
  });

  describe('create', () => {
    it('should create and return a new user', async () => {
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

    it('should return null if token not found', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result =
        await service.findByEmailConfirmationToken('invalid-token');

      expect(result).toBeNull();
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { emailConfirmationToken: 'invalid-token' },
      });
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

    it('should return null if token not found', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findByPasswordResetToken('invalid-token');

      expect(result).toBeNull();
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: {
          passwordResetToken: 'invalid-token',
          passwordResetExpires: expect.any(Object),
        },
      });
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

    it('should return null if provider combination not found', async () => {
      (usersRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findByProviderId('google', 'nonexistent');

      expect(result).toBeNull();
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { provider: 'google', providerId: 'nonexistent' },
      });
    });
  });

  describe('updateName', () => {
    const updateNameDto: UpdateNameDto = { name: 'Updated Name' };
    const userId = 'user-1';
    const acceptLanguage = 'en';

    it('should successfully update user name', async () => {
      const updatedUser = { ...mockUser, name: updateNameDto.name };

      // Setup mock responses for all findOne calls
      // First call: in updateName to check if user exists
      // Second call: in update method after update
      // Third call: final findOne in updateName
      mockRepository.findOne
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(updatedUser)
        .mockResolvedValueOnce(updatedUser);

      // Mock update to return success
      mockRepository.update.mockResolvedValueOnce({ affected: 1 });

      const result = await service.updateName(
        userId,
        updateNameDto,
        acceptLanguage,
      );

      expect(result).toEqual(updatedUser);
      expect(mockRepository.findOne).toHaveBeenCalledTimes(3);
      expect(mockRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: { id: userId },
      });
      expect(mockRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: { id: userId },
      });
      expect(mockRepository.findOne).toHaveBeenNthCalledWith(3, {
        where: { id: userId },
      });
      expect(mockRepository.update).toHaveBeenCalledWith(userId, {
        name: updateNameDto.name,
      });
    });

    it('should throw NotFoundException when user is not found', async () => {
      // Mock findOne to return null (user not found)
      mockRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.updateName(userId, updateNameDto, acceptLanguage),
      ).rejects.toThrow(NotFoundException);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockRepository.update).not.toHaveBeenCalled();
      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'errors.user.not_found',
        {
          lang: acceptLanguage,
        },
      );
    });

    it('should throw error when update fails', async () => {
      // Mock findOne to return a user
      mockRepository.findOne.mockResolvedValueOnce(mockUser);
      // Mock update to throw an error
      const error = new Error('Database error');
      mockRepository.update.mockRejectedValueOnce(error);

      await expect(
        service.updateName(userId, updateNameDto, acceptLanguage),
      ).rejects.toThrow(error);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockRepository.update).toHaveBeenCalledWith(userId, {
        name: updateNameDto.name,
      });
    });
  });
});
