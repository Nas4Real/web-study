import "server-only";

import { createClient } from "@supabase/supabase-js";

import { parseSupabaseAdminConfig } from "./config";

export function createSupabaseAdminClient() {
  const { secretKey, url } = parseSupabaseAdminConfig(process.env);
  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
