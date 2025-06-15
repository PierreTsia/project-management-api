import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
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
});
