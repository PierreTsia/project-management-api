import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { User } from '../users/entities/user.entity';
import { RefreshTokenService } from './refresh-token.service';
import { I18nService } from 'nestjs-i18n';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { Request, Response } from 'express';

describe('AuthController', () => {
  let app: INestApplication;
  let controller: AuthController;
  let mockAuthService: Partial<AuthService>;

  const date = new Date('2025-06-15T22:46:13.002Z');

  const mockUser: Partial<User> = {
    id: '1',
    email: 'test@test.com',
    name: 'Test User',
    password: 'hashedPassword',
    createdAt: date,
    updatedAt: date,
    emailConfirmationToken: null,
    isEmailConfirmed: true,
    passwordResetExpires: null,
    passwordResetToken: null,
    emailConfirmationExpires: null,
    avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=default',
    provider: null,
    providerId: null,
  };

  beforeEach(async () => {
    mockAuthService = {
      login: jest.fn(),
      register: jest.fn(),
      confirmEmail: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      updatePassword: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
      findOrCreateUser: jest.fn(),
      generateTokens: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mocked-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                JWT_SECRET: 'test-secret',
                JWT_EXPIRATION_TIME: '1h',
                GOOGLE_CLIENT_ID: 'mock-client-id',
                GOOGLE_CLIENT_SECRET: 'mock-client-secret',
                GOOGLE_CALLBACK_URL:
                  'http://localhost:3000/auth/google/callback',
              };
              return config[key];
            }),
          },
        },
        {
          provide: RefreshTokenService,
          useValue: {
            validateRefreshToken: jest.fn(),
            revokeRefreshToken: jest.fn(),
            generateRefreshToken: jest.fn(),
          },
        },
        {
          provide: I18nService,
          useValue: {
            translate: jest.fn().mockReturnValue('translated message'),
          },
        },
        GoogleStrategy,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          request.user = { email: 'test@test.com' };
          return true;
        },
      })
      .overrideGuard(RefreshTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /auth/login', () => {
    it('should return user data and tokens for valid credentials', async () => {
      const loginDto = { email: 'test@test.com', password: 'password123' };
      const mockResponse = {
        user: {
          ...mockUser,
          createdAt: date.toISOString(),
          updatedAt: date.toISOString(),
        },
        accessToken: 'mocked-jwt-token',
        refreshToken: 'mocked-refresh-token',
      };

      (mockAuthService.login as jest.Mock).mockResolvedValue(mockResponse);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should return 401 for invalid credentials', async () => {
      const loginDto = { email: 'test@test.com', password: 'wrongpassword' };
      (mockAuthService.login as jest.Mock).mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });
  });

  describe('POST /auth/register', () => {
    it('should create a new user and return success message', async () => {
      const registerDto = {
        email: 'new@test.com',
        password: 'Password123!',
        name: 'New User',
      };

      (mockAuthService.register as jest.Mock).mockResolvedValue({
        message:
          'Registration successful. Please check your email to confirm your account.',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toEqual({
        message:
          'Registration successful. Please check your email to confirm your account.',
      });
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should return 400 for invalid password format', async () => {
      const registerDto = {
        email: 'new@test.com',
        password: 'weak',
        name: 'New User',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);
    });
  });

  describe('GET /auth/google', () => {
    it('should redirect to Google OAuth', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/google')
        .expect(302);

      expect(response.header.location).toContain('accounts.google.com');
    });
  });

  describe('POST /auth/confirm-email', () => {
    it('should confirm email with valid token', async () => {
      const confirmEmailDto = { token: 'valid-token' };
      (mockAuthService.confirmEmail as jest.Mock).mockResolvedValue({
        message: 'Email confirmed successfully',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/confirm-email')
        .send(confirmEmailDto)
        .expect(201);

      expect(response.body).toEqual({
        message: 'Email confirmed successfully',
      });
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should send password reset email', async () => {
      const forgotPasswordDto = { email: 'test@test.com' };
      (mockAuthService.forgotPassword as jest.Mock).mockResolvedValue({
        message: 'If your email is registered, you will receive a reset link',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send(forgotPasswordDto)
        .expect(200);

      expect(response.body).toEqual({
        message: 'If your email is registered, you will receive a reset link',
      });
    });
  });

  describe('PUT /auth/password', () => {
    it('should update password successfully', async () => {
      const updatePasswordDto = {
        currentPassword: 'oldPassword123!',
        newPassword: 'newPassword123!',
      };

      (mockAuthService.updatePassword as jest.Mock).mockResolvedValue({
        message: 'Password updated successfully',
      });

      const response = await request(app.getHttpServer())
        .put('/auth/password')
        .set('Authorization', 'Bearer valid-token')
        .send(updatePasswordDto)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Password updated successfully',
      });
    });
  });

  describe('GET /auth/google/callback', () => {
    interface GoogleUser {
      email?: string;
      id?: string;
    }

    interface GoogleRequest extends Request {
      user?: GoogleUser;
    }

    const mockRequest: GoogleRequest = {
      user: {
        email: 'test@test.com',
        id: '1',
      },
    } as GoogleRequest;

    const mockRedirect = jest.fn();
    const mockResponse: Partial<Response> = {
      redirect: mockRedirect,
    };

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    beforeEach(() => {
      mockRedirect.mockClear();
    });

    it('should redirect to frontend with tokens on successful authentication', async () => {
      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      (mockAuthService.generateTokens as jest.Mock).mockResolvedValue(
        mockTokens,
      );

      await controller.googleAuthCallback(
        mockRequest,
        mockResponse as Response,
      );

      expect(mockRedirect).toHaveBeenCalledWith(
        `${frontendUrl}/auth/callback?access_token=${mockTokens.accessToken}&refresh_token=${mockTokens.refreshToken}&provider=google`,
      );
    });

    it('should redirect to error page when user is undefined', async () => {
      const requestWithoutUser: GoogleRequest = {
        ...mockRequest,
        user: undefined,
      } as GoogleRequest;

      await controller.googleAuthCallback(
        requestWithoutUser,
        mockResponse as Response,
      );

      expect(mockRedirect).toHaveBeenCalledWith(
        `${frontendUrl}/auth/error?message=Google%20login%20failed`,
      );
    });

    it('should redirect to error page when token generation fails', async () => {
      (mockAuthService.generateTokens as jest.Mock).mockResolvedValue(null);

      await controller.googleAuthCallback(
        mockRequest,
        mockResponse as Response,
      );

      expect(mockRedirect).toHaveBeenCalledWith(
        `${frontendUrl}/auth/error?message=Token%20generation%20failed`,
      );
    });

    it('should redirect to error page when tokens are incomplete', async () => {
      (mockAuthService.generateTokens as jest.Mock).mockResolvedValue({
        accessToken: 'mock-access-token',
        // missing refreshToken
      });

      await controller.googleAuthCallback(
        mockRequest,
        mockResponse as Response,
      );

      expect(mockRedirect).toHaveBeenCalledWith(
        `${frontendUrl}/auth/error?message=Token%20generation%20failed`,
      );
    });
  });
});
