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
    it('should allow all status transitions (including backwards)', () => {
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
      expect(
        service.validateStatusTransition(TaskStatus.TODO, TaskStatus.DONE),
      ).toBe(true);

      // Backward transitions
      expect(
        service.validateStatusTransition(
          TaskStatus.DONE,
          TaskStatus.IN_PROGRESS,
        ),
      ).toBe(true);
      expect(
        service.validateStatusTransition(
          TaskStatus.IN_PROGRESS,
          TaskStatus.TODO,
        ),
      ).toBe(true);
      expect(
        service.validateStatusTransition(TaskStatus.DONE, TaskStatus.TODO),
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
  });

  describe('getValidNextStatuses', () => {
    it('should return all statuses except the current one', () => {
      const todoNextStatuses = service.getValidNextStatuses(TaskStatus.TODO);
      expect(todoNextStatuses).toEqual([
        TaskStatus.IN_PROGRESS,
        TaskStatus.DONE,
      ]);

      const inProgressNextStatuses = service.getValidNextStatuses(
        TaskStatus.IN_PROGRESS,
      );
      expect(inProgressNextStatuses).toEqual([
        TaskStatus.TODO,
        TaskStatus.DONE,
      ]);

      const doneNextStatuses = service.getValidNextStatuses(TaskStatus.DONE);
      expect(doneNextStatuses).toEqual([
        TaskStatus.TODO,
        TaskStatus.IN_PROGRESS,
      ]);
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
        service.validateAndThrowIfInvalid(TaskStatus.DONE, TaskStatus.TODO);
      }).not.toThrow();
    });

    it('should throw BadRequestException for invalid transitions (though currently all are valid)', () => {
      // This test is for future use when we might add transition restrictions
      // Currently all transitions are valid, so this test ensures the method structure is correct
      expect(() => {
        service.validateAndThrowIfInvalid(
          TaskStatus.TODO,
          TaskStatus.IN_PROGRESS,
        );
      }).not.toThrow(BadRequestException);
    });
  });
});
