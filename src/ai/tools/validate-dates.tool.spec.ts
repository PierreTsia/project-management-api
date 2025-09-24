import { Test, TestingModule } from '@nestjs/testing';
import { ValidateDatesTool } from './validate-dates.tool';

describe('ValidateDatesTool', () => {
  let tool: ValidateDatesTool;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidateDatesTool],
    }).compile();

    tool = module.get<ValidateDatesTool>(ValidateDatesTool);
  });

  describe('validateDates', () => {
    it('should validate valid dates successfully', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);

      const params = {
        startDate: tomorrow.toISOString().split('T')[0],
        endDate: nextWeek.toISOString().split('T')[0],
        dueDate: nextMonth.toISOString().split('T')[0],
      };

      const result = await tool.validateDates(params);

      expect(result).toEqual({
        isValid: true,
        startDate: tomorrow.toISOString().split('T')[0],
        endDate: nextWeek.toISOString().split('T')[0],
        dueDate: nextMonth.toISOString().split('T')[0],
        errors: [],
        warnings: [],
      });
    });

    it('should handle invalid date formats', async () => {
      const params = {
        startDate: 'invalid-date',
        endDate: '2025-13-45', // Invalid month/day
        dueDate: 'not-a-date',
      };

      const result = await tool.validateDates(params);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Invalid start date format: invalid-date',
      );
      expect(result.errors).toContain('Invalid end date format: 2025-13-45');
      expect(result.errors).toContain('Invalid due date format: not-a-date');
      expect(result.startDate).toBeUndefined();
      expect(result.endDate).toBeUndefined();
      expect(result.dueDate).toBeUndefined();
    });

    it('should warn about past dates', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);

      const params = {
        startDate: yesterdayStr,
        endDate: nextWeek.toISOString().split('T')[0],
        dueDate: nextMonth.toISOString().split('T')[0],
      };

      const result = await tool.validateDates(params);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Start date is in the past');
      expect(result.startDate).toBe(yesterdayStr);
    });

    it('should validate date relationships', async () => {
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const params = {
        startDate: nextMonth.toISOString().split('T')[0],
        endDate: nextWeek.toISOString().split('T')[0],
        dueDate: tomorrow.toISOString().split('T')[0],
      };

      const result = await tool.validateDates(params);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start date cannot be after end date');
      expect(result.errors).toContain('Start date cannot be after due date');
      expect(result.warnings).toContain('End date is after due date');
    });

    it('should handle partial date inputs', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const params = {
        startDate: tomorrow.toISOString().split('T')[0],
        // endDate and dueDate omitted
      };

      const result = await tool.validateDates(params);

      expect(result.isValid).toBe(true);
      expect(result.startDate).toBe(tomorrow.toISOString().split('T')[0]);
      expect(result.endDate).toBeUndefined();
      expect(result.dueDate).toBeUndefined();
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should handle empty input', async () => {
      const params = {};

      const result = await tool.validateDates(params);

      expect(result.isValid).toBe(true);
      expect(result.startDate).toBeUndefined();
      expect(result.endDate).toBeUndefined();
      expect(result.dueDate).toBeUndefined();
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should format dates consistently', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const params = {
        startDate: tomorrow.toISOString(), // Full ISO string
        endDate: nextWeek.toISOString(), // Full ISO string
      };

      const result = await tool.validateDates(params);

      expect(result.isValid).toBe(true);
      expect(result.startDate).toBe(tomorrow.toISOString().split('T')[0]);
      expect(result.endDate).toBe(nextWeek.toISOString().split('T')[0]);
    });
  });
});
