// Constants for date calculations
export const HOURS_IN_DAY = 24;
export const MINUTES_IN_HOUR = 60;
export const SECONDS_IN_MINUTE = 60;
export const MILLISECONDS_IN_SECOND = 1000;
export const DAYS_IN_WEEK = 7;
export const SUNDAY_DAY_NUMBER = 0;
export const SUNDAY_ADJUSTMENT = -6;
export const MONDAY_ADJUSTMENT = 1;

export class DateUtils {
  /**
   * Gets the start of the week (Monday) for a given date
   */
  static getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff =
      d.getDate() -
      day +
      (day === SUNDAY_DAY_NUMBER ? SUNDAY_ADJUSTMENT : MONDAY_ADJUSTMENT);
    return new Date(d.setDate(diff));
  }

  /**
   * Gets the ISO week number for a given date (YYYY-WW format)
   */
  static getWeekNumber(date: Date): string {
    const year = date.getFullYear();
    const week = Math.ceil(
      (date.getTime() - new Date(year, 0, 1).getTime()) /
        (DAYS_IN_WEEK *
          HOURS_IN_DAY *
          MINUTES_IN_HOUR *
          SECONDS_IN_MINUTE *
          MILLISECONDS_IN_SECOND),
    );
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  /**
   * Sets a date to the start of the day (00:00:00.000)
   */
  static setToStartOfDay(date: Date): Date {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  }

  /**
   * Gets a date range for the last N days
   */
  static getDateRangeForLastDays(days: number): {
    startDate: Date;
    endDate: Date;
  } {
    const endDate = this.setToStartOfDay(new Date());
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);
    return { startDate, endDate };
  }

  /**
   * Formats a date to YYYY-MM-DD string format
   */
  static formatToDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
