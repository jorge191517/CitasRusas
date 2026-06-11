"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Locale, getTranslation } from "../../../lib/i18n";
import { DatingProfile } from "../../../components/TinderCard";
import { mockProfiles } from "../../../lib/mockData";
import AppHeader from "../../../components/AppHeader";
import MobileBottomNav from "../../../components/MobileBottomNav";
import { supabase } from "../../../lib/supabase/client";

const LOOKING_FOR_LABELS: Record<string, string> = {
  friendship: "Amistad",
  relationship: "Relación",
  serious: "Relación seria",
  marriage: "Matrimonio",
  cultural: "Intercambio cultural",
};

export default function DashboardPage() {
  const params = useParams();
  const currentLang = (params.lang as Locale) || "es";
  const t = getTranslation(currentLang);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<DatingProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDir, setSwipeDir] = useState<null | "left" | "right" | "up">(null);
  const [matchedProfile, setMatchedProfile] = useState<DatingProfile | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterCountry, setFilterCountry] = useState("");
  const [filterAge, setFilterAge] = useState(45);
  const [filterLang, setFilterLang] = useState("");
  const [likesGiven, setLikesGiven] = useState<string[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        localStorage.removeItem("veloura_user");
        window.location.href = `/${currentLang}/login`;
        return;
      }

      const stored = localStorage.getItem("veloura_user");
      let user = stored ? JSON.parse(stored) : null;

      if (!user || user.id !== session.user.id) {
        let profileCompleted = false;
        let profileData: any = null;
        try {
          const res = await fetch("/api/profile", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (res.ok) {
            profileData = await res.json();
            profileCompleted = profileData?.profile?.profileCompleted === true;
          }
        } catch (_) {}

        user = {
          id: session.user.id,
          email: session.user.email,
          role: profileData?.role || "USER",
          profile: {
            ...(profileData?.profile || {}),
            profileCompleted,
          },
        };
        localStorage.setItem("veloura_user", JSON.stringify(user));
      }

      setCurrentUser(user);

      if (user.profile && user.profile.profileCompleted === false) {
        window.location.href = `/${currentLang}/onboarding`;
        return;
      }

      setProfiles(mockProfiles);
      const storedLikes = JSON.parse(localStorage.getItem("veloura_likes") || "[]");
      setLikesGiven(storedLikes);
    };

    checkAuth();
  }, [currentLang]);

  const activeProfile = currentIndex < profiles.length ? profiles[currentIndex] : null;

  const handleSwipe = (direction: "left" | "right" | "up", profile: DatingProfile) => {
    setSwipeDir(direction);

    setTimeout(() => {
      setSwipeDir(null);
      setCurrentIndex((prev) => prev + 1);

      if (direction === "right" || direction === "up") {
        // Save like
        const newLikes = [...likesGiven, profile.id];
        setLikesGiven(newLikes);
        localStorage.setItem("veloura_likes", JSON.stringify(newLikes));

        // 35% match probability
        if (Math.random() < 0.35) {
          setMatchedProfile(profile);
          const existingMatches = JSON.parse(localStorage.getItem("veloura_matches") || "[]");
          if (!existingMatches.some((m: any) => m.id === profile.id)) {
            localStorage.setItem("veloura_matches", JSON.stringify([...existingMatches, profile]));
          }
        }
      }
    }, 300);
  };

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
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

  const calcAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const bd = new Date(birthDate);
    const now = new Date();
    let age = now.getFullYear() - bd.getFullYear();
    const m = now.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) age--;
    return age;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Background glows */}
      <div className="fixed top-0 right-0 w-[50%] h-[50%] bg-[#D4A373]/5 blur-[130px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[50%] h-[50%] bg-[#FF6B8B]/5 blur-[130px] rounded-full pointer-events-none" />

      <AppHeader currentLang={currentLang} />

      {/* Main content — padded bottom for MobileBottomNav */}
      <main className="flex-grow flex flex-col items-center justify-start px-4 pt-4 pb-24 relative z-10 max-w-lg mx-auto w-full">

        {/* Top bar: greeting + filter */}
        <div className="w-full flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-extrabold text-white">
              {currentLang === "es" ? "Descubrir" : (currentLang === "ru" ? "Найти" : "Discover")}
            </h2>
            {currentUser?.profile?.country && (
              <p className="text-xs text-muted">📍 {currentUser.profile.country}</p>
            )}
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/40 rounded-xl text-xs font-semibold text-muted hover:text-white transition"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            {currentLang === "es" ? "Filtros" : "Filter"}
          </button>
        </div>

        {/* Profile counter */}
        {profiles.length > 0 && (
          <p className="text-[10px] text-muted mb-2">
            {currentIndex + 1} / {profiles.length} perfiles
          </p>
        )}

        {/* ── MAIN CARD ── */}
        {activeProfile ? (
          <div
            className={`w-full relative transition-all duration-300 ${
              swipeDir === "right" ? "translate-x-40 rotate-12 opacity-0" :
              swipeDir === "left"  ? "-translate-x-40 -rotate-12 opacity-0" :
              swipeDir === "up"    ? "-translate-y-40 opacity-0" : ""
            }`}
          >
            {/* Card */}
            <div className="w-full rounded-[32px] overflow-hidden border border-white/10 shadow-2xl relative bg-[#0A1128]" style={{ height: "62vh", minHeight: "420px", maxHeight: "560px" }}>
              {/* Photo */}
              {activeProfile.imageUrl ? (
                <img
                  src={activeProfile.imageUrl}
                  alt={activeProfile.firstName}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#151F3C] to-[#0A1128]">
                  <svg viewBox="0 0 100 100" className="w-28 h-28 text-primary/30">
                    <circle cx="50" cy="38" r="22" fill="currentColor" />
                    <path d="M16,90 C16,70 28,56 50,56 C72,56 84,70 84,90" fill="currentColor" />
                  </svg>
                </div>
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1128] via-[#0A1128]/30 to-transparent" />

              {/* Verified badge top */}
              {activeProfile.verified && (
                <div className="absolute top-4 right-4 px-2.5 py-1 bg-black/50 backdrop-blur-md rounded-full flex items-center gap-1 border border-primary/30">
                  <span className="text-primary text-[10px] font-bold">✓ VERIFICADA</span>
                </div>
              )}

              {/* LIKE / NOPE overlays while swiping */}
              {swipeDir === "right" && (
                <div className="absolute top-8 left-6 border-4 border-green-400 text-green-400 font-black text-2xl uppercase px-4 py-2 rounded-xl transform -rotate-12">LIKE</div>
              )}
              {swipeDir === "left" && (
                <div className="absolute top-8 right-6 border-4 border-red-400 text-red-400 font-black text-2xl uppercase px-4 py-2 rounded-xl transform rotate-12">NOPE</div>
              )}

              {/* Profile info bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2">
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-white leading-none">
                      {activeProfile.firstName}, {activeProfile.age}
                    </h2>
                    <p className="text-sm text-white/80 mt-0.5">
                      📍 {activeProfile.city || activeProfile.country}
                    </p>
                  </div>
                  {activeProfile.lookingFor && (
                    <span className="px-2 py-1 bg-primary/20 border border-primary/30 rounded-lg text-[10px] font-bold text-primary shrink-0">
                      {LOOKING_FOR_LABELS[activeProfile.lookingFor] || activeProfile.lookingFor}
                    </span>
                  )}
                </div>

                {activeProfile.profession && (
                  <p className="text-xs text-white/70">💼 {activeProfile.profession}</p>
                )}

                {activeProfile.bio && (
                  <p className="text-xs text-white/75 line-clamp-2 italic leading-relaxed">
                    "{activeProfile.bio}"
                  </p>
                )}

                {/* Interests */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activeProfile.interests.slice(0, 4).map((i) => (
                    <span key={i} className="px-2 py-0.5 bg-[#FF6B8B]/20 text-[#FF6B8B] rounded-full text-[10px] font-semibold">
                      #{i}
                    </span>
                  ))}
                </div>

                {/* Languages */}
                <div className="flex flex-wrap gap-1">
                  {activeProfile.languages.map((l) => (
                    <span key={l} className="px-2 py-0.5 bg-white/10 rounded-full text-[10px] uppercase font-bold text-white">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-center items-center gap-4 mt-5">
              {/* Nope */}
              <button
                onClick={() => handleSwipe("left", activeProfile)}
                className="w-14 h-14 rounded-full bg-[#151F3C] border border-red-500/30 hover:bg-red-500/15 flex items-center justify-center text-red-400 hover:scale-110 active:scale-95 transition-all shadow-lg font-bold text-xl"
              >
                ✕
              </button>

              {/* Super Like */}
              <button
                onClick={() => handleSwipe("up", activeProfile)}
                className="w-12 h-12 rounded-full bg-[#151F3C] border border-blue-400/30 hover:bg-blue-500/15 flex items-center justify-center text-blue-400 hover:scale-110 active:scale-95 transition-all shadow-md"
              >
                ⭐
              </button>

              {/* Like */}
              <button
                onClick={() => handleSwipe("right", activeProfile)}
                className="w-16 h-16 rounded-full flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all shadow-xl font-bold text-2xl"
                style={{ background: "linear-gradient(135deg, #D4A373, #FF6B8B)" }}
              >
                ♥
              </button>

              {/* Info */}
              <button
                onClick={() => {
                  const el = document.getElementById("profile-detail-modal");
                  if (el) el.classList.remove("hidden");
                }}
                className="w-12 h-12 rounded-full bg-[#151F3C] border border-white/10 hover:bg-white/10 flex items-center justify-center text-muted hover:text-white transition-all shadow-md"
              >
                ℹ️
              </button>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="w-full flex flex-col items-center justify-center gap-5 py-16">
            <div className="glass p-8 rounded-3xl text-center border border-white/10 space-y-4 max-w-xs shadow-xl w-full">
              <p className="text-5xl">👀</p>
              <h3 className="font-bold text-white">
                {currentLang === "es" ? "Has visto todos los perfiles" : "You've seen everyone"}
              </h3>
              <p className="text-xs text-muted">
                {currentLang === "es" ? "Vuelve más tarde o amplía tus filtros" : "Come back later or expand your filters"}
              </p>
              <button
                onClick={() => { setCurrentIndex(0); setProfiles(mockProfiles); }}
                className="w-full py-3 bg-premium-gold text-background font-bold rounded-xl text-sm hover:opacity-90 transition"
              >
                🔄 {currentLang === "es" ? "Ver de nuevo" : "See again"}
              </button>
            </div>
          </div>
        )}

        {/* Preview of next card */}
        {activeProfile && currentIndex + 1 < profiles.length && (
          <div className="w-full mt-3">
            <div className="w-full h-12 rounded-2xl bg-[#151F3C]/60 border border-white/5 flex items-center px-4 gap-3">
              {profiles[currentIndex + 1].imageUrl ? (
                <img
                  src={profiles[currentIndex + 1].imageUrl}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover border border-primary/20"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs">👤</div>
              )}
              <span className="text-xs text-muted">
                {currentLang === "es" ? "Siguiente:" : "Next:"}{" "}
                <span className="text-white font-semibold">{profiles[currentIndex + 1].firstName}, {profiles[currentIndex + 1].age}</span>
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Filters Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-lg bg-[#0D1530] border-t border-primary/20 rounded-t-[32px] p-6 space-y-5 animate-slide-up">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">🔍 {currentLang === "es" ? "Filtros" : "Filters"}</h3>
              <button onClick={() => setShowFilters(false)} className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-muted hover:text-white">✕</button>
            </div>
            <form onSubmit={applyFilters} className="space-y-4">
              <div>
                <label className="block text-xs text-muted mb-1">{currentLang === "es" ? "País" : "Country"}</label>
                <input
                  type="text"
                  value={filterCountry}
                  onChange={(e) => setFilterCountry(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A1128] border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-primary"
                  placeholder="Rusia, España, Letonia..."
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">
                  {currentLang === "es" ? "Edad máx:" : "Max age:"} <span className="text-white font-bold">{filterAge}</span>
                </label>
                <input type="range" min="18" max="60" value={filterAge} onChange={(e) => setFilterAge(parseInt(e.target.value))} className="w-full accent-primary" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">{currentLang === "es" ? "Idioma" : "Language"}</label>
                <select value={filterLang} onChange={(e) => setFilterLang(e.target.value)} className="w-full px-4 py-2.5 bg-[#0A1128] border border-white/15 rounded-xl text-white text-sm">
                  <option value="">{currentLang === "es" ? "Cualquiera" : "Any"}</option>
                  <option value="es">Español 🇪🇸</option>
                  <option value="en">English 🇬🇧</option>
                  <option value="ru">Русский 🇷🇺</option>
                  <option value="lv">Latviešu 🇱🇻</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowFilters(false)} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-muted">
                  {currentLang === "es" ? "Cancelar" : "Cancel"}
                </button>
                <button type="submit" className="flex-1 py-3 bg-premium-gold text-background font-bold rounded-xl text-sm">
                  {currentLang === "es" ? "Aplicar" : "Apply"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Match Overlay */}
      {matchedProfile && (
        <div className="fixed inset-0 z-50 bg-[#0A1128]/97 flex flex-col items-center justify-center p-6 text-center">
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-[#D4A373]/8 blur-[180px] rounded-full" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-[#FF6B8B]/8 blur-[180px] rounded-full" />

          <div className="relative z-10 space-y-6 max-w-xs w-full">
            {/* Match text */}
            <div className="space-y-1">
              <p className="text-sm text-muted uppercase tracking-widest font-bold">Es un</p>
              <h1 className="text-6xl font-black text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #D4A373, #FF6B8B, #D4A373)" }}>
                MATCH
              </h1>
              <p className="text-sm text-muted">
                {currentLang === "es"
                  ? `¡A ti y a ${matchedProfile.firstName} os gustáis mutuamente!`
                  : `You and ${matchedProfile.firstName} like each other!`}
              </p>
            </div>

            {/* Avatars */}
            <div className="flex justify-center items-center gap-0 py-4">
              <div className="w-24 h-24 rounded-full border-4 border-primary bg-[#151F3C] flex items-center justify-center overflow-hidden shadow-2xl shadow-primary/30 z-10">
                <svg viewBox="0 0 100 100" className="w-14 h-14 text-primary/60">
                  <circle cx="50" cy="38" r="22" fill="currentColor" />
                  <path d="M16,90 C16,70 28,56 50,56 C72,56 84,70 84,90" fill="currentColor" />
                </svg>
              </div>
              <div className="w-6 h-6 bg-[#FF6B8B] rounded-full flex items-center justify-center text-white text-sm z-20 -mx-3 shadow-lg">♥</div>
              <div className="w-24 h-24 rounded-full border-4 border-[#FF6B8B] bg-[#151F3C] flex items-center justify-center overflow-hidden shadow-2xl shadow-secondary/30 z-10">
                {matchedProfile.imageUrl ? (
                  <img src={matchedProfile.imageUrl} alt={matchedProfile.firstName} className="w-full h-full object-cover" />
                ) : (
                  <svg viewBox="0 0 100 100" className="w-14 h-14 text-secondary/60">
                    <circle cx="50" cy="38" r="22" fill="currentColor" />
                    <path d="M16,90 C16,70 28,56 50,56 C72,56 84,70 84,90" fill="currentColor" />
                  </svg>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Link
                href={`/${currentLang}/chat`}
                className="block w-full py-4 font-bold rounded-2xl text-white shadow-lg text-sm"
                style={{ background: "linear-gradient(135deg, #D4A373, #FF6B8B)" }}
                onClick={() => setMatchedProfile(null)}
              >
                💬 {currentLang === "es" ? "Enviar mensaje" : "Send message"}
              </Link>
              <button
                onClick={() => setMatchedProfile(null)}
                className="w-full py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-2xl text-sm transition"
              >
                {currentLang === "es" ? "Seguir descubriendo" : "Keep discovering"}
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileBottomNav currentLang={currentLang} active="discover" />
    </div>
  );
}
