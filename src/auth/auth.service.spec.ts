import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
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
import { MockCustomLogger } from '../test/mocks';
import { CustomLogger } from '../common/services/logger.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let refreshTokenService: RefreshTokenService;
  let usersService: UsersService;
  let emailService: EmailService;
  let originalConsoleError: typeof console.error;
  let mockLogger: MockCustomLogger;

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
    // Save original console.error and mock it
    originalConsoleError = console.error;
    console.error = jest.fn();

    mockLogger = new MockCustomLogger();

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
                case 'jwt.refreshTokenExpiresIn':
                  return '7d';
                case 'jwt.accessTokenExpiresIn':
                  return '15m';
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
            findByPasswordResetToken: jest.fn(),
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
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    refreshTokenService = module.get<RefreshTokenService>(RefreshTokenService);
    usersService = module.get<UsersService>(UsersService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    // Restore original console.error
    console.error = originalConsoleError;
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
      expect(mockLogger.log).toHaveBeenCalledWith(
        `User logged in successfully: ${confirmedUser.email}`,
      );
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto = { email: 'test@example.com', password: 'wrongpassword' };
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Invalid password attempt for user: ${loginDto.email}`,
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

    it('should throw UnauthorizedException when user is not found', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: 'password',
        }),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: 'password',
        }),
      ).rejects.toMatchObject({
        response: {
          status: 401,
          code: 'AUTH.INVALID_CREDENTIALS',
        },
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Login attempt with non-existent email: nonexistent@example.com`,
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
      expect(mockLogger.log).toHaveBeenCalledWith(
        `New user registered: ${registerDto.email}`,
      );
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
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Registration attempt with existing email: ${registerDto.email}`,
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
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Email confirmed for user: ${mockUser.email}`,
      );
    });

    it('should throw NotFoundException for invalid token', async () => {
      const confirmEmailDto = { token: 'invalid-token' };
      (
        usersService.findByEmailConfirmationToken as jest.Mock
      ).mockResolvedValue(null);

      await expect(service.confirmEmail(confirmEmailDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Invalid email confirmation token attempt: ${confirmEmailDto.token}`,
      );
    });
  });

  describe('refreshTokens', () => {
    const mockRefreshToken = 'valid.refresh.token';
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      password: 'hashedPassword',
      name: 'Test User',
      isEmailConfirmed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      refreshTokens: [],
      avatarUrl: null,
      provider: null,
      providerId: null,
    };

    beforeEach(() => {
      jest
        .spyOn(refreshTokenService, 'validateRefreshToken')
        .mockResolvedValue({
          id: '1',
          token: mockRefreshToken,
          expiresAt: new Date(Date.now() + 3600000),
          createdAt: new Date(),
          revokedAt: null,
          user: {
            id: mockUser.id,
            email: mockUser.email,
            name: mockUser.name,
            isEmailConfirmed: mockUser.isEmailConfirmed,
            createdAt: mockUser.createdAt,
            updatedAt: mockUser.updatedAt,
            refreshTokens: mockUser.refreshTokens,
            avatarUrl: mockUser.avatarUrl,
            provider: mockUser.provider,
            providerId: mockUser.providerId,
          },
        });
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(refreshTokenService, 'revokeRefreshToken').mockResolvedValue();
      jest.spyOn(service, 'generateTokens').mockResolvedValue({
        accessToken: 'new.access.token',
        refreshToken: 'new.refresh.token',
      });
    });

    it('should refresh tokens successfully', async () => {
      const result = await service.refreshTokens(mockRefreshToken);

      expect(result).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          isEmailConfirmed: mockUser.isEmailConfirmed,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
          refreshTokens: mockUser.refreshTokens,
          avatarUrl: mockUser.avatarUrl,
          provider: mockUser.provider,
          providerId: mockUser.providerId,
        },
        accessToken: 'new.access.token',
        refreshToken: 'new.refresh.token',
      });

      expect(refreshTokenService.validateRefreshToken).toHaveBeenCalledWith(
        mockRefreshToken,
      );
      expect(usersService.findOne).toHaveBeenCalledWith(mockUser.id);
      expect(refreshTokenService.revokeRefreshToken).toHaveBeenCalledWith(
        mockRefreshToken,
      );
      expect(service.generateTokens).toHaveBeenCalledWith({
        email: mockUser.email,
        id: mockUser.id,
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Tokens refreshed for user: ${mockUser.email}`,
      );
    });

    it('should handle invalid token format', async () => {
      jest
        .spyOn(refreshTokenService, 'validateRefreshToken')
        .mockResolvedValue(null);

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(
        service.refreshTokens(mockRefreshToken),
      ).rejects.toMatchObject({
        response: {
          status: 401,
          code: 'AUTH.INVALID_REFRESH_TOKEN',
        },
      });
    });

    it('should handle token validation failure', async () => {
      jest
        .spyOn(refreshTokenService, 'validateRefreshToken')
        .mockRejectedValue(new Error('Token validation failed'));

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(
        service.refreshTokens(mockRefreshToken),
      ).rejects.toMatchObject({
        response: {
          status: 401,
          code: 'AUTH.INVALID_REFRESH_TOKEN',
        },
      });
    });

    it('should handle user lookup failure', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(null);

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(
        service.refreshTokens(mockRefreshToken),
      ).rejects.toMatchObject({
        response: {
          status: 401,
          code: 'AUTH.USER_NOT_FOUND',
        },
      });
    });

    it('should handle token revocation failure', async () => {
      jest
        .spyOn(refreshTokenService, 'revokeRefreshToken')
        .mockRejectedValue(new Error('Token revocation failed'));

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        'Token revocation failed',
      );
    });

    it('should handle new token generation failure', async () => {
      jest
        .spyOn(service, 'generateTokens')
        .mockRejectedValue(new Error('Token generation failed'));

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        'Token generation failed',
      );
    });

    it('should handle expired tokens', async () => {
      jest
        .spyOn(refreshTokenService, 'validateRefreshToken')
        .mockRejectedValue(new Error('Token expired'));

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(
        service.refreshTokens(mockRefreshToken),
      ).rejects.toMatchObject({
        response: {
          status: 401,
          code: 'AUTH.INVALID_REFRESH_TOKEN',
        },
      });
    });

    it('should strip Bearer prefix from token', async () => {
      await service.refreshTokens(`Bearer ${mockRefreshToken}`);

      expect(refreshTokenService.validateRefreshToken).toHaveBeenCalledWith(
        mockRefreshToken,
      );
    });
  });

  describe('findOrCreateUser', () => {
    const providerData = {
      provider: 'google' as const,
      providerId: 'google123',
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
    };

    it('should create new user when not found', async () => {
      (usersService.findByProviderId as jest.Mock).mockResolvedValue(null);
      (usersService.create as jest.Mock).mockResolvedValue({
        ...mockUser,
        provider: 'google',
        providerId: 'google123',
      });

      const result = await service.findOrCreateUser(providerData);

      expect(result).toEqual(
        expect.objectContaining({
          provider: 'google',
          providerId: 'google123',
        }),
      );
      expect(usersService.create).toHaveBeenCalledWith({
        email: providerData.email,
        name: providerData.name,
        provider: 'google',
        providerId: 'google123',
        avatarUrl: providerData.avatarUrl,
        isEmailConfirmed: true,
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Creating new user from ${providerData.provider} OAuth: ${providerData.email}`,
      );
    });

    it('should find existing user by provider ID', async () => {
      const existingUser = {
        ...mockUser,
        provider: 'google',
        providerId: 'google123',
      };
      (usersService.findByProviderId as jest.Mock).mockResolvedValue(
        existingUser,
      );

      const result = await service.findOrCreateUser(providerData);

      expect(result).toEqual(existingUser);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('should update existing user with provider info if not set', async () => {
      const existingUser = {
        ...mockUser,
        provider: null,
        providerId: null,
      };
      const updatedUser = {
        ...existingUser,
        provider: 'google',
        providerId: 'google123',
        avatarUrl: providerData.avatarUrl,
      };
      (usersService.findByProviderId as jest.Mock).mockResolvedValue(null);
      (usersService.findByEmail as jest.Mock).mockResolvedValue(existingUser);
      (usersService.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await service.findOrCreateUser(providerData);

      expect(result).toEqual(updatedUser);
      expect(usersService.update).toHaveBeenCalledWith(existingUser.id, {
        provider: 'google',
        providerId: 'google123',
        avatarUrl: providerData.avatarUrl,
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Linking existing user to ${providerData.provider} OAuth: ${providerData.email}`,
      );
    });

    it('should throw error when user creation fails', async () => {
      (usersService.findByProviderId as jest.Mock).mockResolvedValue(null);
      (usersService.create as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findOrCreateUser(providerData)).rejects.toThrow(
        'Database error',
      );
    });

    it('should throw error when user update fails', async () => {
      const existingUser = {
        ...mockUser,
        provider: null,
        providerId: null,
      };
      (usersService.findByProviderId as jest.Mock).mockResolvedValue(null);
      (usersService.findByEmail as jest.Mock).mockResolvedValue(existingUser);
      (usersService.update as jest.Mock).mockRejectedValue(
        new Error('Update failed'),
      );

      await expect(service.findOrCreateUser(providerData)).rejects.toThrow(
        'Update failed',
      );
    });

    it('should throw error when provider validation fails', async () => {
      const invalidProviderData = {
        ...providerData,
        provider: 'invalid' as any,
      };

      await expect(
        service.findOrCreateUser(invalidProviderData),
      ).rejects.toThrow(new BadRequestException('Invalid provider type'));
    });

    it('should handle database transaction failures', async () => {
      (usersService.findByProviderId as jest.Mock).mockResolvedValue(null);
      (usersService.create as jest.Mock).mockRejectedValue(
        new Error('Transaction failed'),
      );

      await expect(service.findOrCreateUser(providerData)).rejects.toThrow(
        'Transaction failed',
      );
    });
  });

  describe('logout', () => {
    it('should revoke refresh token and return success message', async () => {
      const refreshToken = 'valid.refresh.token';
      jest.spyOn(refreshTokenService, 'revokeRefreshToken').mockResolvedValue();

      const result = await service.logout(refreshToken);

      expect(result).toEqual({
        message: expect.any(String),
      });
      expect(refreshTokenService.revokeRefreshToken).toHaveBeenCalledWith(
        refreshToken,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'User logged out successfully',
      );
    });

    it('should throw error when token revocation fails', async () => {
      const refreshToken = 'valid.refresh.token';
      jest
        .spyOn(refreshTokenService, 'revokeRefreshToken')
        .mockRejectedValue(new Error('Token revocation failed'));

      await expect(service.logout(refreshToken)).rejects.toThrow(
        'Token revocation failed',
      );
    });
  });

  describe('forgotPassword', () => {
    it('should send reset link when user exists', async () => {
      const email = 'test@example.com';
      const mockUser = {
        id: '1',
        email,
        password: 'hashedPassword',
        name: 'Test User',
        isEmailConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        refreshTokens: [],
        avatarUrl: null,
        provider: null,
        providerId: null,
      };

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(usersService, 'update').mockResolvedValue(mockUser);
      jest.spyOn(emailService, 'sendPasswordReset').mockResolvedValue();

      const result = await service.forgotPassword(email);

      expect(result).toEqual({
        message: expect.any(String),
      });
      expect(usersService.findByEmail).toHaveBeenCalledWith(email);
      expect(usersService.update).toHaveBeenCalled();
      expect(emailService.sendPasswordReset).toHaveBeenCalledWith(
        email,
        expect.any(String),
      );
    });

    it('should return success message even when user does not exist', async () => {
      const email = 'nonexistent@example.com';
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      const result = await service.forgotPassword(email);

      expect(result).toEqual({
        message: expect.any(String),
      });
      expect(usersService.findByEmail).toHaveBeenCalledWith(email);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const token = 'valid.reset.token';
      const newPassword = 'newPassword123';
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'oldHashedPassword',
        name: 'Test User',
        isEmailConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        refreshTokens: [],
        avatarUrl: null,
        provider: null,
        providerId: null,
      };

      jest
        .spyOn(usersService, 'findByPasswordResetToken')
        .mockResolvedValue(mockUser);
      jest.spyOn(usersService, 'update').mockResolvedValue(mockUser);

      const result = await service.resetPassword({
        token,
        password: newPassword,
      });

      expect(result).toEqual({
        message: expect.any(String),
      });
      expect(usersService.findByPasswordResetToken).toHaveBeenCalledWith(token);
      expect(usersService.update).toHaveBeenCalledWith(mockUser.id, {
        password: expect.any(String),
        passwordResetToken: null,
        passwordResetExpires: null,
      });
    });
  });

  describe('resendConfirmation', () => {
    it('should resend confirmation email when user exists and is not confirmed', async () => {
      const email = 'test@example.com';
      const mockUser = {
        id: '1',
        email,
        password: 'hashedPassword',
        name: 'Test User',
        isEmailConfirmed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        refreshTokens: [],
        avatarUrl: null,
        provider: null,
        providerId: null,
      };

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(usersService, 'update').mockResolvedValue(mockUser);
      jest.spyOn(emailService, 'sendEmailConfirmation').mockResolvedValue();

      const result = await service.resendConfirmation({ email });

      expect(result).toEqual({
        message: expect.any(String),
      });
      expect(usersService.findByEmail).toHaveBeenCalledWith(email);
      expect(usersService.update).toHaveBeenCalled();
      expect(emailService.sendEmailConfirmation).toHaveBeenCalledWith(
        email,
        expect.any(String),
      );
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      const email = 'test@example.com';
      const currentPassword = 'currentPassword123';
      const newPassword = 'newPassword123';
      const mockUser = {
        id: '1',
        email,
        password: 'hashedCurrentPassword',
        name: 'Test User',
        isEmailConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        refreshTokens: [],
        avatarUrl: null,
        provider: null,
        providerId: null,
      };

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(true));
      jest.spyOn(usersService, 'update').mockResolvedValue(mockUser);

      const result = await service.updatePassword(email, {
        currentPassword,
        newPassword,
      });

      expect(result).toEqual({
        message: expect.any(String),
      });
      expect(usersService.findByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        currentPassword,
        mockUser.password,
      );
      expect(usersService.update).toHaveBeenCalledWith(mockUser.id, {
        password: expect.any(String),
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      const email = 'nonexistent@example.com';
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      await expect(
        service.updatePassword(email, {
          currentPassword: 'currentPassword',
          newPassword: 'newPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.updatePassword(email, {
          currentPassword: 'currentPassword',
          newPassword: 'newPassword',
        }),
      ).rejects.toMatchObject({
        response: {
          code: 'AUTH.USER_NOT_FOUND',
        },
      });
    });

    it('should throw UnauthorizedException when current password is invalid', async () => {
      const email = 'test@example.com';
      const mockUser = {
        id: '1',
        email,
        password: 'hashedCurrentPassword',
        name: 'Test User',
        isEmailConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        refreshTokens: [],
        avatarUrl: null,
        provider: null,
        providerId: null,
      };

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      jest
        .spyOn(bcrypt, 'compare')
        .mockImplementation(() => Promise.resolve(false));

      await expect(
        service.updatePassword(email, {
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.updatePassword(email, {
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword',
        }),
      ).rejects.toMatchObject({
        response: {
          code: 'AUTH.INVALID_CREDENTIALS',
        },
      });
    });
  });
});
