import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserResponseDto } from './dto/user-response.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

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
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
            uploadAvatar: jest.fn(),
            updateName: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('whoami', () => {
    it('should return current user profile', async () => {
      (usersService.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await controller.whoami({ user: mockUser });

      expect(result).toBeInstanceOf(UserResponseDto);
      expect(result).toEqual(
        expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          isEmailConfirmed: mockUser.isEmailConfirmed,
          avatarUrl: mockUser.avatarUrl,
        }),
      );
      expect(usersService.findOne).toHaveBeenCalledWith(mockUser.id);
    });

    it('should handle user not found', async () => {
      (usersService.findOne as jest.Mock).mockResolvedValue(null);

      const result = await controller.whoami({ user: mockUser });

      expect(result).toBeInstanceOf(UserResponseDto);
      expect(result).toEqual({});
      expect(usersService.findOne).toHaveBeenCalledWith(mockUser.id);
    });

    it('should handle accept-language header', async () => {
      (usersService.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await controller.whoami({ user: mockUser }, 'en-US');

      expect(result).toBeInstanceOf(UserResponseDto);
      expect(usersService.findOne).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
        avatarUrl: null,
        provider: 'local',
        providerId: null,
        isEmailConfirmed: false,
        refreshTokens: [],
      };
      const mockFile = { originalname: 'test.jpg' };
      const mockAcceptLanguage = 'en';
      const mockResult = {
        id: 'user-id',
        avatarUrl: 'http://example.com/avatar.jpg',
      };

      jest.spyOn(usersService, 'uploadAvatar').mockResolvedValue(mockResult);

      const result = await controller.uploadAvatar(
        { user: mockUser },
        mockAcceptLanguage,
        mockFile,
      );

      expect(usersService.uploadAvatar).toHaveBeenCalledWith(
        mockUser.id,
        mockFile,
        mockAcceptLanguage,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateName', () => {
    it('should update user name successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
        avatarUrl: null,
        provider: 'local',
        providerId: null,
        isEmailConfirmed: false,
        refreshTokens: [],
      };
      const updateNameDto = { name: 'New Name' };
      const mockAcceptLanguage = 'en';
      const mockResult = { id: 'user-id', name: 'New Name' };

      jest.spyOn(usersService, 'updateName').mockResolvedValue(mockResult);

      const result = await controller.updateName(
        { user: mockUser },
        updateNameDto,
        mockAcceptLanguage,
      );

      expect(usersService.updateName).toHaveBeenCalledWith(
        mockUser.id,
        updateNameDto,
        mockAcceptLanguage,
      );
      expect(result).toEqual(mockResult);
    });
  });
});
