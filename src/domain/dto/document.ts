import type { EntityId, IsoDateTime, SubjectSummaryDTO } from "./shared";

export type DocumentKind = "pdf" | "document" | "image";

export interface DocumentSummaryDTO {
  id: EntityId;
  name: string;
  kind: DocumentKind;
  sizeBytes: number;
  subject: SubjectSummaryDTO;
  createdAt: IsoDateTime;
}
