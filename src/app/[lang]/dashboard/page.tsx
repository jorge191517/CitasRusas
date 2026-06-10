"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Locale, getTranslation } from "../../../lib/i18n";
import TinderCard, { DatingProfile } from "../../../components/TinderCard";
import { mockProfiles } from "../../../lib/mockData";
import LanguageSwitcher from "../../../components/LanguageSwitcher";

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const currentLang = (params.lang as Locale) || "es";
  const t = getTranslation(currentLang);

  // Auth check and local state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<DatingProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Filters state
  const [filterCountry, setFilterCountry] = useState("");
  const [filterAge, setFilterAge] = useState(35);
  const [filterLang, setFilterLang] = useState("");

  // Match alert modal state
  const [matchedProfile, setMatchedProfile] = useState<DatingProfile | null>(null);

  useEffect(() => {
    // Check local storage for user info
    const storedUser = localStorage.getItem("veloura_user");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    } else {
      // Direct failover fallback if middleware cookie wasn't cleaned
      router.push(`/${currentLang}/login`);
    }

    // Load initial profiles
    setProfiles(mockProfiles);
  }, [currentLang, router]);

  const handleLogout = () => {
    // Clear cookies & storage
    document.cookie = "veloura-auth-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    localStorage.removeItem("veloura_user");
    router.push(`/${currentLang}/login`);
  };

  const handleSwipe = (direction: "left" | "right" | "up", profile: DatingProfile) => {
    console.log(`Swiped ${profile.firstName} to the ${direction}`);
    
    // Auto increment deck index
    setCurrentIndex((prev) => prev + 1);

    // If swipe right (Like) or up (Super Like), 40% probability of mock Match!
    if (direction === "right" || direction === "up") {
      const matchChance = Math.random() < 0.4;
      if (matchChance) {
        setMatchedProfile(profile);

        // Store this match in LocalStorage so the Chat window can list it!
        const existingMatches = JSON.parse(localStorage.getItem("veloura_matches") || "[]");
        if (!existingMatches.some((m: any) => m.id === profile.id)) {
          localStorage.setItem(
            "veloura_matches",
            JSON.stringify([...existingMatches, profile])
          );
        }
      }
    }
  };

  const resetDeck = () => {
    setCurrentIndex(0);
  };

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter profiles based on inputs
    const filtered = mockProfiles.filter((p) => {
      const matchC = filterCountry ? p.country.toLowerCase().includes(filterCountry.toLowerCase()) : true;
      const matchA = p.age <= filterAge;
      const matchL = filterLang ? p.languages.includes(filterLang) : true;
      return matchC && matchA && matchL;
    });
    setProfiles(filtered);
    setCurrentIndex(0);
    setShowFilters(false);
  };

  const activeProfile = currentIndex < profiles.length ? profiles[currentIndex] : null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between relative overflow-hidden">
      {/* Background glow sparks */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-[#D4A373]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-[#FF6B8B]/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Main Header / Navigation */}
      <header className="w-full glass border-b border-primary/10 px-6 py-4 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href={`/${currentLang}/dashboard`} className="flex items-center space-x-2">
              <svg viewBox="0 0 512 512" className="w-8 h-8 text-primary" fill="currentColor">
                <path d="M256,120 C230,80 180,80 150,110 C120,140 120,190 150,220 L256,330 L362,220 C392,190 392,140 362,110 C332,80 282,80 256,120 Z" fill="none" stroke="currentColor" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M256,170 C240,140 200,140 180,160 C160,180 160,210 180,230 L256,305 L332,230 C352,210 352,180 332,160 C312,140 272,140 256,170 Z" fill="none" stroke="#FF6B8B" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span className="text-lg font-bold tracking-widest text-primary font-serif hidden sm:inline-block">VELOURA</span>
            </Link>
            
            {/* Nav Tabs */}
            <nav className="flex space-x-4 text-sm font-semibold">
              <Link href={`/${currentLang}/dashboard`} className="text-primary border-b-2 border-primary pb-1">
                {t("dashboard.discover")}
              </Link>
              <Link href={`/${currentLang}/chat`} className="text-muted hover:text-white transition">
                {t("chat.title")}
              </Link>
              <Link href={`/${currentLang}/profile`} className="text-muted hover:text-white transition">
                {t("profile.title")}
              </Link>
              {currentUser?.role === "ADMIN" && (
                <Link href={`/${currentLang}/admin`} className="text-secondary hover:text-white transition">
                  🛡️ Admin
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <LanguageSwitcher currentLang={currentLang} />
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold rounded-full transition"
            >
              {t("common.logout")}
            </button>
          </div>
        </div>
      </header>

      {/* Main Discover Layout */}
      <main className="flex-grow flex flex-col items-center justify-center p-6 relative z-10">
        
        {/* Advanced Filters Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowFilters(true)}
            className="px-6 py-2 bg-[#151F3C] border border-primary/20 hover:border-primary/40 rounded-full text-xs font-semibold tracking-wider text-primary shadow-md flex items-center gap-2"
          >
            <span>🔍</span> {t("dashboard.filterTitle")}
          </button>
        </div>

        {/* Card Stack Deck */}
        <div className="relative w-full max-w-sm h-[500px] flex items-center justify-center">
          {activeProfile ? (
            <TinderCard
              key={activeProfile.id}
              profile={activeProfile}
              onSwipe={(dir) => handleSwipe(dir, activeProfile)}
            />
          ) : (
            <div className="glass p-8 rounded-3xl text-center border border-white/5 space-y-4 max-w-xs shadow-xl">
              <p className="text-5xl">👀</p>
              <p className="text-sm text-muted">{t("dashboard.noUsers")}</p>
              <button
                onClick={resetDeck}
                className="w-full py-2.5 bg-premium-gold text-background font-bold rounded-xl text-sm"
              >
                🔄 {t("dashboard.keepSwiping")}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Filters Modal Drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-card border border-primary/30 p-6 rounded-3xl space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white">🔍 {t("dashboard.filterTitle")}</h3>
              <button onClick={() => setShowFilters(false)} className="text-muted hover:text-white text-xl">✕</button>
            </div>
            
            <form onSubmit={applyFilters} className="space-y-4 text-left">
              <div>
                <label className="block text-xs text-muted mb-1">{t("dashboard.filterCountry")}</label>
                <input
                  type="text"
                  value={filterCountry}
                  onChange={(e) => setFilterCountry(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0A1128] border border-white/15 rounded-xl text-white text-sm"
                  placeholder="Rusia, España..."
                />
              </div>

              <div>
                <label className="block text-xs text-muted mb-1">
                  {t("dashboard.filterAge")}: {filterAge}
                </label>
                <input
                  type="range"
                  min="18"
                  max="60"
                  value={filterAge}
                  onChange={(e) => setFilterAge(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-muted mb-1">{t("dashboard.filterLanguages")}</label>
                <select
                  value={filterLang}
                  onChange={(e) => setFilterLang(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0A1128] border border-white/15 rounded-xl text-white text-sm"
                >
                  <option value="">Cualquiera</option>
                  <option value="es">Español 🇪🇸</option>
                  <option value="en">English 🇬🇧</option>
                  <option value="ru">Русский 🇷🇺</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-semibold"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-premium-gold text-background font-bold rounded-xl text-xs shadow-md"
                >
                  {t("dashboard.applyFilters")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Match Overlay Modal */}
      {matchedProfile && (
        <div className="fixed inset-0 z-50 bg-[#0A1128]/95 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-[#D4A373]/10 blur-[150px] rounded-full" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-[#FF6B8B]/10 blur-[150px] rounded-full" />
          
          <div className="space-y-6 relative z-10 max-w-sm">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#FF6B8B] to-primary tracking-wide animate-pulse">
              {t("dashboard.match")}
            </h1>
            
            <p className="text-muted text-sm px-4">
              {t("dashboard.matchDesc", { name: matchedProfile.firstName })}
            </p>

            {/* Graphic layout of double avatars */}
            <div className="flex justify-center items-center -space-x-8 py-8">
              <div className="w-28 h-28 rounded-full border-4 border-primary bg-[#151F3C] flex items-center justify-center overflow-hidden shadow-2xl relative">
                <svg viewBox="0 0 100 100" className="w-16 h-16 text-primary">
                  <circle cx="50" cy="40" r="20" fill="currentColor" />
                  <path d="M20,85 C20,70 30,60 50,60 C70,60 80,70 80,85" fill="currentColor" />
                </svg>
              </div>
              <div className="w-28 h-28 rounded-full border-4 border-secondary bg-[#151F3C] flex items-center justify-center overflow-hidden shadow-2xl relative z-10">
                {matchedProfile.imageUrl ? (
                  <img src={matchedProfile.imageUrl} alt={matchedProfile.firstName} className="w-full h-full object-cover" />
                ) : (
                  <svg viewBox="0 0 100 100" className="w-16 h-16 text-secondary">
                    <circle cx="50" cy="40" r="20" fill="currentColor" />
                    <path d="M20,85 C20,70 30,60 50,60 C70,60 80,70 80,85" fill="currentColor" />
                  </svg>
                )}
              </div>
            </div>

            <div className="space-y-3 px-4">
              <Link
                href={`/${currentLang}/chat`}
                className="block w-full py-3.5 bg-premium-pink text-white font-bold rounded-xl shadow-lg shadow-secondary/20 hover:scale-105 transition"
              >
                💬 {t("dashboard.startChat")}
              </Link>
              <button
                onClick={() => setMatchedProfile(null)}
                className="w-full py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl text-sm transition"
              >
                {t("dashboard.keepSwiping")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Basic Tab Bar for Mobile App Viewports */}
      <footer className="w-full glass border-t border-primary/10 p-2 sm:hidden z-20">
        <div className="flex justify-around text-muted text-xs">
          <Link href={`/${currentLang}/dashboard`} className="flex flex-col items-center py-1 text-primary">
            <span>🎴</span>
            <span>Descubrir</span>
          </Link>
          <Link href={`/${currentLang}/chat`} className="flex flex-col items-center py-1">
            <span>💬</span>
            <span>Chats</span>
          </Link>
          <Link href={`/${currentLang}/profile`} className="flex flex-col items-center py-1">
            <span>👤</span>
            <span>Perfil</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
