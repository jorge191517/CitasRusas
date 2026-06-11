"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";

// ─── ONLY VISIBLE IN DEVELOPMENT ────────────────────────────────────────────
// This page shows session/profile state for debugging.
// In production it returns a blank page.

export default function DebugAuthPage() {
  const params = useParams();
  const lang = params.lang || "es";
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Block in production
  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    if (!isDev) return;

    const run = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        let profileData: any = null;
        if (session) {
          try {
            const res = await fetch("/api/profile", {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (res.ok) profileData = await res.json();
          } catch (_) {}
        }

        const profileCompleted = profileData?.profile?.profileCompleted === true;
        const redirectTarget = session
          ? (profileCompleted ? `/${lang}/dashboard` : `/${lang}/onboarding`)
          : `/${lang}/login`;

        setInfo({
          sessionExists: !!session,
          userId: session?.user?.id || null,
          email: session?.user?.email || null,
          accessToken: session?.access_token ? session.access_token.slice(0, 30) + "..." : null,
          profileExists: !!profileData?.profile,
          profileCompleted,
          redirectTarget,
          rawProfile: profileData?.profile,
        });
      } catch (err: any) {
        setInfo({ error: err.message });
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [isDev, lang]);

  if (!isDev) {
    return (
      <div style={{ background: "#0A1128", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>Not available in production.</p>
      </div>
    );
  }

  return (
    <div style={{ background: "#0A1128", minHeight: "100vh", padding: "24px", fontFamily: "monospace", color: "white" }}>
      <h1 style={{ color: "#D4A373", fontSize: 20, marginBottom: 24, fontWeight: 800 }}>
        🔍 VELOURA — Debug Auth
      </h1>

      {loading ? (
        <p style={{ color: "#aaa" }}>Cargando...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Object.entries(info || {}).map(([key, value]) => (
            <div
              key={key}
              style={{
                background: "#151F3C",
                border: "1px solid rgba(212,163,115,0.2)",
                borderRadius: 12,
                padding: "12px 16px",
              }}
            >
              <p style={{ color: "#D4A373", fontSize: 11, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>{key}</p>
              <p style={{
                color: value === true ? "#4ade80" : value === false ? "#f87171" : value === null ? "#6b7280" : "#fff",
                fontSize: 13,
                wordBreak: "break-all",
              }}>
                {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value ?? "null")}
              </p>
            </div>
          ))}

          <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
            <button
              onClick={() => window.location.replace(`/${lang}/auth-redirect`)}
              style={{ padding: "10px 20px", background: "#D4A373", color: "#0A1128", fontWeight: 700, borderRadius: 12, border: "none", cursor: "pointer" }}
            >
              → Test auth-redirect
            </button>
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.replace(`/${lang}/login`); }}
              style={{ padding: "10px 20px", background: "#FF6B8B20", color: "#FF6B8B", fontWeight: 700, borderRadius: 12, border: "1px solid #FF6B8B40", cursor: "pointer" }}
            >
              ← Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
