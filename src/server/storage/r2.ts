import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";

const MAX_PRESIGN_SECONDS = 600;

const canonicalUuidSchema = z.string().uuid().transform(value => value.toLowerCase());
const r2ObjectKeySchema = z.string().regex(
  /^users\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/(?:files|avatars)\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
);
const contentTypeSchema = z.string().trim().toLowerCase().regex(
  /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/,
);
const expiresInSchema = z.number().int().min(1).max(MAX_PRESIGN_SECONDS).default(MAX_PRESIGN_SECONDS);

const r2ConfigSchema = z.object({
  accessKeyId: z.string().min(1).max(1024),
  accountId: z.string().regex(/^[0-9a-f]{32}$/i).transform(value => value.toLowerCase()),
  bucket: z.string().min(3).max(63).regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/),
  secretAccessKey: z.string().min(1).max(1024),
}).strict();

const presignUploadSchema = z.object({
  contentType: contentTypeSchema,
  expiresInSeconds: expiresInSchema.optional(),
  key: r2ObjectKeySchema,
}).strict();
const presignDownloadSchema = z.object({
  expiresInSeconds: expiresInSchema.optional(),
  key: r2ObjectKeySchema,
}).strict();
const headResultSchema = z.object({
  ContentLength: z.number().int().nonnegative().nullable().optional(),
  ContentType: z.string().min(1).nullable().optional(),
  ETag: z.string().min(1).nullable().optional(),
}).passthrough();
const signedUrlSchema = z.string().url();

export type R2StorageErrorCode = "INVALID_INPUT" | "OBJECT_NOT_FOUND" | "PROVIDER_UNAVAILABLE";

export class R2StorageError extends Error {
  constructor(
    readonly code: R2StorageErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "R2StorageError";
  }
}

export type R2Config = Readonly<{
  accessKeyId: string;
  accountId: string;
  bucket: string;
  secretAccessKey: string;
}>;

export type R2ObjectMetadata = Readonly<{
  contentLength: number | null;
  contentType: string | null;
  etag: string | null;
}>;

type R2Dependencies = Readonly<{
  client?: S3Client;
  sign?: typeof getSignedUrl;
}>;

function invalidInput(): R2StorageError {
  return new R2StorageError("INVALID_INPUT", "Invalid object storage input.");
}

function unavailable(): R2StorageError {
  return new R2StorageError(
    "PROVIDER_UNAVAILABLE",
    "Object storage is temporarily unavailable.",
  );
}

function notFound(): R2StorageError {
  return new R2StorageError("OBJECT_NOT_FOUND", "Object was not found.");
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const metadata = Reflect.get(error, "$metadata");
  const status = metadata && typeof metadata === "object" ? Reflect.get(metadata, "httpStatusCode") : null;
  const name = Reflect.get(error, "name");
  return status === 404 || name === "NotFound" || name === "NoSuchKey";
}

function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw invalidInput();
  return parsed.data;
}

export function createFileObjectKey(userId: unknown, fileId: unknown): string {
  const user = canonicalUuidSchema.safeParse(userId);
  const file = canonicalUuidSchema.safeParse(fileId);
  if (!user.success || !file.success) throw invalidInput();
  return `users/${user.data}/files/${file.data}`;
}

export function createR2ObjectStoreFromEnv(
  source: Record<string, string | undefined> = process.env,
  dependencies: R2Dependencies = {},
) {
  return createR2ObjectStore({
    accessKeyId: source.R2_ACCESS_KEY_ID ?? "",
    accountId: source.R2_ACCOUNT_ID ?? "",
    bucket: source.R2_BUCKET ?? "",
    secretAccessKey: source.R2_SECRET_ACCESS_KEY ?? "",
  }, dependencies);
}

export function createR2ObjectStore(configInput: R2Config, dependencies: R2Dependencies = {}) {
  const config = parseInput(r2ConfigSchema, configInput);

  // Cloudflare's S3-compatible endpoint uses the account ID and the SDK's `auto` region.
  // Source: https://developers.cloudflare.com/r2/api/s3/presigned-urls/#sdk-examples
  const client = dependencies.client ?? new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    region: "auto",
  });
  const sign = dependencies.sign ?? getSignedUrl;

  return {
    async deleteObject(keyInput: unknown): Promise<void> {
      const key = parseInput(r2ObjectKeySchema, keyInput);
      try {
        await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
      } catch {
        throw unavailable();
      }
    },

    async headObject(keyInput: unknown): Promise<R2ObjectMetadata> {
      const key = parseInput(r2ObjectKeySchema, keyInput);
      try {
        const response = await client.send(new HeadObjectCommand({
          Bucket: config.bucket,
          Key: key,
        }));
        const parsed = headResultSchema.safeParse(response);
        if (!parsed.success) throw unavailable();
        return {
          contentLength: parsed.data.ContentLength ?? null,
          contentType: parsed.data.ContentType ?? null,
          etag: parsed.data.ETag ?? null,
        };
      } catch (error) {
        if (error instanceof R2StorageError) throw error;
        if (isNotFound(error)) throw notFound();
        throw unavailable();
      }
    },

    async presignDownload(input: unknown): Promise<string> {
      const parsed = parseInput(presignDownloadSchema, input);
      try {
        const result = await sign(
          client,
          new GetObjectCommand({ Bucket: config.bucket, Key: parsed.key }),
          { expiresIn: parsed.expiresInSeconds ?? MAX_PRESIGN_SECONDS },
        );
        const url = signedUrlSchema.safeParse(result);
        if (!url.success) throw unavailable();
        return url.data;
      } catch (error) {
        if (error instanceof R2StorageError) throw error;
        throw unavailable();
      }
    },

    async presignUpload(input: unknown): Promise<string> {
      const parsed = parseInput(presignUploadSchema, input);
      try {
        const result = await sign(
          client,
          new PutObjectCommand({
            Bucket: config.bucket,
            ContentType: parsed.contentType,
            Key: parsed.key,
          }),
          { expiresIn: parsed.expiresInSeconds ?? MAX_PRESIGN_SECONDS },
        );
        const url = signedUrlSchema.safeParse(result);
        if (!url.success) throw unavailable();
        return url.data;
      } catch (error) {
        if (error instanceof R2StorageError) throw error;
        throw unavailable();
      }
    },
  } as const;
}
