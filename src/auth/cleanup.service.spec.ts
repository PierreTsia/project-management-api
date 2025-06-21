import { Test, TestingModule } from '@nestjs/testing';
import { CleanupService } from './cleanup.service';
import { UsersService } from '../users/users.service';
import { CustomLogger } from '../common/services/logger.service';
import { MockCustomLogger } from '../test/mocks';

describe('CleanupService', () => {
  let service: CleanupService;
  let mockLogger: MockCustomLogger;

  const mockUsersService = {
    deleteExpiredUnconfirmedAccounts: jest.fn(),
  };

  beforeEach(async () => {
    mockLogger = new MockCustomLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<CleanupService>(CleanupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cleanupExpiredUnconfirmedAccounts', () => {
    it('should successfully clean up expired accounts', async () => {
      const mockDeletedCount = 5;
      mockUsersService.deleteExpiredUnconfirmedAccounts.mockResolvedValue(
        mockDeletedCount,
      );

      await service.cleanupExpiredUnconfirmedAccounts();

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Starting cleanup of expired unconfirmed accounts...',
      );
      expect(
        mockUsersService.deleteExpiredUnconfirmedAccounts,
      ).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Cleaned up ${mockDeletedCount} expired unconfirmed accounts`,
      );
    });

    it('should handle errors during cleanup', async () => {
      const mockError = new Error('Database error');
      mockUsersService.deleteExpiredUnconfirmedAccounts.mockRejectedValue(
        mockError,
      );

      await service.cleanupExpiredUnconfirmedAccounts();

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Starting cleanup of expired unconfirmed accounts...',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error during cleanup of expired accounts',
        mockError.stack,
      );
    });
  });
});
