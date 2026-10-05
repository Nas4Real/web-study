import { z } from "zod";

export const actorIdSchema = z.string().uuid();
export const entityIdSchema = z.string().uuid();

const normalizedName = (maximum: number) =>
  z
    .string()
    .transform((value) => value.trim().replace(/\s+/g, " "))
    .pipe(z.string().min(1).max(maximum));

const timezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  });

const avatarObjectKeySchema = z.string().max(256).nullable();

export const profileUpdateInputSchema = z.object({
  avatarObjectKey: avatarObjectKeySchema,
  displayName: normalizedName(120),
  timezone: timezoneSchema,
});

const subjectFields = {
  color: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.string().regex(/^#[0-9a-f]{6}$/)),
  icon: z
    .string()
    .trim()
    .pipe(z.string().min(1).max(64).regex(/^[A-Za-z0-9-]+$/))
    .nullable()
    .optional(),
  name: normalizedName(120),
  position: z.number().int().min(0).max(1_000_000),
};

export const subjectCreateInputSchema = z.object(subjectFields);
export const subjectUpdateInputSchema = z
  .object(subjectFields)
  .partial()
  .refine((input) => Object.keys(input).length > 0);

export type Profile = Readonly<{
  avatarObjectKey: string | null;
  createdAt: string;
  displayName: string;
  id: string;
  storageQuotaBytes: number;
  storageReservedBytes: number;
  storageUsedBytes: number;
  timezone: string;
  updatedAt: string;
}>;

export type ProfileUpdate = z.infer<typeof profileUpdateInputSchema>;

export type Subject = Readonly<{
  color: string;
  createdAt: string;
  icon: string | null;
  id: string;
  name: string;
  position: number;
  updatedAt: string;
}>;

export type SubjectCreate = z.infer<typeof subjectCreateInputSchema>;
export type SubjectUpdate = z.infer<typeof subjectUpdateInputSchema>;

export type RepositoryResult<T> = Readonly<{
  data: T | null;
  errorCode: string | null;
}>;

export type StudyResult<T, ExtraCode extends string = never> =
  | Readonly<{ data: T; status: "success" }>
  | Readonly<{
      code:
        | "INVALID_ACTOR"
        | "INVALID_INPUT"
        | "NOT_FOUND"
        | "DUPLICATE_NAME"
        | "STORAGE_UNAVAILABLE"
        | ExtraCode;
      status: "error";
    }>;

export function ownedAvatarKey(userId: string, value: string | null) {
  if (value === null) return true;
  const opaqueId = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
  return new RegExp(`^users/${userId}/avatars/${opaqueId}$`).test(value);
}

export const INVALID_ACTOR = {
  code: "INVALID_ACTOR",
  status: "error",
} as const;
export const INVALID_INPUT = {
  code: "INVALID_INPUT",
  status: "error",
} as const;
export const NOT_FOUND = { code: "NOT_FOUND", status: "error" } as const;
export const STORAGE_UNAVAILABLE = {
  code: "STORAGE_UNAVAILABLE",
  status: "error",
} as const;
