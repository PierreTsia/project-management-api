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

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
    createdAt: new Date(),
    updatedAt: new Date(),
    isEmailConfirmed: false,
    emailConfirmationToken: 'valid-token',
    emailConfirmationExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    passwordResetToken: null,
    passwordResetExpires: null,
    avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=default',
    provider: null,
    providerId: null,
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    findByEmailConfirmationToken: jest.fn(),
    findByPasswordResetToken: jest.fn(),
    findByProviderId: jest.fn(),
  };

  const mockRefreshTokenService = {
    createRefreshToken: jest.fn(),
    validateRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
  };

  const mockEmailService = {
    sendEmailConfirmation: jest.fn(),
    sendPasswordReset: jest.fn(),
  };

  const mockI18nService = {
    translate: jest.fn().mockReturnValue('translated message'),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mocked-jwt-token'),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        JWT_SECRET: 'test-secret',
        JWT_EXPIRATION_TIME: '1h',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: RefreshTokenService, useValue: mockRefreshTokenService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: I18nService, useValue: mockI18nService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
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

      mockUsersService.findByEmail.mockResolvedValue(confirmedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue('mocked-jwt-token');
      mockRefreshTokenService.createRefreshToken.mockResolvedValue(
        'mocked-refresh-token',
      );

      const result = await service.login(loginDto);

      expect(result).toEqual({
        user: expect.objectContaining({
          email: confirmedUser.email,
          id: confirmedUser.id,
        }),
        accessToken: 'mocked-jwt-token',
        refreshToken: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        ),
      });
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto = { email: 'test@example.com', password: 'wrongpassword' };
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for unconfirmed email', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
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

      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        message: 'translated message',
      });
      expect(mockUsersService.create).toHaveBeenCalledWith({
        email: registerDto.email,
        password: 'hashedPassword',
        name: registerDto.name,
        isEmailConfirmed: false,
        emailConfirmationToken: expect.any(String),
      });
      expect(mockEmailService.sendEmailConfirmation).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'Password123!',
        name: 'Existing User',
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('confirmEmail', () => {
    it('should confirm email with valid token', async () => {
      const confirmEmailDto = { token: 'valid-token' };
      mockUsersService.findByEmailConfirmationToken.mockResolvedValue(mockUser);

      const result = await service.confirmEmail(confirmEmailDto);

      expect(result).toEqual({
        message: 'translated message',
      });
      expect(mockUsersService.update).toHaveBeenCalledWith(mockUser.id, {
        isEmailConfirmed: true,
        emailConfirmationToken: null,
        emailConfirmationExpires: null,
      });
    });

    it('should throw NotFoundException for invalid token', async () => {
      const confirmEmailDto = { token: 'invalid-token' };
      mockUsersService.findByEmailConfirmationToken.mockResolvedValue(null);

      await expect(service.confirmEmail(confirmEmailDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOrCreateUser', () => {
    const googleUserData = {
      provider: 'google' as const,
      providerId: 'google123',
      email: 'google@example.com',
      name: 'Google User',
      avatarUrl: 'https://google.com/avatar.jpg',
    };

    it('should find existing user by provider ID', async () => {
      const existingUser = {
        ...mockUser,
        provider: 'google',
        providerId: 'google123',
      };
      mockUsersService.findByProviderId.mockResolvedValue(existingUser);

      const result = await service.findOrCreateUser(googleUserData);

      expect(result).toEqual(existingUser);
      expect(mockUsersService.findByProviderId).toHaveBeenCalledWith(
        'google',
        'google123',
      );
    });

    it('should update existing user with provider info', async () => {
      const existingUser = { ...mockUser, provider: null, providerId: null };
      const updatedUser = { ...existingUser, ...googleUserData };

      mockUsersService.findByProviderId.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue(existingUser);
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await service.findOrCreateUser(googleUserData);

      expect(result).toEqual(updatedUser);
      expect(mockUsersService.update).toHaveBeenCalledWith(existingUser.id, {
        provider: 'google',
        providerId: 'google123',
        avatarUrl: googleUserData.avatarUrl,
      });
    });

    it('should create new user if not found', async () => {
      const newUser = {
        ...mockUser,
        ...googleUserData,
        isEmailConfirmed: true,
      };

      mockUsersService.findByProviderId.mockResolvedValue(null);
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(newUser);

      const result = await service.findOrCreateUser(googleUserData);

      expect(result).toEqual(newUser);
      expect(mockUsersService.create).toHaveBeenCalledWith({
        email: googleUserData.email,
        name: googleUserData.name,
        provider: 'google',
        providerId: 'google123',
        avatarUrl: googleUserData.avatarUrl,
        isEmailConfirmed: true,
      });
    });
  });

  // Add more test cases for other methods...
});
