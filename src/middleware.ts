import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { locales, defaultLocale } from "./lib/i18n";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Exclude static assets, API, icons
  if (
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname.startsWith("/manifest.json") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/sw.js")
  ) {
    return response;
  }

  // 1. i18n Locale Redirect
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (!pathnameHasLocale) {
    const locale = defaultLocale;
    request.nextUrl.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(request.nextUrl);
  }

  const currentLocale = locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  ) || defaultLocale;

  // 2. Supabase Auth check
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mockproject.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-anon-key";

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const isAuthenticated = !!user;

  // Route categories
  const isLandingPage = pathname === `/${currentLocale}`;
  const isAuthRoute = pathname.includes("/login") || pathname.includes("/register");
  const isProtectedRoute =
    pathname.includes("/dashboard") ||
    pathname.includes("/profile") ||
    pathname.includes("/chat") ||
    pathname.includes("/admin") ||
    pathname.includes("/likes") ||
    pathname.includes("/onboarding");

  // Protected routes → redirect to login if not authenticated
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL(`/${currentLocale}/login`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Auth routes (login/register) → redirect to dashboard if already authenticated
  if (isAuthRoute && isAuthenticated) {
    const dashboardUrl = new URL(`/${currentLocale}/dashboard`, request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Landing page: if authenticated, redirect to dashboard
  // NOTE: We only do this if the Supabase session exists server-side.
  // If user confirmed email and has session cookie, this will trigger.
  if (isLandingPage && isAuthenticated) {
    const dashboardUrl = new URL(`/${currentLocale}/dashboard`, request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next).*)"],
};
