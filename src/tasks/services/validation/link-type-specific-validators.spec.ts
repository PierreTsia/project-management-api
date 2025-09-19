import { Test, TestingModule } from '@nestjs/testing';
import {
  BlocksTypeValidator,
  DuplicatesTypeValidator,
} from './link-type-specific-validators';
import { Task } from '../../entities/task.entity';

describe('Link Type Specific Validators', () => {
  let blocksTypeValidator: BlocksTypeValidator;
  let duplicatesTypeValidator: DuplicatesTypeValidator;

  const mockSourceTask: Task = {
    id: 'task-123',
    title: 'Source Task',
    description: 'Source task description',
    status: 'TODO' as any,
    priority: 'MEDIUM' as any,
    projectId: 'project-123',
    projectName: 'Test Project',
    assignee: {
      id: 'user-123',
      name: 'User 123',
      email: 'user123@example.com',
      bio: 'User 123 bio',
      dob: new Date(),
      phone: '1234567890',
      avatarUrl: 'https://example.com/avatar.jpg',
      isEmailConfirmed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      provider: 'local',
      canChangePassword: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockTargetTask: Task = {
    id: 'task-456',
    title: 'Target Task',
    description: 'Target task description',
    status: 'IN_PROGRESS' as any,
    priority: 'HIGH' as any,
    projectId: 'project-123',
    projectName: 'Test Project',
    assignee: {
      id: 'user-456',
      name: 'User 456',
      email: 'user456@example.com',
      bio: 'User 456 bio',
      dob: new Date(),
      phone: '1234567890',
      avatarUrl: 'https://example.com/avatar.jpg',
      isEmailConfirmed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      provider: 'local',
      canChangePassword: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlocksTypeValidator, DuplicatesTypeValidator],
    }).compile();

    blocksTypeValidator = module.get<BlocksTypeValidator>(BlocksTypeValidator);
    duplicatesTypeValidator = module.get<DuplicatesTypeValidator>(
      DuplicatesTypeValidator,
    );
  });

  describe('BlocksTypeValidator', () => {
    it('should always return valid (no specific business rules implemented)', () => {
      const result = blocksTypeValidator.canCreate(
        mockSourceTask,
        mockTargetTask,
      );

      expect(result).toEqual({ valid: true });
    });

    it('should return valid for same task (edge case)', () => {
      const result = blocksTypeValidator.canCreate(
        mockSourceTask,
        mockSourceTask,
      );

      expect(result).toEqual({ valid: true });
    });

    it('should return valid for tasks with different statuses', () => {
      const completedTask = { ...mockTargetTask, status: 'DONE' as any };
      const result = blocksTypeValidator.canCreate(
        mockSourceTask,
        completedTask,
      );

      expect(result).toEqual({ valid: true });
    });

    it('should return valid for tasks with different priorities', () => {
      const lowPriorityTask = { ...mockTargetTask, priority: 'LOW' as any };
      const result = blocksTypeValidator.canCreate(
        mockSourceTask,
        lowPriorityTask,
      );

      expect(result).toEqual({ valid: true });
    });

    it('should return valid for tasks with different assignees', () => {
      const differentAssigneeTask = {
        ...mockTargetTask,
        assignee: { ...mockTargetTask.assignee, id: 'user-789' },
      };
      const result = blocksTypeValidator.canCreate(
        mockSourceTask,
        differentAssigneeTask,
      );

      expect(result).toEqual({ valid: true });
    });
  });

  describe('DuplicatesTypeValidator', () => {
    it('should always return valid (no specific business rules implemented)', () => {
      const result = duplicatesTypeValidator.canCreate(
        mockSourceTask,
        mockTargetTask,
      );

      expect(result).toEqual({ valid: true });
    });

    it('should return valid for same task (edge case)', () => {
      const result = duplicatesTypeValidator.canCreate(
        mockSourceTask,
        mockSourceTask,
      );

      expect(result).toEqual({ valid: true });
    });

    it('should return valid for tasks with different statuses', () => {
      const completedTask = { ...mockTargetTask, status: 'DONE' as any };
      const result = duplicatesTypeValidator.canCreate(
        mockSourceTask,
        completedTask,
      );

      expect(result).toEqual({ valid: true });
    });

    it('should return valid for tasks with different priorities', () => {
      const lowPriorityTask = { ...mockTargetTask, priority: 'LOW' as any };
      const result = duplicatesTypeValidator.canCreate(
        mockSourceTask,
        lowPriorityTask,
      );

      expect(result).toEqual({ valid: true });
    });

    it('should return valid for tasks with different assignees', () => {
      const differentAssigneeTask = {
        ...mockTargetTask,
        assignee: { ...mockTargetTask.assignee, id: 'user-789' },
      };
      const result = duplicatesTypeValidator.canCreate(
        mockSourceTask,
        differentAssigneeTask,
      );

      expect(result).toEqual({ valid: true });
    });
  });

  describe('Strategy Pattern Implementation', () => {
    it('should implement LinkValidationStrategy interface', () => {
      expect(typeof blocksTypeValidator.canCreate).toBe('function');
      expect(typeof duplicatesTypeValidator.canCreate).toBe('function');
    });

    it('should accept Task parameters as expected by interface', () => {
      const result1 = blocksTypeValidator.canCreate(
        mockSourceTask,
        mockTargetTask,
      );
      const result2 = duplicatesTypeValidator.canCreate(
        mockSourceTask,
        mockTargetTask,
      );

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should return ValidationResult as expected by interface', () => {
      const result = blocksTypeValidator.canCreate(
        mockSourceTask,
        mockTargetTask,
      );

      expect(result).toHaveProperty('valid');
      expect(typeof result.valid).toBe('boolean');
      if (!result.valid && 'reason' in result) {
        expect(result).toHaveProperty('reason');
        expect(typeof result.reason).toBe('string');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined tasks gracefully', () => {
      // Note: In real implementation, these would likely throw errors
      // but current implementation doesn't validate inputs
      expect(() =>
        blocksTypeValidator.canCreate(null as any, mockTargetTask),
      ).not.toThrow();
      expect(() =>
        duplicatesTypeValidator.canCreate(mockSourceTask, undefined as any),
      ).not.toThrow();
    });

    it('should handle tasks with minimal properties', () => {
      const minimalTask = { id: 'minimal-task' } as Task;
      const result1 = blocksTypeValidator.canCreate(
        minimalTask,
        mockTargetTask,
      );
      const result2 = duplicatesTypeValidator.canCreate(
        mockSourceTask,
        minimalTask,
      );

      expect(result1).toEqual({ valid: true });
      expect(result2).toEqual({ valid: true });
    });
  });
});
