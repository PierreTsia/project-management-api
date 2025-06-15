import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { RefreshTokenService } from './refresh-token.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let refreshTokenRepository: Repository<RefreshToken>;

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
    it('should return refresh token if valid', async () => {
      (refreshTokenRepository.findOne as jest.Mock).mockResolvedValue(
        mockRefreshToken,
      );

      const result = await service.validateRefreshToken('valid-token');

      expect(result).toEqual(mockRefreshToken);
      expect(refreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { token: 'valid-token' },
        relations: ['user'],
      });
    });

    it('should throw UnauthorizedException if token not found', async () => {
      (refreshTokenRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.validateRefreshToken('invalid-token'),
      ).rejects.toThrow(UnauthorizedException);
      expect(refreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { token: 'invalid-token' },
        relations: ['user'],
      });
    });

    it('should throw UnauthorizedException if token is revoked', async () => {
      (refreshTokenRepository.findOne as jest.Mock).mockResolvedValue(
        mockRevokedToken,
      );

      await expect(
        service.validateRefreshToken('revoked-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if token is expired', async () => {
      (refreshTokenRepository.findOne as jest.Mock).mockResolvedValue(
        mockExpiredToken,
      );

      await expect(
        service.validateRefreshToken('expired-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('revokeRefreshToken', () => {
    it('should update token with revokedAt timestamp', async () => {
      await service.revokeRefreshToken('valid-token');

      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { token: 'valid-token' },
        { revokedAt: expect.any(Date) },
      );
    });
  });

  describe('createRefreshToken', () => {
    it('should create and save new refresh token', async () => {
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
    });
  });
});
