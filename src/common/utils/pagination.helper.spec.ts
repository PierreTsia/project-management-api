import { PaginationHelper } from './pagination.helper';

describe('PaginationHelper', () => {
  describe('createPaginationResponse', () => {
    it('should create a correct pagination response object for the first page', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const total = 10;
      const page = 1;
      const limit = 5;
      const response = PaginationHelper.createPaginationResponse(
        items,
        total,
        page,
        limit,
      );

      expect(response).toEqual({
        items,
        pagination: {
          page: 1,
          limit: 5,
          total: 10,
          totalPages: 2,
          hasNext: true,
          hasPrev: false,
        },
      });
    });

    it('should create a correct pagination response for a middle page', () => {
      const items = [{ id: 1 }];
      const total = 25;
      const page = 3;
      const limit = 5;
      const response = PaginationHelper.createPaginationResponse(
        items,
        total,
        page,
        limit,
      );

      expect(response.pagination).toEqual({
        page: 3,
        limit: 5,
        total: 25,
        totalPages: 5,
        hasNext: true,
        hasPrev: true,
      });
    });

    it('should handle the last page correctly', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const total = 7;
      const page = 2;
      const limit = 5;
      const response = PaginationHelper.createPaginationResponse(
        items,
        total,
        page,
        limit,
      );

      expect(response.pagination.hasNext).toBe(false);
      expect(response.pagination.hasPrev).toBe(true);
      expect(response.pagination.totalPages).toBe(2);
    });

    it('should handle a single page of results', () => {
      const items = [{ id: 1 }];
      const total = 1;
      const page = 1;
      const limit = 10;
      const response = PaginationHelper.createPaginationResponse(
        items,
        total,
        page,
        limit,
      );

      expect(response.pagination.hasNext).toBe(false);
      expect(response.pagination.hasPrev).toBe(false);
      expect(response.pagination.totalPages).toBe(1);
    });
  });

  describe('calculateSkip', () => {
    it('should calculate the skip value correctly', () => {
      expect(PaginationHelper.calculateSkip(1, 10)).toBe(0);
      expect(PaginationHelper.calculateSkip(2, 10)).toBe(10);
      expect(PaginationHelper.calculateSkip(5, 20)).toBe(80);
    });
  });

  describe('validatePaginationParams', () => {
    it('should not throw for valid parameters', () => {
      expect(() =>
        PaginationHelper.validatePaginationParams(1, 10),
      ).not.toThrow();
      expect(() =>
        PaginationHelper.validatePaginationParams(10, 100),
      ).not.toThrow();
    });

    it('should throw if page is less than 1', () => {
      expect(() => PaginationHelper.validatePaginationParams(0, 10)).toThrow(
        'Page must be greater than 0',
      );
      expect(() => PaginationHelper.validatePaginationParams(-1, 10)).toThrow(
        'Page must be greater than 0',
      );
    });

    it('should throw if limit is less than 1', () => {
      expect(() => PaginationHelper.validatePaginationParams(1, 0)).toThrow(
        'Limit must be greater than 0',
      );
      expect(() => PaginationHelper.validatePaginationParams(1, -10)).toThrow(
        'Limit must be greater than 0',
      );
    });

    it('should throw if limit is greater than 100', () => {
      expect(() => PaginationHelper.validatePaginationParams(1, 101)).toThrow(
        'Limit cannot exceed 100',
      );
    });
  });
});
