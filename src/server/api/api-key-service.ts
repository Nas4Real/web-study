import { z } from "zod";

import {
  actorIdSchema,
  entityIdSchema,
  type RepositoryResult,
} from "../study/study-domain";

const normalizedName = z
  .string()
  .transform((value) => value.trim().replace(/\s+/g, " "))
  .pipe(z.string().min(1).max(120));

const apiKeyCreateSchema = z.object({
  expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
  name: normalizedName,
}).strict();

export type StoredApiKey = Readonly<{
  createdAt: string;
  digest: string;
  expiresAt: string | null;
  id: string;
  lastUsedAt: string | null;
  name: string;
  prefix: string;
  revokedAt: string | null;
  userId: string;
}>;

export type ApiKeySummary = Omit<StoredApiKey, "digest" | "userId">;

export type ApiKeyRepository = Readonly<{
  createOwned(
    userId: string,
    input: Readonly<{
      digest: string;
      expiresAt: string | null;
      name: string;
      prefix: string;
    }>,
  ): Promise<RepositoryResult<StoredApiKey>>;
  findActiveByPrefix(prefix: string): Promise<RepositoryResult<StoredApiKey>>;
  listOwned(userId: string): Promise<RepositoryResult<readonly StoredApiKey[]>>;
  revokeOwned(
    userId: string,
    apiKeyId: string,
    revokedAt: string,
  ): Promise<RepositoryResult<StoredApiKey>>;
  touchLastUsed(apiKeyId: string, usedAt: string): Promise<RepositoryResult<boolean>>;
}>;

export type ApiKeyTokenCodec = Readonly<{
  extractPrefix(token: string): string | null;
  generate(): Readonly<{ digest: string; prefix: string; token: string }>;
  verify(token: string, expectedDigest: string): boolean;
}>;

type ApiKeyErrorCode =
  | "INVALID_ACTOR"
  | "INVALID_INPUT"
  | "INVALID_API_KEY"
  | "NOT_FOUND"
  | "STORAGE_UNAVAILABLE";

type ApiKeyResult<T> =
  | Readonly<{ data: T; status: "success" }>
  | Readonly<{ code: ApiKeyErrorCode; status: "error" }>;

function summary(key: StoredApiKey): ApiKeySummary {
  return {
    createdAt: key.createdAt,
    expiresAt: key.expiresAt,
    id: key.id,
    lastUsedAt: key.lastUsedAt,
    name: key.name,
    prefix: key.prefix,
    revokedAt: key.revokedAt,
  };
}

const INVALID_ACTOR = { code: "INVALID_ACTOR", status: "error" } as const;
const INVALID_INPUT = { code: "INVALID_INPUT", status: "error" } as const;
const INVALID_API_KEY = { code: "INVALID_API_KEY", status: "error" } as const;
const NOT_FOUND = { code: "NOT_FOUND", status: "error" } as const;
const STORAGE_UNAVAILABLE = { code: "STORAGE_UNAVAILABLE", status: "error" } as const;

export class ApiKeyService {
  constructor(
    private readonly repository: ApiKeyRepository,
    private readonly tokenCodec: ApiKeyTokenCodec,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async create(
    actorId: unknown,
    input: unknown,
  ): Promise<ApiKeyResult<Readonly<{ apiKey: ApiKeySummary; token: string }>>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    const parsed = apiKeyCreateSchema.safeParse(input);
    if (!parsed.success) return INVALID_INPUT;

    const expiresAt = parsed.data.expiresAt ?? null;
    if (expiresAt !== null && new Date(expiresAt).getTime() <= this.now().getTime()) {
      return INVALID_INPUT;
    }

    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const generated = this.tokenCodec.generate();
        const result = await this.repository.createOwned(actor.data, {
          digest: generated.digest,
          expiresAt,
          name: parsed.data.name,
          prefix: generated.prefix,
        });
        if (!result.errorCode && result.data) {
          return {
            data: { apiKey: summary(result.data), token: generated.token },
            status: "success",
          };
        }
        if (result.errorCode !== "23505" && result.errorCode !== "unique_violation") {
          return STORAGE_UNAVAILABLE;
        }
      }
      return STORAGE_UNAVAILABLE;
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }

  async list(actorId: unknown): Promise<ApiKeyResult<readonly ApiKeySummary[]>> {
    const actor = actorIdSchema.safeParse(actorId);
    if (!actor.success) return INVALID_ACTOR;
    try {
      const result = await this.repository.listOwned(actor.data);
      if (result.errorCode || !result.data) return STORAGE_UNAVAILABLE;
      return { data: result.data.map(summary), status: "success" };
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }

  async revoke(actorId: unknown, apiKeyId: unknown): Promise<ApiKeyResult<ApiKeySummary>> {
    const actor = actorIdSchema.safeParse(actorId);
    const id = entityIdSchema.safeParse(apiKeyId);
    if (!actor.success) return INVALID_ACTOR;
    if (!id.success) return INVALID_INPUT;
    try {
      const result = await this.repository.revokeOwned(
        actor.data,
        id.data,
        this.now().toISOString(),
      );
      if (result.errorCode) return STORAGE_UNAVAILABLE;
      if (!result.data) return NOT_FOUND;
      return { data: summary(result.data), status: "success" };
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }

  async verify(
    token: unknown,
  ): Promise<ApiKeyResult<Readonly<{ apiKeyId: string; userId: string }>>> {
    if (typeof token !== "string") return INVALID_API_KEY;
    const prefix = this.tokenCodec.extractPrefix(token);
    if (!prefix) return INVALID_API_KEY;

    try {
      const result = await this.repository.findActiveByPrefix(prefix);
      if (result.errorCode) return STORAGE_UNAVAILABLE;
      const key = result.data;
      const now = this.now();
      if (
        !key
        || key.prefix !== prefix
        || key.revokedAt !== null
        || (key.expiresAt !== null && new Date(key.expiresAt).getTime() <= now.getTime())
        || !this.tokenCodec.verify(token, key.digest)
      ) {
        return INVALID_API_KEY;
      }

      const touched = await this.repository.touchLastUsed(key.id, now.toISOString());
      if (touched.errorCode) return STORAGE_UNAVAILABLE;
      if (!touched.data) return INVALID_API_KEY;
      return {
        data: { apiKeyId: key.id, userId: key.userId },
        status: "success",
      };
    } catch {
      return STORAGE_UNAVAILABLE;
    }
  }
}
