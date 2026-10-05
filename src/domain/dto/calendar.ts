import type { EntityId, IsoDateTime, SubjectSummaryDTO } from "./shared";

export type CalendarView = "day" | "week" | "month";
export type CalendarSessionKind = "exam" | "university" | "revision";
export type CalendarTone = "algebra" | "analysis" | "physics" | "mechanics" | "method" | "languages";

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

export interface CalendarVisualEventDTO {
  id: EntityId;
  seriesId: EntityId;
  originalStart: IsoDateTime;
  title: string;
  subjectLabel: string;
  tone: CalendarTone;
  startLabel: string;
  endLabel: string;
  durationLabel: string;
  location: string | null;
  inProgress: boolean;
  progressLabel: string | null;
}

export interface CalendarWeekDayDTO {
  weekdayLabel: string;
  day: number;
  isToday: boolean;
  events: readonly CalendarVisualEventDTO[];
}

export interface CalendarDaySectionDTO {
  label: string;
  events: readonly CalendarVisualEventDTO[];
}

export interface CalendarMonthCellDTO {
  id: string;
  day: number;
  outsideMonth: boolean;
  isToday: boolean;
  event: Pick<CalendarVisualEventDTO, "title" | "tone" | "inProgress"> | null;
  events?: readonly CalendarVisualEventDTO[];
}

export interface CalendarViewFixtureDTO {
  anchorDate: IsoDateTime;
  greetingName: string;
  weekDays: readonly CalendarWeekDayDTO[];
  daySections: readonly CalendarDaySectionDTO[];
  monthCells: readonly CalendarMonthCellDTO[];
}

export interface CalendarPageDataDTO extends CalendarViewFixtureDTO {
  timeZone: string;
  date: string;
  view: CalendarView;
  fixture: boolean;
  subjects: readonly SubjectSummaryDTO[];
}
