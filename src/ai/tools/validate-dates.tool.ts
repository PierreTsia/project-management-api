import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { z } from 'zod';

const ValidateDatesInputSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  dueDate: z.string().optional(),
});

const ValidateDatesOutputSchema = z.object({
  isValid: z.boolean(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  dueDate: z.string().optional(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

@Injectable()
export class ValidateDatesTool {
  @Tool({ name: 'validate_dates' })
  async validateDates(
    params: z.infer<typeof ValidateDatesInputSchema>,
  ): Promise<z.infer<typeof ValidateDatesOutputSchema>> {
    const { startDate, endDate, dueDate } =
      ValidateDatesInputSchema.parse(params);

    const errors: string[] = [];
    const warnings: string[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const parseDate = (dateStr: string): Date | null => {
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0];
    };

    let parsedStart: Date | null = null;
    let parsedEnd: Date | null = null;
    let parsedDue: Date | null = null;

    // Parse and validate start date
    if (startDate) {
      parsedStart = parseDate(startDate);
      if (!parsedStart) {
        errors.push(`Invalid start date format: ${startDate}`);
      } else if (parsedStart < today) {
        warnings.push('Start date is in the past');
      }
    }

    // Parse and validate end date
    if (endDate) {
      parsedEnd = parseDate(endDate);
      if (!parsedEnd) {
        errors.push(`Invalid end date format: ${endDate}`);
      } else if (parsedEnd < today) {
        warnings.push('End date is in the past');
      }
    }

    // Parse and validate due date
    if (dueDate) {
      parsedDue = parseDate(dueDate);
      if (!parsedDue) {
        errors.push(`Invalid due date format: ${dueDate}`);
      } else if (parsedDue < today) {
        warnings.push('Due date is in the past');
      }
    }

    // Cross-validate dates
    if (parsedStart && parsedEnd && parsedStart > parsedEnd) {
      errors.push('Start date cannot be after end date');
    }

    if (parsedStart && parsedDue && parsedStart > parsedDue) {
      errors.push('Start date cannot be after due date');
    }

    if (parsedEnd && parsedDue && parsedEnd > parsedDue) {
      warnings.push('End date is after due date');
    }

    return {
      isValid: errors.length === 0,
      startDate: parsedStart ? formatDate(parsedStart) : undefined,
      endDate: parsedEnd ? formatDate(parsedEnd) : undefined,
      dueDate: parsedDue ? formatDate(parsedDue) : undefined,
      errors,
      warnings,
    };
  }
}
