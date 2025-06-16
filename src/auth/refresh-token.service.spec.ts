import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { MockCustomLogger } from '../test/mocks';
import { CustomLogger } from '../common/services/logger.service';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let refreshTokenRepository: Repository<RefreshToken>;
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

  const mockRefreshToken: RefreshToken = {
    id: '1',
    token: 'valid-token',
    user: mockUser,
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    revokedAt: null,
    createdAt: new Date(),
  };

  const mockExpiredToken: RefreshToken = {
    ...mockRefreshToken,
    token: 'expired-token',
    expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
  };

  const mockRevokedToken: RefreshToken = {
    ...mockRefreshToken,
    token: 'revoked-token',
    revokedAt: new Date(),
  };

  beforeEach(async () => {
    mockLogger = new MockCustomLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: I18nService,
          useValue: {
            translate: jest.fn().mockImplementation((key: string) => key),
          },
        },
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
    refreshTokenRepository = module.get<Repository<RefreshToken>>(
      getRepositoryToken(RefreshToken),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateRefreshToken', () => {
    it('should return refresh token if valid and log success', async () => {
      (refreshTokenRepository.findOne as jest.Mock).mockResolvedValue(
        mockRefreshToken,
      );

      const result = await service.validateRefreshToken('valid-token');

      expect(result).toEqual(mockRefreshToken);
      expect(refreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { token: 'valid-token' },
        relations: ['user'],
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Valid refresh token used: valid-token for user ${mockUser.id}`,
      );
    });

    it('should throw UnauthorizedException and log warning if token not found', async () => {
      (refreshTokenRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.validateRefreshToken('invalid-token'),
      ).rejects.toThrow(UnauthorizedException);
      expect(refreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { token: 'invalid-token' },
        relations: ['user'],
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Invalid refresh token attempted: invalid-token',
      );
    });

    it('should throw UnauthorizedException and log warning if token is revoked', async () => {
      (refreshTokenRepository.findOne as jest.Mock).mockResolvedValue(
        mockRevokedToken,
      );

      await expect(
        service.validateRefreshToken('revoked-token'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Revoked refresh token attempted: revoked-token for user ${mockUser.id}`,
      );
    });

    it('should throw UnauthorizedException and log warning if token is expired', async () => {
      (refreshTokenRepository.findOne as jest.Mock).mockResolvedValue(
        mockExpiredToken,
      );

      await expect(
        service.validateRefreshToken('expired-token'),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Expired refresh token attempted: expired-token for user ${mockUser.id}`,
      );
    });
  });

  describe('revokeRefreshToken', () => {
    it('should update token with revokedAt timestamp and log success', async () => {
      await service.revokeRefreshToken('valid-token');

      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { token: 'valid-token' },
        { revokedAt: expect.any(Date) },
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Revoking refresh token: valid-token',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Refresh token revoked successfully: valid-token',
      );
    });
  });

  describe('createRefreshToken', () => {
    it('should create and save new refresh token with logging', async () => {
      const userId = 'user-1';
      const token = 'new-token';
      const expiresIn = 3600; // 1 hour

      const expectedToken = {
        token,
        user: { id: userId },
        expiresAt: expect.any(Date),
      };

      (refreshTokenRepository.create as jest.Mock).mockReturnValue(
        expectedToken,
      );
      (refreshTokenRepository.save as jest.Mock).mockResolvedValue({
        ...expectedToken,
        id: '1',
        createdAt: new Date(),
      });

      const result = await service.createRefreshToken(userId, token, expiresIn);

      expect(refreshTokenRepository.create).toHaveBeenCalledWith(expectedToken);
      expect(refreshTokenRepository.save).toHaveBeenCalledWith(expectedToken);
      expect(result).toEqual(expect.objectContaining(expectedToken));
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Creating refresh token for user ${userId} with expiry ${expiresIn}s`,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(
          `Refresh token created successfully for user ${userId}`,
        ),
      );
    });
  });
});
