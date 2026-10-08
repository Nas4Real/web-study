import { z } from "zod";

const publicEnvShape = {
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_ORIGIN: z.string().url(),
};

const optionalSecretEnvShape = {
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  R2_ACCOUNT_ID: z.string().regex(/^[0-9a-f]{32}$/i).transform(value => value.toLowerCase()).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET: z.string().min(3).max(63).regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/).optional(),
  API_KEY_HASH_PEPPER: z.string().min(32).optional(),
  CRON_SECRET: z.string().min(1).optional(),
};

const r2Keys = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
] as const;

function requireCompleteR2Group(
  value: Partial<Record<(typeof r2Keys)[number], string | undefined>>,
  context: z.RefinementCtx,
) {
  const configured = r2Keys.filter((key) => value[key] !== undefined);
  if (configured.length === 0 || configured.length === r2Keys.length) return;
  context.addIssue({
    code: "custom",
    message: "R2 credentials must be configured together",
    path: ["R2_ACCOUNT_ID"],
  });
}

function requireApiInfrastructurePair(
  value: Readonly<{
    API_KEY_HASH_PEPPER?: string;
    SUPABASE_SECRET_KEY?: string;
  }>,
  context: z.RefinementCtx,
) {
  if (value.API_KEY_HASH_PEPPER && !value.SUPABASE_SECRET_KEY) {
    context.addIssue({
      code: "custom",
      message: "API key infrastructure requires a Supabase secret key",
      path: ["SUPABASE_SECRET_KEY"],
    });
  }
}

function validateOptionalInfrastructure(
  value: Parameters<typeof requireCompleteR2Group>[0] &
    Parameters<typeof requireApiInfrastructurePair>[0],
  context: z.RefinementCtx,
) {
  requireCompleteR2Group(value, context);
  requireApiInfrastructurePair(value, context);
}

const productionEnvSchema = z.object({
  NODE_ENV: z.literal("production"),
  ...publicEnvShape,
  ...optionalSecretEnvShape,
}).superRefine(validateOptionalInfrastructure);

const nonProductionEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test"]).default("development"),
  NEXT_PUBLIC_SUPABASE_URL: publicEnvShape.NEXT_PUBLIC_SUPABASE_URL.optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    publicEnvShape.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.optional(),
  NEXT_PUBLIC_APP_ORIGIN: publicEnvShape.NEXT_PUBLIC_APP_ORIGIN.optional(),
  ...optionalSecretEnvShape,
}).superRefine(validateOptionalInfrastructure);

export function parseServerEnv(source: Record<string, string | undefined>) {
  return source.NODE_ENV === "production"
    ? productionEnvSchema.parse(source)
    : nonProductionEnvSchema.parse(source);
}
