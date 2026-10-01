export type SupabasePublicConfig = Readonly<{
  url: string;
  publishableKey: string;
}>;

type PublicEnvironment = Record<string, string | undefined>;

export function parseSupabasePublicConfig(
  source: PublicEnvironment,
): SupabasePublicConfig | null {
  const url = source.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url && !publishableKey) return null;
  if (!url || !publishableKey) {
    throw new Error("Supabase public environment is incomplete");
  }

  try {
    new URL(url);
  } catch {
    throw new Error("Supabase public URL is invalid");
  }

  return { url, publishableKey };
}

export function getSupabasePublicConfig() {
  return parseSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function requireSupabasePublicConfig() {
  const config = getSupabasePublicConfig();

  if (!config) {
    throw new Error("Supabase public environment is not configured");
  }

  return config;
}
