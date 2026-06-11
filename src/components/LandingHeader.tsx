"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase/client";
import { Locale, getTranslation } from "../lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";

interface LandingHeaderProps {
  currentLang: Locale;
}

export default function LandingHeader({ currentLang }: LandingHeaderProps) {
  const t = getTranslation(currentLang);
  const [authed, setAuthed] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    // Check local session first (fast)
    const stored = localStorage.getItem("veloura_user");
    if (stored) {
      setAuthed(true);
      return;
    }
    // Fallback: check Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {});
    document.cookie = "veloura-auth-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    localStorage.removeItem("veloura_user");
    window.location.href = `/${currentLang}/login`;
  };

  return (
    <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-row items-center justify-between z-10 relative gap-2">
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
          <svg viewBox="0 0 512 512" className="w-full h-full text-primary" fill="currentColor">
            <path d="M256,120 C230,80 180,80 150,110 C120,140 120,190 150,220 L256,330 L362,220 C392,190 392,140 362,110 C332,80 282,80 256,120 Z" fill="none" stroke="currentColor" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M256,170 C240,140 200,140 180,160 C160,180 160,210 180,230 L256,305 L332,230 C352,210 352,180 332,160 C312,140 272,140 256,170 Z" fill="none" stroke="#FF6B8B" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-lg sm:text-2xl font-bold tracking-widest text-primary font-serif">VELOURA</span>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
        <LanguageSwitcher currentLang={currentLang} />

        {/* Show skeleton while checking auth state */}
        {authed === null && (
          <div className="w-28 h-8 bg-white/5 rounded-full animate-pulse" />
        )}

        {/* Authenticated: show nav links + logout */}
        {authed === true && (
          <div className="flex items-center gap-2">
            <Link
              href={`/${currentLang}/dashboard`}
              className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-full bg-primary/10 border border-primary/40 text-primary hover:bg-primary hover:text-background transition-all duration-300 shadow-md shrink-0"
            >
              {currentLang === "es" ? "Inicio" : (currentLang === "ru" ? "Главная" : "Home")}
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs font-semibold rounded-full bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/35 transition-all duration-300 shrink-0"
            >
              {t("common.logout")}
            </button>
          </div>
        )}

        {/* Not authenticated: show login button */}
        {authed === false && (
          <Link
            href={`/${currentLang}/login`}
            className="px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-full border border-primary/40 text-primary hover:bg-primary hover:text-background transition-all duration-300 shadow-md shrink-0"
          >
            {t("common.login")}
          </Link>
        )}
      </div>
    </header>
  );
}
