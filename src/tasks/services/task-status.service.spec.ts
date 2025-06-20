import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TaskStatusService } from './task-status.service';
import { TaskStatus } from '../enums/task-status.enum';

describe('TaskStatusService', () => {
  let service: TaskStatusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskStatusService],
    }).compile();

    service = module.get<TaskStatusService>(TaskStatusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateStatusTransition', () => {
    it('should allow valid workflow transitions', () => {
      // Forward transitions
      expect(
        service.validateStatusTransition(
          TaskStatus.TODO,
          TaskStatus.IN_PROGRESS,
        ),
      ).toBe(true);
      expect(
        service.validateStatusTransition(
          TaskStatus.IN_PROGRESS,
          TaskStatus.DONE,
        ),
      ).toBe(true);

      // Backward transitions (limited)
      expect(
        service.validateStatusTransition(
          TaskStatus.IN_PROGRESS,
          TaskStatus.TODO,
        ),
      ).toBe(true);
      expect(
        service.validateStatusTransition(
          TaskStatus.DONE,
          TaskStatus.IN_PROGRESS,
        ),
      ).toBe(true);

      // Same status
      expect(
        service.validateStatusTransition(TaskStatus.TODO, TaskStatus.TODO),
      ).toBe(true);
      expect(
        service.validateStatusTransition(
          TaskStatus.IN_PROGRESS,
          TaskStatus.IN_PROGRESS,
        ),
      ).toBe(true);
      expect(
        service.validateStatusTransition(TaskStatus.DONE, TaskStatus.DONE),
      ).toBe(true);
    });

    it('should reject invalid transitions', () => {
      // Invalid direct jumps
      expect(
        service.validateStatusTransition(TaskStatus.TODO, TaskStatus.DONE),
      ).toBe(false);
      expect(
        service.validateStatusTransition(TaskStatus.DONE, TaskStatus.TODO),
      ).toBe(false);
    });
  });

  describe('getValidNextStatuses', () => {
    it('should return valid next statuses for each current status', () => {
      const todoNextStatuses = service.getValidNextStatuses(TaskStatus.TODO);
      expect(todoNextStatuses).toEqual([TaskStatus.IN_PROGRESS]);

      const inProgressNextStatuses = service.getValidNextStatuses(
        TaskStatus.IN_PROGRESS,
      );
      expect(inProgressNextStatuses).toEqual([
        TaskStatus.TODO,
        TaskStatus.DONE,
      ]);

      const doneNextStatuses = service.getValidNextStatuses(TaskStatus.DONE);
      expect(doneNextStatuses).toEqual([TaskStatus.IN_PROGRESS]);
    });
  });

  describe('validateAndThrowIfInvalid', () => {
    it('should not throw exception for valid transitions', () => {
      expect(() => {
        service.validateAndThrowIfInvalid(
          TaskStatus.TODO,
          TaskStatus.IN_PROGRESS,
        );
      }).not.toThrow();

      expect(() => {
        service.validateAndThrowIfInvalid(
          TaskStatus.IN_PROGRESS,
          TaskStatus.DONE,
        );
      }).not.toThrow();
    });

    it('should throw BadRequestException for invalid transitions', () => {
      expect(() => {
        service.validateAndThrowIfInvalid(TaskStatus.TODO, TaskStatus.DONE);
      }).toThrow(BadRequestException);

      expect(() => {
        service.validateAndThrowIfInvalid(TaskStatus.DONE, TaskStatus.TODO);
      }).toThrow(BadRequestException);
    });
  });
});
