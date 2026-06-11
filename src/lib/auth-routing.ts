/**
 * auth-routing.ts
 * ─────────────────────────────────────────────────────────
 * Central helper for post-login redirection.
 * All pages must use this — no inline logic per page.
 *
 * Source of truth: Supabase Auth session + /api/profile
 * localStorage is only used as a cache — never as auth source.
 */

import { supabase } from "./supabase/client";

export type PostLoginTarget = "dashboard" | "onboarding" | "login";

export interface AuthRouteResult {
  target: PostLoginTarget;
  path: string;
  profileCompleted: boolean;
  userId: string | null;
}

/**
 * Determines where to redirect the user after login or session restoration.
 * Fetches real data from Supabase Auth + /api/profile.
 *
 * @param lang - The locale string (es, en, ru)
 * @returns AuthRouteResult
 */
export async function getPostLoginRedirect(lang: string): Promise<AuthRouteResult> {
  const noSession: AuthRouteResult = {
    target: "login",
    path: `/${lang}/login`,
    profileCompleted: false,
    userId: null,
  };

  try {
    // 1. Get real Supabase Auth session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return noSession;

    const userId = session.user.id;

    // 2. Fetch profile from API with bearer token
    let profileCompleted = false;
    let profileData: any = null;

    try {
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      if (res.ok) {
        profileData = await res.json();
        profileCompleted = profileData?.profile?.profileCompleted === true;
      }
    } catch (_) {
      // Network error — assume not completed
    }

    // 3. Sync cookie so server middleware can validate future requests
    try {
      document.cookie = `veloura-auth-session=${session.access_token}; path=/; max-age=${session.expires_in}; SameSite=Lax`;
    } catch (_) {}

    // 4. Update localStorage cache (secondary — never used as auth source)
    try {
      const userObj = {
        id: userId,
        email: session.user.email,
        role: profileData?.role || "USER",
        profile: {
          ...(profileData?.profile || {}),
          profileCompleted,
        },
      };
      localStorage.setItem("veloura_user", JSON.stringify(userObj));
    } catch (_) {}

    const target: PostLoginTarget = profileCompleted ? "dashboard" : "onboarding";
    return {
      target,
      path: `/${lang}/${target}`,
      profileCompleted,
      userId,
    };
  } catch (err) {
    console.error("getPostLoginRedirect error:", err);
    return noSession;
  }
}
