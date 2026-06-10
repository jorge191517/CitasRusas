import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (process.env.NODE_ENV === "development") {
  if (!supabaseUrl) {
    console.error("❌ VELOURA ERROR: NEXT_PUBLIC_SUPABASE_URL is missing in environment variables!");
  }
  if (!supabaseAnonKey) {
    console.error("❌ VELOURA ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in environment variables!");
  }
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
