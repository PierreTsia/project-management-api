import type { ContributorAggregateResponseDto } from './contributor-aggregate-response.dto';

export type ContributorsListResponseDto = {
  contributors: ContributorAggregateResponseDto[];
  total: number;
  page: number;
  limit: number;
};
