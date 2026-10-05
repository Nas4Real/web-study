import { z } from "zod";

import { entityIdSchema } from "./study-domain";

const normalizedName = z.string()
  .transform(value => value.trim().replace(/\s+/g, " "))
  .pipe(z.string().min(1).max(160));
const position = z.number().int().min(0).max(1_000_000).default(0);
const nullableEntityId = entityIdSchema.nullable().default(null);

export const chapterCreateInputSchema = z.object({
  name: normalizedName,
  position,
  subjectId: entityIdSchema,
}).strict();

export const chapterUpdateInputSchema = z.object({
  name: normalizedName.optional(),
  position: position.removeDefault().optional(),
}).strict().refine(value => Object.keys(value).length > 0);

export const chapterListFilterSchema = z.object({
  subjectId: entityIdSchema.optional(),
}).strict().default({});

export const folderCreateInputSchema = z.object({
  chapterId: nullableEntityId,
  name: normalizedName,
  parentId: nullableEntityId,
  position,
  subjectId: entityIdSchema,
}).strict();

export const folderUpdateInputSchema = z.object({
  chapterId: entityIdSchema.nullable().optional(),
  name: normalizedName.optional(),
  parentId: entityIdSchema.nullable().optional(),
  position: position.removeDefault().optional(),
}).strict().refine(value => Object.keys(value).length > 0);

export const folderListFilterSchema = z.object({
  chapterId: entityIdSchema.nullable().optional(),
  parentId: entityIdSchema.nullable().optional(),
  subjectId: entityIdSchema.optional(),
}).strict().default({});

export type Chapter = Readonly<{
  createdAt: string;
  id: string;
  name: string;
  position: number;
  subjectId: string;
  updatedAt: string;
}>;
export type ChapterCreate = z.infer<typeof chapterCreateInputSchema>;
export type ChapterUpdate = z.infer<typeof chapterUpdateInputSchema>;
export type ChapterListFilter = z.infer<typeof chapterListFilterSchema>;

export type Folder = Readonly<{
  chapterId: string | null;
  createdAt: string;
  id: string;
  name: string;
  parentId: string | null;
  position: number;
  subjectId: string;
  updatedAt: string;
}>;
export type FolderCreate = z.infer<typeof folderCreateInputSchema>;
export type FolderUpdate = z.infer<typeof folderUpdateInputSchema>;
export type FolderListFilter = z.infer<typeof folderListFilterSchema>;
