import { createClient } from "@supabase/supabase-js";

/**
 * Minimal Supabase client stub for Phase 1.
 * Real credentials and auth/storage setup will be integrated in the backend phase.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
