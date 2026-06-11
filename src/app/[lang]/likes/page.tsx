"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Locale, getTranslation } from "../../../lib/i18n";
import { DatingProfile } from "../../../components/TinderCard";
import { mockProfiles } from "../../../lib/mockData";
import AppHeader from "../../../components/AppHeader";
import MobileBottomNav from "../../../components/MobileBottomNav";

interface LikedProfile extends DatingProfile {
  likedAt: string;
  type: "received" | "sent" | "visitor";
}

export default function LikesPage() {
  const params = useParams();
  const currentLang = (params.lang as Locale) || "es";
  const t = getTranslation(currentLang);

  const [activeTab, setActiveTab] = useState<"received" | "sent" | "visitors">("received");
  const [receivedLikes, setReceivedLikes] = useState<DatingProfile[]>([]);
  const [sentLikes, setSentLikes] = useState<DatingProfile[]>([]);
  const [visitors, setVisitors] = useState<DatingProfile[]>([]);
  const [matchedProfile, setMatchedProfile] = useState<DatingProfile | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("veloura_user");
    if (!stored) {
      window.location.href = `/${currentLang}/login`;
      return;
    }

    // Simulate received likes from mock profiles (random 5)
    const shuffled = [...mockProfiles].sort(() => Math.random() - 0.5);
    setReceivedLikes(shuffled.slice(0, 5));

    // Sent likes from localStorage
    const likedIds: string[] = JSON.parse(localStorage.getItem("veloura_likes") || "[]");
    const sent = mockProfiles.filter(p => likedIds.includes(p.id));
    setSentLikes(sent);

    // Visitors: random 4 profiles
    setVisitors(shuffled.slice(5, 9));
  }, [currentLang]);

  const handleLikeBack = (profile: DatingProfile) => {
    setMatchedProfile(profile);
    const existingMatches = JSON.parse(localStorage.getItem("veloura_matches") || "[]");
    if (!existingMatches.some((m: any) => m.id === profile.id)) {
      localStorage.setItem("veloura_matches", JSON.stringify([...existingMatches, profile]));
    }
  };

  const tabLabel = {
    received: currentLang === "es" ? "Me gustas" : (currentLang === "ru" ? "Лайки" : "Likes"),
    sent: currentLang === "es" ? "Mis likes" : (currentLang === "ru" ? "Мои лайки" : "My likes"),
    visitors: currentLang === "es" ? "Visitantes" : (currentLang === "ru" ? "Посетители" : "Visitors"),
  };

  const currentList = activeTab === "received" ? receivedLikes : activeTab === "sent" ? sentLikes : visitors;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <div className="fixed top-0 right-0 w-[50%] h-[50%] bg-[#D4A373]/5 blur-[130px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[50%] h-[50%] bg-[#FF6B8B]/5 blur-[130px] rounded-full pointer-events-none" />

      <AppHeader
        currentLang={currentLang}
        title={currentLang === "es" ? "Me gusta" : (currentLang === "ru" ? "Лайки" : "Likes")}
      />

      <main className="flex-grow max-w-lg mx-auto w-full px-4 pt-4 pb-28 relative z-10">
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

        {/* Content */}
        {currentList.length === 0 ? (
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
            {currentList.map((profile) => (
              <div
                key={profile.id}
                className="relative rounded-[20px] overflow-hidden border border-white/10 shadow-lg bg-[#0D1530] group"
                style={{ aspectRatio: "3/4" }}
              >
                {/* Photo */}
                {profile.imageUrl ? (
                  <img src={profile.imageUrl} alt={profile.firstName} className="absolute inset-0 w-full h-full object-cover" />
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

                {/* Blur for non-received on free tier */}
                {activeTab === "received" && (
                  <div className="absolute inset-0 backdrop-blur-sm bg-black/30 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleLikeBack(profile)}
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl shadow-xl"
                      style={{ background: "linear-gradient(135deg, #D4A373, #FF6B8B)" }}
                    >
                      ♥
                    </button>
                    <p className="text-[10px] text-white font-bold">
                      {currentLang === "es" ? "Dar like" : "Like back"}
                    </p>
                  </div>
                )}

                {/* Info */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="font-bold text-sm text-white">{profile.firstName}, {profile.age}</p>
                  <p className="text-[10px] text-white/70">📍 {profile.country}</p>
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
                </div>

                {/* Verified badge */}
                {profile.verified && (
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/50 backdrop-blur-sm rounded-full">
                    <span className="text-primary text-[9px] font-bold">✓</span>
                  </div>
                )}
              </div>
            ))}
          </div>
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
                {matchedProfile.imageUrl && <img src={matchedProfile.imageUrl} alt="" className="w-full h-full object-cover" />}
              </div>
            </div>
            <button
              onClick={() => { setMatchedProfile(null); window.location.href = `/${currentLang}/chat`; }}
              className="w-full py-4 font-bold rounded-2xl text-white text-sm"
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

      <MobileBottomNav currentLang={currentLang} active="likes" />
    </div>
  );
}
