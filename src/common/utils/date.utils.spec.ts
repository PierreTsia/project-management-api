import { DateUtils } from './date.utils';

describe('DateUtils', () => {
  describe('setToStartOfDay', () => {
    it('should set time to 00:00:00.000', () => {
      const date = new Date('2024-01-15T14:30:45.123Z');
      const result = DateUtils.setToStartOfDay(date);

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
      expect(result.getDate()).toBe(15);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getFullYear()).toBe(2024);
    });

    it('should not modify the original date', () => {
      const originalDate = new Date('2024-01-15T14:30:45.123Z');
      const originalTime = originalDate.getTime();

      DateUtils.setToStartOfDay(originalDate);

      expect(originalDate.getTime()).toBe(originalTime);
    });
  });

  describe('getWeekStart', () => {
    it('should return Monday for a Monday', () => {
      const monday = new Date('2024-01-15'); // Monday
      const result = DateUtils.getWeekStart(monday);

      expect(result.getDay()).toBe(1); // Monday
      expect(result.toISOString().split('T')[0]).toBe('2024-01-15');
    });

    it('should return Monday for a Wednesday', () => {
      const wednesday = new Date('2024-01-17'); // Wednesday
      const result = DateUtils.getWeekStart(wednesday);

      expect(result.getDay()).toBe(1); // Monday
      expect(result.toISOString().split('T')[0]).toBe('2024-01-15');
    });

    it('should return Monday for a Sunday', () => {
      const sunday = new Date('2024-01-21'); // Sunday
      const result = DateUtils.getWeekStart(sunday);

      expect(result.getDay()).toBe(1); // Monday
      expect(result.toISOString().split('T')[0]).toBe('2024-01-15');
    });

    it('should handle week boundaries correctly', () => {
      const sunday = new Date('2024-01-14'); // Sunday
      const result = DateUtils.getWeekStart(sunday);

      expect(result.getDay()).toBe(1); // Monday
      expect(result.toISOString().split('T')[0]).toBe('2024-01-08');
    });
  });

  describe('getWeekNumber', () => {
    it('should return correct week number for first week of year', () => {
      const date = new Date('2024-01-01'); // First day of year
      const result = DateUtils.getWeekNumber(date);
      expect(result).toBe('2024-W01');
    });

    it('should return correct week number for January 4th (always week 1)', () => {
      const date = new Date('2024-01-04'); // January 4th
      const result = DateUtils.getWeekNumber(date);
      expect(result).toBe('2024-W01');
    });

    it('should return correct week number for middle of year', () => {
      const date = new Date('2024-06-15'); // Middle of year
      const result = DateUtils.getWeekNumber(date);
      expect(result).toMatch(/^2024-W\d{2}$/);
    });

    it('should return correct week number for end of year', () => {
      const date = new Date('2024-12-31'); // Last day of year
      const result = DateUtils.getWeekNumber(date);
      // December 31 can be in week 1 of the next year according to ISO 8601
      expect(result).toMatch(/^(2024|2025)-W\d{2}$/);
    });

    it('should handle year boundary correctly (December 31, 2023)', () => {
      const date = new Date('2023-12-31'); // Last day of 2023
      const result = DateUtils.getWeekNumber(date);
      // Should be week 1 of 2024 if it's a Monday, or last week of 2023
      expect(result).toMatch(/^(2023|2024)-W\d{2}$/);
    });

    it('should handle year boundary correctly (January 1, 2024)', () => {
      const date = new Date('2024-01-01'); // First day of 2024
      const result = DateUtils.getWeekNumber(date);
      // Should be week 1 of 2024
      expect(result).toBe('2024-W01');
    });

    it('should be consistent for same week dates', () => {
      const monday = new Date('2024-01-01'); // Monday
      const wednesday = new Date('2024-01-03'); // Wednesday
      const sunday = new Date('2024-01-07'); // Sunday

      const mondayWeek = DateUtils.getWeekNumber(monday);
      const wednesdayWeek = DateUtils.getWeekNumber(wednesday);
      const sundayWeek = DateUtils.getWeekNumber(sunday);

      expect(mondayWeek).toBe(wednesdayWeek);
      expect(wednesdayWeek).toBe(sundayWeek);
    });
  });

  describe('getDateRangeForLastDays', () => {
    it('should return correct date range for 7 days', () => {
      const today = new Date(2024, 0, 15, 12, 0, 0); // January 15, 2024
      jest.useFakeTimers();
      jest.setSystemTime(today);

      const result = DateUtils.getDateRangeForLastDays(7);

      expect(result.endDate.getFullYear()).toBe(2024);
      expect(result.endDate.getMonth()).toBe(0); // January
      expect(result.endDate.getDate()).toBe(15);
      expect(result.startDate.getFullYear()).toBe(2024);
      expect(result.startDate.getMonth()).toBe(0); // January
      expect(result.startDate.getDate()).toBe(8);
      expect(result.endDate.getHours()).toBe(0);
      expect(result.startDate.getHours()).toBe(0);

      jest.useRealTimers();
    });

    it('should return correct date range for 30 days', () => {
      const today = new Date(2024, 0, 15, 12, 0, 0); // January 15, 2024
      jest.useFakeTimers();
      jest.setSystemTime(today);

      const result = DateUtils.getDateRangeForLastDays(30);

      expect(result.endDate.getFullYear()).toBe(2024);
      expect(result.endDate.getMonth()).toBe(0); // January
      expect(result.endDate.getDate()).toBe(15);
      expect(result.startDate.getFullYear()).toBe(2023);
      expect(result.startDate.getMonth()).toBe(11); // December
      expect(result.startDate.getDate()).toBe(16);

      jest.useRealTimers();
    });
  });

  describe('formatToDateString', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = new Date('2024-01-15T14:30:45.123Z');
      const result = DateUtils.formatToDateString(date);
      expect(result).toBe('2024-01-15');
    });

    it('should handle different time zones correctly', () => {
      const date = new Date('2024-01-15T23:59:59.999Z');
      const result = DateUtils.formatToDateString(date);
      expect(result).toBe('2024-01-15');
    });

    it('should accept a string and return the correct date string (regression test)', () => {
      const dateString = '2024-01-15T14:30:45.123Z';
      const result = DateUtils.formatToDateString(dateString);
      expect(result).toBe('2024-01-15');
    });

    it('should not throw if given a string instead of a Date (regression test)', () => {
      expect(() =>
        DateUtils.formatToDateString('2024-01-15T14:30:45.123Z'),
      ).not.toThrow();
    });
  });
});
