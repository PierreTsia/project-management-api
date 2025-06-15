import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RefreshTokenService } from './refresh-token.service';
import { EmailService } from '../email/email.service';
import { I18nService } from 'nestjs-i18n';
import { User } from '../users/entities/user.entity';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let refreshTokenService: RefreshTokenService;
  let usersService: UsersService;
  let emailService: EmailService;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    password: 'hashedPassword',
    name: 'Test User',
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
        AuthService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('access-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              switch (key) {
                case 'JWT_SECRET':
                  return 'test-secret';
                case 'JWT_EXPIRATION':
                  return '1h';
                default:
                  return undefined;
              }
            }),
          },
        },
        {
          provide: I18nService,
          useValue: {
            translate: jest.fn().mockImplementation((key: string) => key),
          },
        },
        {
          provide: RefreshTokenService,
          useValue: {
            createRefreshToken: jest.fn().mockResolvedValue(undefined),
            validateRefreshToken: jest.fn(),
            revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            findByEmailConfirmationToken: jest.fn(),
            findByProviderId: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmailConfirmation: jest.fn().mockResolvedValue(undefined),
            sendPasswordReset: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    refreshTokenService = module.get<RefreshTokenService>(RefreshTokenService);
    usersService = module.get<UsersService>(UsersService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return user data and tokens for valid credentials', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const confirmedUser = { ...mockUser, isEmailConfirmed: true };

      (usersService.findByEmail as jest.Mock).mockResolvedValue(confirmedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        user: expect.objectContaining({
          email: confirmedUser.email,
          id: confirmedUser.id,
        }),
        accessToken: 'access-token',
        refreshToken: expect.any(String),
      });
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto = { email: 'test@example.com', password: 'wrongpassword' };
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for unconfirmed email', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const unconfirmedUser = { ...mockUser, isEmailConfirmed: false };
      (usersService.findByEmail as jest.Mock).mockResolvedValue(
        unconfirmedUser,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('register', () => {
    it('should create new user and send confirmation email', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'Password123!',
        name: 'New User',
      };

      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (usersService.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        message: expect.any(String),
      });
      expect(usersService.create).toHaveBeenCalledWith({
        email: registerDto.email,
        password: 'hashedPassword',
        name: registerDto.name,
        isEmailConfirmed: false,
        emailConfirmationToken: expect.any(String),
      });
      expect(emailService.sendEmailConfirmation).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'Password123!',
        name: 'Existing User',
      };

      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('confirmEmail', () => {
    it('should confirm email with valid token', async () => {
      const confirmEmailDto = { token: 'valid-token' };
      (
        usersService.findByEmailConfirmationToken as jest.Mock
      ).mockResolvedValue(mockUser);

      const result = await service.confirmEmail(confirmEmailDto);

      expect(result).toEqual({
        message: expect.any(String),
      });
      expect(usersService.update).toHaveBeenCalledWith(mockUser.id, {
        isEmailConfirmed: true,
        emailConfirmationToken: null,
        emailConfirmationExpires: null,
      });
    });

    it('should throw NotFoundException for invalid token', async () => {
      const confirmEmailDto = { token: 'invalid-token' };
      (
        usersService.findByEmailConfirmationToken as jest.Mock
      ).mockResolvedValue(null);

      await expect(service.confirmEmail(confirmEmailDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      (refreshTokenService.validateRefreshToken as jest.Mock).mockResolvedValue(
        {
          user: { id: '1' },
        },
      );
      (usersService.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.refreshTokens(refreshToken);

      expect(result).toEqual({
        user: expect.objectContaining({
          email: mockUser.email,
          id: mockUser.id,
        }),
        accessToken: 'access-token',
        refreshToken: expect.any(String),
      });
      expect(refreshTokenService.revokeRefreshToken).toHaveBeenCalledWith(
        refreshToken,
      );
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      (refreshTokenService.validateRefreshToken as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      (refreshTokenService.validateRefreshToken as jest.Mock).mockResolvedValue(
        {
          user: { id: '1' },
        },
      );
      (usersService.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.refreshTokens('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('findOrCreateUser', () => {
    it('should find existing user', async () => {
      const providerData = {
        provider: 'google' as const,
        providerId: 'google123',
        email: 'test@example.com',
        name: 'Test User',
      };
      (usersService.findByProviderId as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findOrCreateUser(providerData);

      expect(result).toEqual(mockUser);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('should create new user if not found', async () => {
      const providerData = {
        provider: 'google' as const,
        providerId: 'google123',
        email: 'new@example.com',
        name: 'New User',
        avatarUrl: 'https://example.com/avatar.jpg',
      };
      (usersService.findByProviderId as jest.Mock).mockResolvedValue(null);
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
      (usersService.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        ...providerData,
      });

      const result = await service.findOrCreateUser(providerData);

      expect(result).toEqual(expect.objectContaining(providerData));
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: providerData.email,
          name: providerData.name,
          isEmailConfirmed: true,
        }),
      );
    });
  });
});
