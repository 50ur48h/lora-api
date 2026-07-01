import { createClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client for admin auth. Reads public env (safe to expose).
 * Falls back to placeholders so `next build` never fails when env is absent
 * (e.g. CI); real values are inlined at build time from `.env.local` or the
 * hosting provider.
 */
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-key";

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
