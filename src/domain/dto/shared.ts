export type EntityId = string;
export type IsoDateTime = string;

export interface SubjectSummaryDTO {
  id: EntityId;
  name: string;
  color: string;
}

export interface ProfileDTO {
  id: EntityId;
  displayName: string;
  email: string;
  timezone: string;
  storageQuotaBytes: number;
  storageUsedBytes: number;
}
