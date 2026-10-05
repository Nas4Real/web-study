import { z } from "zod";

import type { CalendarOccurrenceDetailDTO } from "@/domain/dto";

import type { CalendarService } from "./calendar-service";
import type { SubjectService } from "./subject-service";
import { INVALID_INPUT, NOT_FOUND, STORAGE_UNAVAILABLE, type StudyResult } from "./study-domain";

export const sessionOccurrenceTargetSchema = z.object({
  originalStart: z.iso.datetime({ offset: true }),
  seriesId: z.string().uuid(),
}).strict();

export type SessionOccurrenceTarget = Readonly<z.infer<typeof sessionOccurrenceTargetSchema>>;

export type SessionDetailSources = Readonly<{
  calendar: Pick<CalendarService, "findOccurrence">;
  subjects: Pick<SubjectService, "list">;
}>;

export class SessionDetailService {
  constructor(private readonly sources: SessionDetailSources) {}

  async read(actorId: unknown, target: unknown): Promise<StudyResult<CalendarOccurrenceDetailDTO>> {
    const parsed = sessionOccurrenceTargetSchema.safeParse(target);
    if (!parsed.success) return INVALID_INPUT;
    try {
      const occurrence = await this.sources.calendar.findOccurrence(
        actorId,
        parsed.data.seriesId,
        parsed.data.originalStart,
      );
      if (occurrence.status === "error") return occurrence;
      const subjects = await this.sources.subjects.list(actorId);
      if (subjects.status === "error") return subjects;
      const subject = subjects.data.find(item => item.id === occurrence.data.subjectId);
      if (!subject) return NOT_FOUND;

      return {
        status: "success",
        data: {
          endsAt: occurrence.data.endsAt,
          focusText: occurrence.data.focusText,
          isRecurring: occurrence.data.recurrenceRule !== null,
          kind: occurrence.data.kind,
          location: occurrence.data.location,
          notesItems: occurrence.data.notesItems.map((text, position) => ({
            id: `${occurrence.data.seriesId}:${occurrence.data.originalStart}:note:${position}`,
            position,
            text,
          })),
          originalStart: occurrence.data.originalStart,
          professor: occurrence.data.professor,
          recurrenceRule: occurrence.data.recurrenceRule,
          seriesMaster: occurrence.data.seriesMaster,
          seriesId: occurrence.data.seriesId,
          startsAt: occurrence.data.startsAt,
          subject,
          title: occurrence.data.title,
        },
      };
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }
}
