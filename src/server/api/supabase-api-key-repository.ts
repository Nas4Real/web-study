import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type {
  ApiKeyRepository,
  StoredApiKey,
} from "./api-key-service";

const API_KEY_COLUMNS =
  "id, user_id, name, key_prefix, secret_digest, last_used_at, expires_at, revoked_at, created_at";

const apiKeyRowSchema = z.object({
  created_at: z.iso.datetime({ offset: true }),
  expires_at: z.iso.datetime({ offset: true }).nullable(),
  id: z.string().uuid(),
  key_prefix: z.string().regex(/^[A-Za-z0-9_-]{12}$/),
  last_used_at: z.iso.datetime({ offset: true }).nullable(),
  name: z.string().min(1).max(120),
  revoked_at: z.iso.datetime({ offset: true }).nullable(),
  secret_digest: z.string().regex(/^[0-9a-f]{64}$/),
  user_id: z.string().uuid(),
});

function errorCode(error: unknown) {
  if (!error || typeof error !== "object") return error ? "provider_error" : null;
  const code = Reflect.get(error, "code");
  return typeof code === "string" && code.length > 0 ? code : "provider_error";
}

function toStoredApiKey(row: unknown): StoredApiKey | null {
  const parsed = apiKeyRowSchema.safeParse(row);
  if (!parsed.success) return null;
  return {
    createdAt: parsed.data.created_at,
    digest: parsed.data.secret_digest,
    expiresAt: parsed.data.expires_at,
    id: parsed.data.id,
    lastUsedAt: parsed.data.last_used_at,
    name: parsed.data.name,
    prefix: parsed.data.key_prefix,
    revokedAt: parsed.data.revoked_at,
    userId: parsed.data.user_id,
  };
}

function singleResult(data: unknown, error: unknown) {
  const code = errorCode(error);
  if (code) return { data: null, errorCode: code };
  if (data === null) return { data: null, errorCode: null };
  const key = toStoredApiKey(data);
  return key
    ? { data: key, errorCode: null }
    : { data: null, errorCode: "provider_error" };
}

export function createSupabaseApiKeyRepository(
  supabase: SupabaseClient,
): ApiKeyRepository {
  return {
    async createOwned(userId, input) {
      const { data, error } = await supabase
        .from("api_keys")
        .insert({
          expires_at: input.expiresAt,
          key_prefix: input.prefix,
          name: input.name,
          secret_digest: input.digest,
          user_id: userId,
        })
        .select(API_KEY_COLUMNS)
        .maybeSingle();
      return singleResult(data, error);
    },

    async findActiveByPrefix(prefix) {
      const { data, error } = await supabase
        .from("api_keys")
        .select(API_KEY_COLUMNS)
        .eq("key_prefix", prefix)
        .is("revoked_at", null)
        .maybeSingle();
      return singleResult(data, error);
    },

    async listOwned(userId) {
      const { data, error } = await supabase
        .from("api_keys")
        .select(API_KEY_COLUMNS)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      const code = errorCode(error);
      if (code) return { data: null, errorCode: code };
      if (!Array.isArray(data)) return { data: null, errorCode: "provider_error" };
      const keys = data.map(toStoredApiKey);
      return keys.every((key): key is StoredApiKey => key !== null)
        ? { data: keys, errorCode: null }
        : { data: null, errorCode: "provider_error" };
    },

    async revokeOwned(userId, apiKeyId, revokedAt) {
      const { data, error } = await supabase
        .from("api_keys")
        .update({ revoked_at: revokedAt })
        .eq("id", apiKeyId)
        .eq("user_id", userId)
        .is("revoked_at", null)
        .select(API_KEY_COLUMNS)
        .maybeSingle();
      return singleResult(data, error);
    },

    async touchLastUsed(apiKeyId, usedAt) {
      const { data, error } = await supabase
        .from("api_keys")
        .update({ last_used_at: usedAt })
        .eq("id", apiKeyId)
        .is("revoked_at", null)
        .select("id")
        .maybeSingle();
      const code = errorCode(error);
      if (code) return { data: null, errorCode: code };
      if (data === null) return { data: false, errorCode: null };
      return data && typeof data === "object" && Reflect.get(data, "id") === apiKeyId
        ? { data: true, errorCode: null }
        : { data: null, errorCode: "provider_error" };
    },
  };
}
