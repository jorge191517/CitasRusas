"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Locale, getTranslation } from "../../../lib/i18n";
import { DatingProfile } from "../../../components/TinderCard";
import AppHeader from "../../../components/AppHeader";
import MobileBottomNav from "../../../components/MobileBottomNav";
import { LikesGridSkeleton } from "../../../components/Skeleton";
import { supabase } from "../../../lib/supabase/client";
import { getOptimizedSupabaseImageUrl } from "../../../lib/image-utils";

export default function LikesPage() {
  const params = useParams();
  const router = useRouter();
  const currentLang = (params.lang as Locale) || "es";
  const t = getTranslation(currentLang);

  const [activeTab, setActiveTab] = useState<"received" | "sent" | "visitors">("received");
  const [receivedLikes, setReceivedLikes] = useState<any[]>([]);
  const [sentLikes, setSentLikes] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);
  
  const [isVip, setIsVip] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [isGuest, setIsGuest] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<any>(null);
  const [dbMatches, setDbMatches] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);

      if (!currentSession) {
        setIsGuest(true);
        setShowAuthModal(true);
        setLoading(false);
        return;
      }

      // Fetch user profile stats to check VIP status
      try {
        const profileRes = await fetch("/api/profile", {
          headers: { "Authorization": `Bearer ${currentSession.access_token}` }
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setIsVip(profileData.subscription?.tier === "PREMIUM" && profileData.subscription?.isActive);
        }
      } catch (err) {
        console.error("Error reading VIP status:", err);
      }

      fetchLikesAndMatches(currentSession);
    };

    init();
  }, [currentLang]);

  const fetchLikesAndMatches = async (currSession: any) => {
    try {
      setLoading(true);
      const res = await fetch("/api/matches", {
        headers: { "Authorization": `Bearer ${currSession.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReceivedLikes(data.receivedLikes || []);
        setSentLikes(data.sentLikes || []);
        setDbMatches(data.matches || []);
        
        // Mock visitors for visual premium effect
        if (data.receivedLikes && data.receivedLikes.length > 0) {
          setVisitors(data.receivedLikes.slice().reverse());
        } else {
          setVisitors([]);
        }
      }
    } catch (err) {
      console.error("Error fetching likes data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLikeBack = async (profile: any) => {
    if (!session) return;
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          receiverId: profile.id,
          type: "LIKE"
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.isMatch) {
          setMatchedProfile(profile);
          
          // Save to local storage for local compatibility
          const existingMatches = JSON.parse(localStorage.getItem("veloura_matches") || "[]");
          if (!existingMatches.some((m: any) => m.id === profile.id)) {
            localStorage.setItem("veloura_matches", JSON.stringify([...existingMatches, profile]));
          }
        }
        // Refresh lists
        fetchLikesAndMatches(session);
      }
    } catch (err) {
      console.error("Error matching back user:", err);
    }
  };

  const tabLabel = {
    received: currentLang === "es" ? "Le gustas" : (currentLang === "ru" ? "Лайки" : "Likes"),
    sent: currentLang === "es" ? "Mis likes" : (currentLang === "ru" ? "Мои лайки" : "My likes"),
    visitors: currentLang === "es" ? "Visitas" : (currentLang === "ru" ? "Посетители" : "Visitors"),
  };

  const currentList = activeTab === "received" ? receivedLikes : activeTab === "sent" ? sentLikes : visitors;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <div className="fixed top-0 right-0 w-[50%] h-[50%] bg-[#D4A373]/5 blur-[130px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[50%] h-[50%] bg-[#FF6B8B]/5 blur-[130px] rounded-full pointer-events-none z-0" />

      <AppHeader
        currentLang={currentLang}
        title={currentLang === "es" ? "Me gusta" : (currentLang === "ru" ? "Лайки" : "Likes")}
      />

      <main className="flex-grow max-w-lg mx-auto w-full px-4 pt-4 pb-28 relative z-10">
        {/* Guest screen block */}
        {isGuest ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 space-y-4 text-center">
            <span className="text-6xl">🔒</span>
            <h3 className="font-bold text-white text-lg">
              {currentLang === "es" ? "Inicia sesión para ver likes" : "Log in to see likes"}
            </h3>
            <p className="text-xs text-muted max-w-xs leading-relaxed">
              {currentLang === "es"
                ? "Regístrate gratis para ver quién está interesado en ti e iniciar chats directos."
                : "Register for free to see who is interested in you and start chatting."}
            </p>
            <div className="flex flex-col gap-2.5 w-full max-w-xs pt-4">
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
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1.5 mb-5 bg-[#0D1530] p-1 rounded-2xl border border-white/5">
              {(["received", "sent", "visitors"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === tab
                      ? "bg-primary text-background shadow-md"
                      : "text-muted hover:text-white"
                  }`}
                >
                  {tabLabel[tab]}
                  {tab === "received" && receivedLikes.length > 0 && (
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black ${activeTab === tab ? "bg-background/20 text-background" : "bg-[#FF6B8B]/20 text-[#FF6B8B]"}`}>
                      {receivedLikes.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Content list */}
            {loading ? (
              <LikesGridSkeleton />
            ) : currentList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <span className="text-5xl">{activeTab === "received" ? "💌" : activeTab === "sent" ? "💛" : "👁️"}</span>
                <p className="text-sm font-bold text-white">
                  {activeTab === "received"
                    ? (currentLang === "es" ? "Aún nadie te ha dado like" : "No likes yet")
                    : activeTab === "sent"
                    ? (currentLang === "es" ? "Todavía no has dado likes" : "No likes sent")
                    : (currentLang === "es" ? "Nadie ha visitado tu perfil aún" : "No visitors yet")}
                </p>
                <p className="text-xs text-muted text-center max-w-[220px]">
                  {currentLang === "es" ? "Empieza a descubrir perfiles para conseguir matches" : "Start discovering profiles to get matches"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {currentList.map((profile) => {
                  const hideReceivedDetails = activeTab === "received" && !isVip;
                  
                  return (
                    <div
                      key={profile.id}
                      className="relative rounded-[20px] overflow-hidden border border-white/10 shadow-lg bg-[#0D1530] group"
                      style={{ aspectRatio: "3/4" }}
                    >
                      {/* Photo */}
                      {profile.imageUrl ? (
                        <img
                          src={profile.imageUrl}
                          alt={profile.firstName}
                          className={`absolute inset-0 w-full h-full object-cover transition duration-300 ${
                            hideReceivedDetails ? "blur-md brightness-50" : ""
                          }`}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#151F3C] to-[#0A1128]">
                          <svg viewBox="0 0 100 100" className="w-20 h-20 text-primary/25">
                            <circle cx="50" cy="38" r="22" fill="currentColor" />
                            <path d="M16,90 C16,70 28,56 50,56 C72,56 84,70 84,90" fill="currentColor" />
                          </svg>
                        </div>
                      )}

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A1128] via-[#0A1128]/20 to-transparent" />

                      {/* VIP blurred cover / upgrade option */}
                      {hideReceivedDetails ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center space-y-3 z-10">
                          <span className="text-2xl">👑</span>
                          <p className="text-[10px] text-white font-bold leading-tight">
                            {currentLang === "es" ? "Mejora a VIP para ver su foto y conectar" : "Upgrade to VIP to view profile and connect"}
                          </p>
                          <Link
                            href={`/${currentLang}/vip`}
                            className="px-3 py-1.5 bg-gradient-to-r from-[#D4A373] to-[#FF6B8B] text-background text-[10px] font-black rounded-lg shadow-md hover:scale-105 active:scale-95 transition"
                          >
                            Activar VIP Gratis
                          </Link>
                        </div>
                      ) : (
                        /* Standard action overlay */
                        activeTab === "received" && (
                          <div className="absolute inset-0 backdrop-blur-sm bg-black/30 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button
                              onClick={() => handleLikeBack(profile)}
                              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl shadow-xl hover:scale-110 active:scale-95 transition"
                              style={{ background: "linear-gradient(135deg, #D4A373, #FF6B8B)" }}
                            >
                              ♥
                            </button>
                            <p className="text-[10px] text-white font-bold">
                              {currentLang === "es" ? "Conectar" : "Like back"}
                            </p>
                          </div>
                        )
                      )}

                      {/* Info */}
                      {!hideReceivedDetails && (
                        <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                          <p className="font-bold text-sm text-white">{profile.firstName}, {profile.age}</p>
                          <p className="text-[10px] text-white/70">📍 {profile.country}</p>
                          {dbMatches.some(m => m.id === profile.id) ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const m = dbMatches.find(m => m.id === profile.id);
                                if (m && m.conversationId) {
                                  router.push(`/${currentLang}/chat?conversationId=${m.conversationId}`);
                                }
                              }}
                              className="mt-1.5 w-full py-1 bg-gradient-to-r from-[#D4A373] to-[#FF6B8B] text-background text-[10px] font-black rounded-lg shadow-md flex items-center justify-center gap-1 hover:scale-105 transition"
                            >
                              💬 Enviar mensaje
                            </button>
                          ) : (
                            <>
                              {activeTab === "received" && (
                                <span className="inline-block mt-1 px-2 py-0.5 bg-[#FF6B8B]/25 text-[#FF6B8B] rounded-full text-[9px] font-bold">
                                  ♥ {currentLang === "es" ? "Le gustas" : "Likes you"}
                                </span>
                              )}
                              {activeTab === "visitors" && (
                                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-400/20 text-blue-400 rounded-full text-[9px] font-bold">
                                  👁️ {currentLang === "es" ? "Visitó tu perfil" : "Visited your profile"}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* Verified badge */}
                      {profile.verified && !hideReceivedDetails && (
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/50 backdrop-blur-sm rounded-full z-10">
                          <span className="text-primary text-[9px] font-bold">✓</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Match modal */}
      {matchedProfile && (
        <div className="fixed inset-0 z-50 bg-[#0A1128]/95 flex flex-col items-center justify-center p-6 text-center">
          <div className="relative z-10 space-y-5 max-w-xs w-full">
            <h1 className="text-5xl font-black text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #D4A373, #FF6B8B)" }}>
              MATCH!
            </h1>
            <p className="text-sm text-muted">
              {currentLang === "es" ? `¡Conectaste con ${matchedProfile.firstName}!` : `You matched with ${matchedProfile.firstName}!`}
            </p>
            <div className="flex justify-center gap-0 py-3">
              <div className="w-20 h-20 rounded-full border-4 border-primary bg-[#151F3C] overflow-hidden">
                {matchedProfile.imageUrl && <img src={getOptimizedSupabaseImageUrl(matchedProfile.imageUrl, 600, 800)} alt="" className="w-full h-full object-cover" />}
              </div>
            </div>
            <button
              onClick={() => { setMatchedProfile(null); router.push(`/${currentLang}/chat`); }}
              className="w-full py-4 font-bold rounded-2xl text-white text-sm shadow-md"
              style={{ background: "linear-gradient(135deg, #D4A373, #FF6B8B)" }}
            >
              💬 {currentLang === "es" ? "Chatear" : "Chat now"}
            </button>
            <button onClick={() => setMatchedProfile(null)} className="w-full py-3 bg-white/5 border border-white/10 text-muted rounded-2xl text-sm">
              {currentLang === "es" ? "Cerrar" : "Close"}
            </button>
          </div>
        </div>
      )}

      {/* Guest Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="glass max-w-sm w-full p-6 rounded-3xl border border-primary/20 text-center space-y-5">
            <span className="text-5xl block">💌</span>
            <h3 className="text-xl font-bold text-white">¡Descubre quién te dio like!</h3>
            <p className="text-xs text-muted leading-relaxed">
              Crea una cuenta para continuar. Podrás ver los likes recibidos, conectar al instante con perfiles reales y chatear de forma segura.
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
            <Link
              href={`/${currentLang}/dashboard`}
              className="text-xs text-muted hover:text-white underline font-medium block"
            >
              Seguir explorando perfiles
            </Link>
          </div>
        </div>
      )}

      <MobileBottomNav currentLang={currentLang} active="likes" />
    </div>
  );
}
