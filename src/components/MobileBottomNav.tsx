"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase/client";
import { Locale } from "../lib/i18n";

interface MobileBottomNavProps {
  currentLang: Locale;
  active?: "discover" | "likes" | "chat" | "profile";
}

export default function MobileBottomNav({ currentLang, active }: MobileBottomNavProps) {
  const [unreadChats, setUnreadChats] = useState(0);
  const [pendingLikes, setPendingLikes] = useState(0);

  useEffect(() => {
    const matches = JSON.parse(localStorage.getItem("veloura_matches") || "[]");
    setUnreadChats(matches.length);
    const likes = JSON.parse(localStorage.getItem("veloura_likes_received") || "[]");
    setPendingLikes(likes.length);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {});
    document.cookie = "veloura-auth-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    localStorage.removeItem("veloura_user");
    window.location.href = `/${currentLang}/login`;
  };

  const tabs = [
    {
      id: "discover",
      href: `/${currentLang}/dashboard`,
      icon: (active?: string) => (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill={active === "discover" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active === "discover" ? 0 : 2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      label: currentLang === "es" ? "Descubrir" : (currentLang === "ru" ? "Найти" : "Discover"),
    },
    {
      id: "likes",
      href: `/${currentLang}/likes`,
      icon: (active?: string) => (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill={active === "likes" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active === "likes" ? 0 : 2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      label: currentLang === "es" ? "Me gusta" : (currentLang === "ru" ? "Лайки" : "Likes"),
      badge: pendingLikes,
    },
    {
      id: "chat",
      href: `/${currentLang}/chat`,
      icon: (active?: string) => (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill={active === "chat" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active === "chat" ? 0 : 2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      label: "Chat",
      badge: unreadChats,
    },
    {
      id: "profile",
      href: `/${currentLang}/profile`,
      icon: (active?: string) => (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill={active === "profile" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active === "profile" ? 0 : 2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      label: currentLang === "es" ? "Perfil" : (currentLang === "ru" ? "Профиль" : "Profile"),
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A1128]/95 backdrop-blur-xl border-t border-white/10 safe-area-pb"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
    >
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-2xl transition-all duration-200 min-w-[56px] ${
                isActive
                  ? "text-primary"
                  : "text-muted hover:text-white"
              }`}
            >
              {isActive && (
                <span className="absolute inset-0 bg-primary/10 rounded-2xl" />
              )}
              <span className="relative">
                {tab.icon(active)}
                {tab.badge != null && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF6B8B] rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                    {tab.badge > 9 ? "9+" : tab.badge}
                  </span>
                )}
              </span>
              <span className={`text-[9px] font-semibold relative ${isActive ? "text-primary" : ""}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-2xl text-muted hover:text-red-400 transition min-w-[56px]"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="text-[9px] font-semibold">
            {currentLang === "es" ? "Salir" : (currentLang === "ru" ? "Выйти" : "Exit")}
          </span>
        </button>
      </div>
    </nav>
  );
}
