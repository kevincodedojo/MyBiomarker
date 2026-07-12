import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. Safe to expose: the anon key is public and
// Row-Level Security enforces per-user data access.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
