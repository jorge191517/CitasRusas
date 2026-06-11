"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase/client";
import { Locale, getTranslation } from "../../../lib/i18n";
import { getPostLoginRedirect } from "../../../lib/auth-routing";

export default function LoginPage() {
  const params = useParams();
  const currentLang = (params.lang as Locale) || "es";
  const t = getTranslation(currentLang);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ── Check active session on mount — NO autofocus, no immediate keyboard ──
  React.useEffect(() => {
    const checkSession = async () => {
      try {
        // Small delay so Supabase can restore session from storage
        await new Promise((r) => setTimeout(r, 200));
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return; // No session — stay on login

        // Has session — redirect silently
        const result = await getPostLoginRedirect(currentLang);
        window.location.replace(result.path);
      } catch (_) {
        // Stay on login if anything fails
      }
    };
    checkSession();
  }, [currentLang]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data?.session) throw new Error("No se pudo iniciar sesión. Inténtalo de nuevo.");

      // Use central helper to determine redirect
      const result = await getPostLoginRedirect(currentLang);
      window.location.replace(result.path);
    } catch (err: any) {
      console.error("Auth error:", err);
      const msg = err.message || "";
      if (msg.includes("Invalid login credentials")) {
        setErrorMsg("Email o contraseña incorrectos.");
      } else if (msg.includes("Email not confirmed")) {
        setErrorMsg("Confirma tu email antes de iniciar sesión.");
      } else {
        setErrorMsg(msg || "Error al iniciar sesión.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Back */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href={`/${currentLang}`}
          className="px-4 py-2 text-xs font-bold bg-[#151F3C]/80 border border-primary/20 hover:border-primary/40 text-primary rounded-full transition shadow-md"
        >
          ← {t("common.back")}
        </Link>
      </div>

      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-[#D4A373]/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-[#FF6B8B]/10 blur-[150px] rounded-full" />

      <div className="w-full max-w-md glass p-8 rounded-[32px] border border-primary/20 text-center space-y-6 relative z-10">
        <Link href={`/${currentLang}`} className="inline-flex items-center space-x-2 mb-4">
          <svg viewBox="0 0 512 512" className="w-8 h-8 text-primary" fill="currentColor">
            <path d="M256,120 C230,80 180,80 150,110 C120,140 120,190 150,220 L256,330 L362,220 C392,190 392,140 362,110 C332,80 282,80 256,120 Z" fill="none" stroke="currentColor" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M256,170 C240,140 200,140 180,160 C160,180 160,210 180,230 L256,305 L332,230 C352,210 352,180 332,160 C312,140 272,140 256,170 Z" fill="none" stroke="#FF6B8B" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-xl font-bold tracking-widest text-primary font-serif">VELOURA</span>
        </Link>

        <h2 className="text-2xl font-bold text-white">{t("common.login")}</h2>

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">{t("common.email")}</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm"
              placeholder="name@example.com"
              required
              autoComplete="email"
              // NO autoFocus — prevents keyboard opening on Android WebView on load
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">{t("common.password")}</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {errorMsg && (
            <p className="text-red-400 text-xs mt-1 text-center font-medium bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              ⚠️ {errorMsg}
            </p>
          )}

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3 font-bold rounded-xl hover:opacity-90 transition disabled:opacity-50 text-sm shadow-md text-background"
            style={{ background: loading ? "#888" : "linear-gradient(135deg, #D4A373, #FF6B8B)" }}
          >
            {loading ? "⏳ Verificando..." : t("auth.signIn")}
          </button>
        </form>

        <div className="flex flex-col space-y-2 pt-2 border-t border-white/5">
          <Link href={`/${currentLang}/register`} className="text-xs text-[#FF6B8B] hover:underline">
            {t("auth.noAccount")}
          </Link>
        </div>
      </div>
    </div>
  );
}
