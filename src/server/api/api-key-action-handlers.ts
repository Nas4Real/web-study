import type {
  ApiKeyService,
  ApiKeySummary,
} from "./api-key-service";

export type ApiKeyManagementContext = Readonly<{
  actorId: string;
  apiKeyService: Pick<ApiKeyService, "create" | "list" | "revoke">;
}>;

type ResolveContext = () => Promise<ApiKeyManagementContext | null>;

type ManagementError = Readonly<{
  code: "INVALID_INPUT" | "NOT_FOUND" | "STORAGE_UNAVAILABLE" | "UNAUTHENTICATED";
  status: "error";
}>;

export type CreateApiKeyManagementState =
  | Readonly<{
      apiKey: ApiKeySummary;
      code: "API_KEY_CREATED";
      status: "success";
      token: string;
    }>
  | ManagementError;

function mapError(code: string): ManagementError {
  if (code === "INVALID_INPUT") return { code: "INVALID_INPUT", status: "error" };
  if (code === "NOT_FOUND") return { code: "NOT_FOUND", status: "error" };
  return { code: "STORAGE_UNAVAILABLE", status: "error" };
}

async function contextOrError(resolveContext: ResolveContext) {
  try {
    const context = await resolveContext();
    return context ?? ({ code: "UNAUTHENTICATED", status: "error" } as const);
  } catch {
    return { code: "STORAGE_UNAVAILABLE", status: "error" } as const;
  }
}

export async function createApiKeyManagementHandler(
  resolveContext: ResolveContext,
  formData: FormData,
): Promise<CreateApiKeyManagementState> {
  const context = await contextOrError(resolveContext);
  if ("code" in context) return context;
  const name = formData.get("name");
  const expiresAt = formData.get("expiresAt");
  if (typeof name !== "string" || typeof expiresAt !== "string") {
    return { code: "INVALID_INPUT", status: "error" };
  }
  try {
    const result = await context.apiKeyService.create(context.actorId, {
      expiresAt: expiresAt.trim().length === 0 ? null : expiresAt,
      name,
    });
    return result.status === "success"
      ? {
          apiKey: result.data.apiKey,
          code: "API_KEY_CREATED",
          status: "success",
          token: result.data.token,
        }
      : mapError(result.code);
  } catch {
    return { code: "STORAGE_UNAVAILABLE", status: "error" };
  }
}

export async function listApiKeysManagementHandler(
  resolveContext: ResolveContext,
) {
  const context = await contextOrError(resolveContext);
  if ("code" in context) return context;
  try {
    const result = await context.apiKeyService.list(context.actorId);
    return result.status === "success"
      ? { code: "API_KEYS_LISTED" as const, data: result.data, status: "success" as const }
      : mapError(result.code);
  } catch {
    return { code: "STORAGE_UNAVAILABLE", status: "error" } as const;
  }
}

export async function revokeApiKeyManagementHandler(
  resolveContext: ResolveContext,
  apiKeyId: unknown,
) {
  const context = await contextOrError(resolveContext);
  if ("code" in context) return context;
  try {
    const result = await context.apiKeyService.revoke(context.actorId, apiKeyId);
    return result.status === "success"
      ? { apiKey: result.data, code: "API_KEY_REVOKED" as const, status: "success" as const }
      : mapError(result.code);
  } catch {
    return { code: "STORAGE_UNAVAILABLE", status: "error" } as const;
  }
}
