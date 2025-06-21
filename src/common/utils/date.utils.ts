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
   * Uses ISO 8601 standard: weeks start on Monday, week 1 is the week containing January 4th
   */
  static getWeekNumber(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    // Thursday in current week decides the year
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));

    // January 4 is always in week 1
    const week1 = new Date(d.getFullYear(), 0, 4);
    week1.setHours(0, 0, 0, 0);

    // Adjust to Thursday in week 1
    week1.setDate(week1.getDate() + 3 - ((week1.getDay() + 6) % 7));

    const millisecondsInWeek =
      DAYS_IN_WEEK *
      HOURS_IN_DAY *
      MINUTES_IN_HOUR *
      SECONDS_IN_MINUTE *
      MILLISECONDS_IN_SECOND;
    const week =
      Math.floor((d.getTime() - week1.getTime()) / millisecondsInWeek) + 1;
    const year = d.getFullYear();

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
   * Accepts Date or string (auto-converts string to Date)
   */
  static formatToDateString(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  }
}
