export class PaginationHelper {
  /**
   * Creates a standardized pagination response
   */
  static createPaginationResponse<T>(
    items: T[],
    total: number,
    page: number,
    limit: number,
  ) {
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Calculates the skip value for pagination
   */
  static calculateSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Validates pagination parameters
   */
  static validatePaginationParams(page: number, limit: number): void {
    if (page < 1) {
      throw new Error('Page must be greater than 0');
    }
    if (limit < 1) {
      throw new Error('Limit must be greater than 0');
    }
    if (limit > 100) {
      throw new Error('Limit cannot exceed 100');
    }
  }
}
