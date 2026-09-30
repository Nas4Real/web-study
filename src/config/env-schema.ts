import { z } from "zod";

const publicEnvShape = {
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_ORIGIN: z.string().url(),
};

const secretEnvShape = {
  SUPABASE_SECRET_KEY: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  API_KEY_HASH_PEPPER: z.string().min(1),
  CRON_SECRET: z.string().min(1),
};

const productionEnvSchema = z.object({
  NODE_ENV: z.literal("production"),
  ...publicEnvShape,
  ...secretEnvShape,
});

const nonProductionEnvSchema = productionEnvSchema
  .omit({ NODE_ENV: true })
  .partial()
  .extend({
    NODE_ENV: z.enum(["development", "test"]).default("development"),
  });

export function parseServerEnv(source: Record<string, string | undefined>) {
  return source.NODE_ENV === "production"
    ? productionEnvSchema.parse(source)
    : nonProductionEnvSchema.parse(source);
}
