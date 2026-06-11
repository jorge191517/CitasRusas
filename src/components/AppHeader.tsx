"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase/client";
import { Locale } from "../lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";

interface AppHeaderProps {
  currentLang: Locale;
  showBackTo?: string;  // URL to go back to
  backLabel?: string;
  title?: string;
}

export default function AppHeader({ currentLang, showBackTo, backLabel, title }: AppHeaderProps) {
  const [isPremium, setIsPremium] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("veloura_user");
    if (stored) {
      const u = JSON.parse(stored);
      setUserName(u.profile?.firstName || "");
      setIsPremium(u.subscription?.tier === "PREMIUM");
    }
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {});
    document.cookie = "veloura-auth-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    localStorage.removeItem("veloura_user");
    window.location.href = `/${currentLang}/login`;
  };

  return (
    <header className="w-full glass border-b border-white/10 px-4 py-3 z-40 sticky top-0">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
        {/* Left: back or logo */}
        <div className="flex items-center gap-3 min-w-0">
          {showBackTo ? (
            <Link
              href={showBackTo}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white transition shrink-0"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
          ) : (
            <Link href={`/${currentLang}/dashboard`} className="flex items-center gap-2 shrink-0">
              <svg viewBox="0 0 512 512" className="w-7 h-7 text-primary" fill="currentColor">
                <path d="M256,120 C230,80 180,80 150,110 C120,140 120,190 150,220 L256,330 L362,220 C392,190 392,140 362,110 C332,80 282,80 256,120 Z" fill="none" stroke="currentColor" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M256,170 C240,140 200,140 180,160 C160,180 160,210 180,230 L256,305 L332,230 C352,210 352,180 332,160 C312,140 272,140 256,170 Z" fill="none" stroke="#FF6B8B" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-base font-bold tracking-widest text-primary font-serif">VELOURA</span>
            </Link>
          )}
          {title && (
            <h1 className="text-sm font-bold text-white truncate">{title}</h1>
          )}
        </div>

        {/* Right: premium badge + lang + user */}
        <div className="flex items-center gap-2 shrink-0">
          {isPremium && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-primary/15 border border-primary/30 rounded-full text-[10px] font-bold text-primary">
              ✨ PREMIUM
            </span>
          )}
          {userName && (
            <span className="hidden sm:inline text-xs text-muted font-medium">{userName}</span>
          )}
          <LanguageSwitcher currentLang={currentLang} />
        </div>
      </div>
    </header>
  );
}
