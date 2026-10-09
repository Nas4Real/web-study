import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseSubjectRepository, createSupabaseTaskRepository } from "@/server/study/supabase-study-repositories";
import { SubjectService } from "@/server/study/subject-service";
import { TaskDetailService } from "@/server/study/task-detail-service";
import { TaskService } from "@/server/study/task-service";

export function createTaskApiDependencies(admin: SupabaseClient) {
  const subjects = new SubjectService(createSupabaseSubjectRepository(admin));
  const tasks = new TaskService(createSupabaseTaskRepository(admin));
  return {
    details: new TaskDetailService({ subjects, tasks }),
    subjects,
    tasks,
  };
}
