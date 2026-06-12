"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";
import { Locale } from "../../../lib/i18n";

/**
 * APK ENTRY POINT — auth-redirect
 *
 * This page is the first page the Capacitor WebView loads.
 * It checks the Supabase session on the CLIENT side (bypassing the middleware)
 * and redirects to the correct page.
 *
 * Why needed: Android WebView doesn't share cookies with the server on first load,
 * so the middleware can't read the Supabase session and redirects to /login forever.
 */
export default function AuthRedirectPage() {
  const params = useParams();
  const lang = (params.lang as Locale) || "es";
  const [status, setStatus] = useState<"checking" | "redirecting">("checking");

  useEffect(() => {
    const run = async () => {
      try {
        // 1. Wait for Supabase to restore session from localStorage (IndexedDB in WebView)
        await new Promise((r) => setTimeout(r, 500));

        // 2. Try to get session — also attempt refresh if expired
        let session = null;
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          session = sessionData?.session;

          // If session exists but token might be expired, try refresh
          if (session) {
            const expiresAt = session.expires_at || 0;
            const now = Math.floor(Date.now() / 1000);
            if (expiresAt - now < 60) {
              // Token expires in less than 60 seconds — refresh it
              const { data: refreshData } = await supabase.auth.refreshSession();
              if (refreshData?.session) {
                session = refreshData.session;
              }
            }
          }
        } catch (sessionErr) {
          console.warn("[auth-redirect] session error:", sessionErr);
        }

        if (!session) {
          // No session — go to dashboard in guest mode (NOT login)
          window.location.replace(`/${lang}/dashboard`);
          return;
        }

        setStatus("redirecting");

        // 3. Sync cookie so middleware works on subsequent server navigations
        try {
          document.cookie = `veloura-auth-session=${session.access_token}; path=/; max-age=${session.expires_in ?? 3600}; SameSite=Lax`;
        } catch (_) {}

        // 4. Check profile completion via API
        let profileCompleted = false;
        let profileExists = false;

        try {
          const res = await fetch("/api/profile", {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: "no-store",
          });

          if (res.ok) {
            const data = await res.json();
            // profile=null means user exists in Auth but has no DB profile yet
            if (data?.profile !== null && data?.profile !== undefined) {
              profileExists = true;
              profileCompleted = data?.profile?.profileCompleted === true;
            } else {
              // No profile in DB → go to onboarding
              profileExists = false;
              profileCompleted = false;
            }
          }
          // If API call fails → assume dashboard (safe default)
        } catch (_) {
          // Network failure → go to dashboard, don't block user
          profileCompleted = true;
        }

        // 5. Decide target
        let target: string;
        if (!profileExists || !profileCompleted) {
          target = `/${lang}/onboarding`;
        } else {
          target = `/${lang}/dashboard`;
        }

        window.location.replace(target);
      } catch (err) {
        console.error("[auth-redirect] error:", err);
        // On any unexpected error, go to login
        window.location.replace(`/${lang}/login`);
      }
    };

    run();
  }, [lang]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A1128",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
      }}
    >
      {/* Logo */}
      <svg viewBox="0 0 512 512" style={{ width: 64, height: 64, color: "#D4A373" }} fill="currentColor">
        <path
          d="M256,120 C230,80 180,80 150,110 C120,140 120,190 150,220 L256,330 L362,220 C392,190 392,140 362,110 C332,80 282,80 256,120 Z"
          fill="none"
          stroke="#D4A373"
          strokeWidth="32"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M256,170 C240,140 200,140 180,160 C160,180 160,210 180,230 L256,305 L332,230 C352,210 352,180 332,160 C312,140 272,140 256,170 Z"
          fill="none"
          stroke="#FF6B8B"
          strokeWidth="20"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <span
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: "0.2em",
          color: "#D4A373",
          fontFamily: "serif",
        }}
      >
        VELOURA
      </span>

      {/* Spinner */}
      <div
        style={{
          width: 36,
          height: 36,
          border: "3px solid rgba(212,163,115,0.2)",
          borderTop: "3px solid #D4A373",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <p
        style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: 13,
          margin: 0,
        }}
      >
        {status === "checking" ? "Verificando sesión..." : "Redirigiendo..."}
      </p>
    </div>
  );
}
