"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase/client";
import { Locale, getTranslation } from "../../../lib/i18n";

export default function LoginPage() {
  const params = useParams();
  const router = useRouter();
  const currentLang = (params.lang as Locale) || "es";
  const t = getTranslation(currentLang);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // Validate environment variables in development only
      if (process.env.NODE_ENV === "development") {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          console.error("DEBUG DEV ALERT: Supabase Public Env Variables are missing!");
        }
      }

      // Real Supabase Auth Flow
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data?.session) {
        // Set session token in cookies for Middleware path validation checks
        document.cookie = `veloura-auth-session=${data.session.access_token}; path=/; max-age=${data.session.expires_in}; SameSite=Lax; Secure`;
        
        // Save basic user details to local storage
        localStorage.setItem(
          "veloura_user",
          JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            role: "USER" // Roles can be fetched via database query
          })
        );

        setSuccessMsg(t("auth.successLogin"));
        setTimeout(() => {
          router.push(`/${currentLang}/dashboard`);
          router.refresh();
        }, 1000);
      }
    } catch (err: any) {
      console.error("Auth error details:", err);
      setErrorMsg(`${t("auth.errorAuth")}: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-[#D4A373]/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-[#FF6B8B]/10 blur-[150px] rounded-full" />

      <div className="w-full max-w-md glass p-8 rounded-[32px] border border-primary/20 text-center space-y-6 relative z-10">
        <Link href={`/${currentLang}`} className="inline-flex items-center space-x-2 mb-4">
          <svg viewBox="0 0 512 512" className="w-8 h-8 text-primary" fill="currentColor">
            <path d="M256,120 C230,80 180,80 150,110 C120,140 120,190 150,220 L256,330 L362,220 C392,190 392,140 362,110 C332,80 282,80 256,120 Z" fill="none" stroke="currentColor" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M256,170 C240,140 200,140 180,160 C160,180 160,210 180,230 L256,305 L332,230 C352,210 352,180 332,160 C312,140 272,140 256,170 Z" fill="none" stroke="#FF6B8B" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span className="text-xl font-bold tracking-widest text-primary font-serif">VELOURA</span>
        </Link>

        <h2 className="text-2xl font-bold text-white">{t("common.login")}</h2>

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">{t("common.email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm"
              placeholder="name@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">{t("common.password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm"
              placeholder="••••••••"
              required
            />
          </div>

          {errorMsg && <p className="text-red-400 text-xs mt-1 text-center font-medium">{errorMsg}</p>}
          {successMsg && <p className="text-green-400 text-xs mt-1 text-center font-medium">{successMsg}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-premium-gold text-background font-bold rounded-xl hover:opacity-90 transition duration-300 disabled:opacity-50 text-sm shadow-md"
          >
            {loading ? t("common.loading") : t("auth.signIn")}
          </button>
        </form>

        <div className="flex flex-col space-y-2 pt-2">
          <Link href={`/${currentLang}/register`} className="text-xs text-[#FF6B8B] hover:underline">
            {t("auth.noAccount")}
          </Link>
        </div>
      </div>
    </div>
  );
}
