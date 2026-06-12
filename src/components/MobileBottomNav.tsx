"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Locale } from "../lib/i18n";
import { supabase } from "../lib/supabase/client";

interface MobileBottomNavProps {
  currentLang: Locale;
  active?: "discover" | "likes" | "chat" | "vip" | "options";
}

export default function MobileBottomNav({ currentLang, active }: MobileBottomNavProps) {
  const [unreadChats, setUnreadChats] = useState(0);
  const [pendingLikes, setPendingLikes] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("veloura_user");
    setIsLoggedIn(!!user);

    const fetchCounts = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch("/api/matches", {
          headers: { "Authorization": `Bearer ${session.access_token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadChats(data.unreadMessagesCount || 0);
          setPendingLikes(data.receivedLikes?.length || 0);
        }
      } catch (err) {
        console.error("Error fetching badge counts in nav:", err);
      }
    };

    if (user) {
      fetchCounts();
    } else {
      setUnreadChats(0);
      setPendingLikes(0);
    }
  }, []);

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
      id: "vip",
      href: `/${currentLang}/vip`,
      icon: (active?: string) => (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill={active === "vip" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active === "vip" ? 0 : 2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
        </svg>
      ),
      label: "VIP",
    },
    {
      id: "options",
      href: `/${currentLang}/options`,
      icon: (active?: string) => (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill={active === "options" ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
      label: currentLang === "es" ? "Opciones" : (currentLang === "ru" ? "Опции" : "Options"),
    },
  ];

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A1128]/95 backdrop-blur-xl border-t border-white/10 safe-area-pb"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
      >
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-1">
          {tabs.map((tab) => {
            const isActive = active === tab.id;
            const isPrivateTab = tab.id !== "discover";
            const requiresLogin = isPrivateTab && !isLoggedIn;

            const handleTabClick = (e: React.MouseEvent) => {
              if (requiresLogin) {
                e.preventDefault();
                setShowAuthModal(true);
              }
            };

            return (
              <Link
                key={tab.id}
                href={tab.href}
                onClick={handleTabClick}
                className={`relative flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-2xl transition-all duration-200 min-w-[56px] ${
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
        </div>
      </nav>

      {/* Guest Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="glass max-w-sm w-full p-6 rounded-3xl border border-primary/20 text-center space-y-5 text-white">
            <span className="text-5xl block">💖</span>
            <h3 className="text-xl font-bold text-white">¡Únete a Veloura!</h3>
            <p className="text-xs text-muted leading-relaxed">
              Crea una cuenta para continuar. Podrás dar me gusta, enviar super likes, chatear y ver perfiles de forma ilimitada.
            </p>
            <div className="flex flex-col gap-2.5">
              <Link
                href={`/${currentLang}/register`}
                className="w-full py-3 bg-premium-gold text-background font-bold rounded-xl text-center text-sm shadow-md"
                onClick={() => setShowAuthModal(false)}
              >
                Crear cuenta
              </Link>
              <Link
                href={`/${currentLang}/login`}
                className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl text-center text-sm"
                onClick={() => setShowAuthModal(false)}
              >
                Iniciar sesión
              </Link>
            </div>
            <button
              onClick={() => setShowAuthModal(false)}
              className="text-xs text-muted hover:text-white underline font-medium"
            >
              Seguir explorando
            </button>
          </div>
        </div>
      )}
    </>
  );
}
