import type { EntityId, IsoDateTime, SubjectSummaryDTO } from "./shared";

export type CalendarView = "day" | "week" | "month";
export type CalendarSessionKind = "exam" | "university" | "revision";

export interface CalendarOccurrenceSummaryDTO {
  seriesId: EntityId;
  originalStart: IsoDateTime;
  title: string;
  kind: CalendarSessionKind;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  subject: SubjectSummaryDTO;
}

export interface SessionNoteDTO {
  id: EntityId;
  text: string;
  position: number;
}

export interface CalendarOccurrenceDetailDTO extends CalendarOccurrenceSummaryDTO {
  location: string | null;
  professor: string | null;
  focusText: string | null;
  notesItems: readonly SessionNoteDTO[];
  isRecurring: boolean;
  recurrenceRule: string | null;
}

export interface CalendarFixtureDTO {
  selectedDate: string;
  defaultView: CalendarView;
  availableViews: readonly CalendarView[];
  occurrences: readonly CalendarOccurrenceSummaryDTO[];
}
