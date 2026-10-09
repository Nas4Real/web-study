import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { CalendarService } from "@/server/study/calendar-service";
import { SessionDetailService } from "@/server/study/session-detail-service";
import { createSupabaseCalendarRepository } from "@/server/study/supabase-calendar-repository";
import { createSupabaseSubjectRepository } from "@/server/study/supabase-study-repositories";
import { SubjectService } from "@/server/study/subject-service";

export function createCalendarApiDependencies(admin: SupabaseClient) {
  const calendar = new CalendarService(createSupabaseCalendarRepository(admin));
  const subjects = new SubjectService(createSupabaseSubjectRepository(admin));
  return {
    calendar,
    details: new SessionDetailService({ calendar, subjects }),
    subjects,
  };
}
