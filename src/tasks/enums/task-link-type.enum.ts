/**
 * Supported task link relationship types.
 * Prefer typed string unions over TS enums for better type ergonomics.
 */
export const TASK_LINK_TYPES = [
  'BLOCKS',
  'IS_BLOCKED_BY',
  'SPLITS_TO',
  'SPLITS_FROM',
  'RELATES_TO',
  'DUPLICATES',
  'IS_DUPLICATED_BY',
] as const;

export type TaskLinkType = (typeof TASK_LINK_TYPES)[number];
