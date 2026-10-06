import { z } from "zod";

import { entityIdSchema } from "./study-domain";

const normalizedName = z.string()
  .transform(value => value.trim().replace(/\s+/g, " "))
  .pipe(z.string().min(1).max(160));
const position = z.number().int().min(0).max(1_000_000).default(0);
const nullableEntityId = entityIdSchema.nullable().default(null);

export const MAX_FILE_BYTES = 52_428_800;
export const UPLOAD_URL_TTL_SECONDS = 600;

const allowedMimeByExtension = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  pdf: "application/pdf",
  png: "image/png",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

const uploadFilenameSchema = z.string()
  .transform(value => value.trim())
  .pipe(z.string().min(1).max(512).regex(/^[^\\/\u0000-\u001f\u007f]+$/));
const uploadMimeSchema = z.string().trim().toLowerCase().pipe(
  z.string().min(1).max(255).regex(/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/),
);

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

export const uploadIntentInputSchema = z.object({
  chapterId: nullableEntityId,
  filename: uploadFilenameSchema,
  folderId: nullableEntityId,
  mimeType: uploadMimeSchema,
  sizeBytes: z.number().int().min(1).max(MAX_FILE_BYTES),
  subjectId: entityIdSchema,
}).strict().superRefine((value, context) => {
  const separator = value.filename.lastIndexOf(".");
  const extension = separator > 0 ? value.filename.slice(separator + 1).toLowerCase() : "";
  const expectedMime = allowedMimeByExtension[extension as keyof typeof allowedMimeByExtension];
  if (!expectedMime || expectedMime !== value.mimeType) {
    context.addIssue({ code: "custom", message: "Unsupported file type.", path: ["filename"] });
  }
}).transform(value => ({
  ...value,
  extension: value.filename.slice(value.filename.lastIndexOf(".") + 1).toLowerCase(),
}));

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

export type UploadIntentInput = z.infer<typeof uploadIntentInputSchema>;

export type FileMetadata = Readonly<{
  chapterId: string | null;
  createdAt: string;
  displayName: string;
  extension: string;
  folderId: string | null;
  id: string;
  mimeType: string;
  originalFilename: string;
  sizeBytes: number;
  subjectId: string;
  uploadState: "pending" | "ready" | "failed" | "deleting" | "deleted";
}>;

export type UploadIntentReservation = Omit<FileMetadata, "id"> & Readonly<{
  expiresAt: string;
  fileId: string;
  intentId: string;
  objectKey: string;
}>;

export type UploadIntent = Readonly<{
  expiresAt: string;
  file: FileMetadata;
  requiredHeaders: Readonly<Record<string, string>>;
  uploadUrl: string;
}>;
