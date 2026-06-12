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

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isVip, setIsVip] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [showVipModal, setShowVipModal] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [dbMatches, setDbMatches] = useState<any[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);

      if (!currentSession) {
        localStorage.removeItem("veloura_user");
        setCurrentUser(null);
        setProfiles(mockProfiles);
        return;
      }

      const stored = localStorage.getItem("veloura_user");
      let user = stored ? JSON.parse(stored) : null;

      let profileCompleted = false;
      let profileData: any = null;
      let apiCallSucceeded = false;
      try {
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${currentSession.access_token}` },
        });
        if (res.ok) {
          profileData = await res.json();
          apiCallSucceeded = true;
          profileCompleted = profileData?.profile?.profileCompleted === true;
          setLikesCount(profileData?.likesCount || 0);
          setIsVip(profileData?.subscription?.tier === "PREMIUM" && profileData?.subscription?.isActive);
          setBlockedUserIds(profileData?.blockedUserIds || []);

          // Fetch matches to know if there's a match
          try {
            const matchesRes = await fetch("/api/matches", {
              headers: { Authorization: `Bearer ${currentSession.access_token}` },
            });
            if (matchesRes.ok) {
              const matchesData = await matchesRes.json();
              setDbMatches(matchesData.matches || []);
            }
          } catch (mErr) {
            console.error("Error fetching db matches:", mErr);
          }
        } else if (res.status === 404) {
          // User exists in Supabase Auth but has no DB profile yet
          // Do NOT redirect to onboarding — let dashboard show normally
          // The API will auto-create the user record on PATCH (onboarding save)
          apiCallSucceeded = true;
          profileCompleted = false; // no profile yet, but we handle this below
        }
      } catch (_) {
        // Network error — assume profile may exist, do NOT redirect
        apiCallSucceeded = false;
      }

      user = {
        id: currentSession.user.id,
        email: currentSession.user.email,
        role: profileData?.role || "USER",
        profile: {
          ...(profileData?.profile || {}),
          profileCompleted,
        },
        subscription: profileData?.subscription,
        likesCount: profileData?.likesCount || 0,
      };
      localStorage.setItem("veloura_user", JSON.stringify(user));
      setCurrentUser(user);

      // CRITICAL FIX:
      // Only redirect to onboarding if ALL of these are true:
      // 1. The API call actually succeeded (no network error)
      // 2. A profile record EXISTS in DB (profileData?.profile is not null)
      // 3. profileCompleted is explicitly false
      // 
      // If the API failed or user has no profile row yet → show dashboard normally
      // (They will be redirected via auth-redirect on next app open)
      const hasExistingProfile = apiCallSucceeded && profileData?.profile !== null && profileData?.profile !== undefined;
      if (hasExistingProfile && profileCompleted === false) {
        window.location.replace(`/${currentLang}/onboarding`);
        return;
      }

      // Filter out blocked users from profiles
      const blocked = profileData?.blockedUserIds || [];
      const filteredProfiles = mockProfiles.filter(p => !blocked.includes(p.id));
      setProfiles(filteredProfiles);
      
      const storedLikes = JSON.parse(localStorage.getItem("veloura_likes") || "[]");
      setLikesGiven(storedLikes);
    };

    checkAuth();
  }, [currentLang]);

  const handleSendMessageClick = async (profileId: string) => {
    if (!session) {
      setShowAuthModal(true);
      return;
    }

    // Check if there's already a match with this user (and thus a conversationId)
    const existingMatch = dbMatches.find((m) => m.id === profileId);

    if (existingMatch && existingMatch.conversationId) {
      // ✅ Real match with conversation — open chat directly
      window.location.href = `/${currentLang}/chat?conversationId=${existingMatch.conversationId}`;
      return;
    }

    // No existing match yet—try to create one via forceMatch (works for real users and mocks in DB)
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          receiverId: profileId,
          type: "LIKE",
          forceMatch: true
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.isMatch && data.match && data.match.conversationId) {
          window.location.href = `/${currentLang}/chat?conversationId=${data.match.conversationId}`;
          return;
        }
      }

      // If we get here, no conversation was created
      const resData = res.ok ? await res.json().catch(() => ({})) : {};
      if (res.status === 403) {
        alert(currentLang === "es"
          ? "Has alcanzado el límite de likes. Consigue VIP para continuar."
          : "You've reached the like limit. Get VIP to continue.");
      } else {
        // For mock profiles or users without DB records, show friendly message
        alert(currentLang === "es"
          ? "Este perfil aún no está disponible para chat. \nDa like para intentar un match primero."
          : "This profile is not available for chat yet. \nLike them first to try to match.");
      }
    } catch (err) {
      console.error("Error opening chat:", err);
      alert(currentLang === "es"
        ? "No se pudo iniciar el chat. Inténtalo de nuevo."
        : "Could not start chat. Please try again.");
    }
  };

  const activeProfile = currentIndex < profiles.length ? profiles[currentIndex] : null;

  const handleSwipe = async (direction: "left" | "right" | "up", profile: DatingProfile) => {
    // 1. Guest Check
    if (!session) {
      setShowAuthModal(true);
      return;
    }

    // 2. Likes limit check for Free users
    if (direction === "right" || direction === "up") {
      if (!isVip && likesCount >= 10) {
        setShowVipModal(true);
        return;
      }
    }

    setSwipeDir(direction);

    // Call real API matches endpoint
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          receiverId: profile.id,
          type: direction === "up" ? "SUPER_LIKE" : (direction === "right" ? "LIKE" : "DISLIKE")
        })
      });

      if (res.status === 403) {
        const errData = await res.json();
        if (errData.limitReached) {
          setShowVipModal(true);
          return;
        }
      }

      if (res.ok) {
        const data = await res.json();
        
        // Update likesCount local state
        if (direction === "right" || direction === "up") {
          setLikesCount(prev => prev + 1);
        }

        if (data.isMatch && data.match) {
          // It's a match! Show matched overlay
          setMatchedProfile(profile);
          
          // Save to local storage for local compatibility
          const existingMatches = JSON.parse(localStorage.getItem("veloura_matches") || "[]");
          if (!existingMatches.some((m: any) => m.id === profile.id)) {
            localStorage.setItem("veloura_matches", JSON.stringify([...existingMatches, profile]));
          }
        }
      }
    } catch (err) {
      console.error("[SWIPE ERROR]:", err);
    }

    setTimeout(() => {
      setSwipeDir(null);
      setCurrentIndex((prev) => prev + 1);
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

              {/* If already matched, show "Send Message" shortcut */}
              {session && dbMatches.some(m => m.id === activeProfile.id) && (
                <div className="absolute top-4 left-4 z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const m = dbMatches.find(m => m.id === activeProfile.id);
                      if (m && m.conversationId) {
                        window.location.href = `/${currentLang}/chat?conversationId=${m.conversationId}`;
                      }
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-[#D4A373] to-[#FF6B8B] text-background text-[10px] font-black rounded-full shadow-md flex items-center gap-1 hover:scale-105 active:scale-95 transition"
                  >
                    💬 Enviar mensaje
                  </button>
                </div>
              )}

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

              {/* Direct Message */}
              <button
                onClick={() => handleSendMessageClick(activeProfile.id)}
                className="w-12 h-12 rounded-full bg-[#151F3C] border border-[#D4A373]/30 hover:bg-[#D4A373]/15 flex items-center justify-center text-[#D4A373] hover:scale-110 active:scale-95 transition-all shadow-md"
              >
                💬
              </button>

              {/* Info */}
              <button
                onClick={() => setShowDetailModal(true)}
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

      {/* VIP Limit Modal */}
      {showVipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="glass max-w-sm w-full p-6 rounded-3xl border border-primary/20 text-center space-y-5">
            <span className="text-5xl block">👑</span>
            <h3 className="text-xl font-bold text-white">¡Límite de likes alcanzado!</h3>
            <p className="text-xs text-muted leading-relaxed">
              Has agotado tus 10 likes gratuitos de hoy. Consigue el acceso VIP para poder dar likes y super likes de forma ilimitada.
            </p>
            <div className="flex flex-col gap-2.5">
              <Link
                href={`/${currentLang}/vip`}
                className="w-full py-3 bg-premium-gold text-background font-bold rounded-xl text-center text-sm shadow-md"
                onClick={() => setShowVipModal(false)}
              >
                Conseguir VIP Gratis
              </Link>
              <button
                onClick={() => setShowVipModal(false)}
                className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl text-center text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Detail Modal */}
      {showDetailModal && activeProfile && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm p-0 animate-fade-in">
          <div className="w-full max-w-lg bg-[#0A1128] border-t border-primary/20 rounded-t-[32px] overflow-hidden max-h-[90vh] flex flex-col relative animate-slide-up">
            {/* Header Image */}
            <div className="relative h-64 shrink-0">
              {activeProfile.imageUrl ? (
                <img src={activeProfile.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#151F3C] flex items-center justify-center text-primary font-bold text-5xl">👤</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1128] to-transparent" />
              <button
                onClick={() => setShowDetailModal(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center font-bold text-lg hover:bg-black/80 transition"
              >
                ✕
              </button>

              {/* Verified badge */}
              {activeProfile.verified && (
                <div className="absolute top-4 left-4 px-2.5 py-1 bg-black/50 backdrop-blur-md rounded-full border border-primary/30">
                  <span className="text-primary text-[10px] font-bold">✓ VERIFICADA</span>
                </div>
              )}
            </div>

            {/* Profile Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-28 pt-4 space-y-4">
              <div>
                <h2 className="text-2xl font-black text-white">
                  {activeProfile.firstName}, {activeProfile.age}
                </h2>
                <p className="text-sm text-muted mt-0.5">📍 {activeProfile.city || activeProfile.country}</p>
              </div>

              {activeProfile.lookingFor && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">Buscando:</span>
                  <span className="px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-lg text-xs font-bold text-primary">
                    {LOOKING_FOR_LABELS[activeProfile.lookingFor] || activeProfile.lookingFor}
                  </span>
                </div>
              )}

              {activeProfile.profession && (
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Profesión / Ocupación</h4>
                  <p className="text-sm text-white">💼 {activeProfile.profession}</p>
                </div>
              )}

              {activeProfile.bio && (
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Sobre mí</h4>
                  <p className="text-sm text-white/90 leading-relaxed italic">"{activeProfile.bio}"</p>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Intereses</h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeProfile.interests.map((i) => (
                    <span key={i} className="px-3 py-1 bg-[#FF6B8B]/10 border border-[#FF6B8B]/15 text-[#FF6B8B] rounded-full text-xs font-semibold">
                      #{i}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Idiomas</h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeProfile.languages.map((l) => (
                    <span key={l} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs uppercase font-bold text-white">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0A1128] via-[#0A1128] to-transparent pt-8 flex gap-3 z-20">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  handleSendMessageClick(activeProfile.id);
                }}
                className="flex-1 py-4 bg-gradient-to-r from-[#D4A373] to-[#FF6B8B] hover:opacity-95 text-background font-black rounded-2xl text-center text-sm shadow-lg transform active:scale-95 transition"
              >
                💬 Enviar mensaje
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guest Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="glass max-w-sm w-full p-6 rounded-3xl border border-primary/20 text-center space-y-5">
            <span className="text-5xl block">💖</span>
            <h3 className="text-xl font-bold text-white">¡Únete a Veloura!</h3>
            <p className="text-xs text-muted leading-relaxed">
              Crea una cuenta para continuar. Podrás dar me gusta, enviar super likes, chatear y ver perfiles de forma ilimitada.
            </p>
            <div className="flex flex-col gap-2.5">
              <Link
                href={`/${currentLang}/register`}
                className="w-full py-3 bg-premium-gold text-background font-bold rounded-xl text-center text-sm shadow-md"
              >
                Crear cuenta
              </Link>
              <Link
                href={`/${currentLang}/login`}
                className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl text-center text-sm"
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

      <MobileBottomNav currentLang={currentLang} active="discover" />
    </div>
  );
}
