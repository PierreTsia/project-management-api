export type HistoryEventType =
  | 'STATUS_CHANGE'
  | 'COMMENT'
  | 'ATTACHMENT'
  | 'ASSIGNMENT'
  | 'OTHER';

export interface HistoryEventContext {
  id: string;
  type: HistoryEventType;
  timestamp: string;
  actorId?: string;
  summary?: string;
}
