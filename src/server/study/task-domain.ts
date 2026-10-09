import { z } from "zod";

const normalizedText = (maximum: number) =>
  z
    .string()
    .transform((value) => value.trim().replace(/\s+/g, " "))
    .pipe(z.string().min(1).max(maximum));

const nullableDescription = z
  .string()
  .transform((value) => {
    const normalized = value.trim().replace(/\s+/g, " ");
    return normalized.length === 0 ? null : normalized;
  })
  .pipe(z.string().max(10_000).nullable())
  .nullable();

const nullableDateTime = z.iso.datetime({ offset: true }).nullable();

export const taskPrioritySchema = z.enum(["normal", "high"]);
export const taskStatusSchema = z.enum(["pending", "completed", "someday"]);

export const taskCreateInputSchema = z
  .object({
    description: nullableDescription.default(null),
    dueAt: nullableDateTime.default(null),
    priority: taskPrioritySchema.default("normal"),
    status: z.literal("pending").default("pending"),
    subjectId: z.string().uuid(),
    subtasks: z
      .array(z.object({ title: normalizedText(300) }).strict())
      .max(100)
      .default([]),
    title: normalizedText(240),
  })
  .strict();

export const taskUpdateInputSchema = z
  .object({
    description: nullableDescription.optional(),
    dueAt: nullableDateTime.optional(),
    priority: taskPrioritySchema.optional(),
    status: z.enum(["pending", "someday"]).optional(),
    subjectId: z.string().uuid().optional(),
    title: normalizedText(240).optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0);

export const subtaskCreateInputSchema = z.object({
  completed: z.boolean().default(false),
  position: z.number().int().min(0).max(1_000_000).default(0),
  title: normalizedText(300),
}).strict();

export const subtaskUpdateInputSchema = z.object({
  completed: z.boolean().optional(),
  position: z.number().int().min(0).max(1_000_000).optional(),
  title: normalizedText(300).optional(),
}).strict().refine((input) => Object.keys(input).length > 0);

export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskCreate = z.infer<typeof taskCreateInputSchema>;
export type TaskUpdate = z.infer<typeof taskUpdateInputSchema>;
export type SubtaskCreate = z.infer<typeof subtaskCreateInputSchema>;
export type SubtaskUpdate = z.infer<typeof subtaskUpdateInputSchema>;

export type TaskSubtask = Readonly<{
  completedAt: string | null;
  createdAt: string;
  id: string;
  position: number;
  title: string;
  updatedAt: string;
}>;

export type Task = Readonly<{
  completedAt: string | null;
  createdAt: string;
  description: string | null;
  dueAt: string | null;
  id: string;
  priority: TaskPriority;
  status: TaskStatus;
  subjectId: string;
  subtasks: readonly TaskSubtask[];
  title: string;
  updatedAt: string;
}>;

export type TaskGroups = Readonly<{
  completed: readonly Task[];
  later: readonly Task[];
  overdue: readonly Task[];
  someday: readonly Task[];
  today: readonly Task[];
}>;

function localDateKey(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function groupTasks(
  tasks: readonly Task[],
  timeZone: string,
  now = new Date(),
): TaskGroups {
  const groups: Record<keyof TaskGroups, Task[]> = {
    completed: [],
    later: [],
    overdue: [],
    someday: [],
    today: [],
  };
  const today = localDateKey(now, timeZone);

  for (const task of tasks) {
    if (task.status === "completed") {
      groups.completed.push(task);
    } else if (task.status === "someday") {
      groups.someday.push(task);
    } else if (task.dueAt === null) {
      groups.later.push(task);
    } else {
      const dueDate = localDateKey(new Date(task.dueAt), timeZone);
      if (dueDate < today) groups.overdue.push(task);
      else if (dueDate === today) groups.today.push(task);
      else groups.later.push(task);
    }
  }

  return groups;
}
