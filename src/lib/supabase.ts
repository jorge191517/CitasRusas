import { supabase as browserClient } from "./supabase/client";

// Re-export client-safe Supabase instance to maintain compatibility
export const supabase = browserClient;
export const getSupabaseServer = () => {
  // Return browserClient as fallback for old client files (routes should use the new supabase/server client)
  return browserClient;
};
