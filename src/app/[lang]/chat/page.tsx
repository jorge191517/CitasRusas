"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Locale, getTranslation } from "../../../lib/i18n";
import LanguageSwitcher from "../../../components/LanguageSwitcher";
import { DatingProfile } from "../../../components/TinderCard";
import { supabase } from "../../../lib/supabase/client";

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const currentLang = (params.lang as Locale) || "es";
  const t = getTranslation(currentLang);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error signing out:", err);
    }
    document.cookie = "veloura-auth-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    localStorage.removeItem("veloura_user");
    window.location.href = `/${currentLang}/login`;
  };

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [matches, setMatches] = useState<DatingProfile[]>([]);
  const [activeMatch, setActiveMatch] = useState<DatingProfile | null>(null);
  
  // Chat dialogue state
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [typedMessage, setTypedMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("veloura_user");
    if (!storedUser) {
      router.push(`/${currentLang}/login`);
      return;
    }
    setCurrentUser(JSON.parse(storedUser));

    // Load matched profiles from LocalStorage
    const storedMatches = JSON.parse(localStorage.getItem("veloura_matches") || "[]");
    setMatches(storedMatches);

    // Initial base messages setup for testing
    const initialMsgs: Record<string, ChatMessage[]> = {};
    storedMatches.forEach((m: DatingProfile) => {
      initialMsgs[m.id] = [
        {
          id: `msg-init-${m.id}`,
          senderId: m.id,
          text: `Привет! ¡Hola! Nice to connect with you. How are you doing? 😊`,
          createdAt: new Date(Date.now() - 3600000).toISOString()
        }
      ];
    });
    setMessages(initialMsgs);
  }, [currentLang, router]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeMatch]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !activeMatch || !currentUser) return;

    const matchId = activeMatch.id;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      text: typedMessage,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => ({
      ...prev,
      [matchId]: [...(prev[matchId] || []), newMsg]
    }));
    
    setTypedMessage("");

    // Simulate other user typing indicator and reply
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const replyMsg: ChatMessage = {
        id: `msg-reply-${Date.now()}`,
        senderId: matchId,
        text: getRandomReply(activeMatch.firstName, currentLang),
        createdAt: new Date().toISOString()
      };

      setMessages((prev) => ({
        ...prev,
        [matchId]: [...(prev[matchId] || []), replyMsg]
      }));
    }, 2000);
  };

  const getRandomReply = (name: string, lang: string) => {
    const repliesEs = [
      "¡Qué bien! Me alegra que me respondas. ¿Cuándo vienes de visita?",
      "Me gusta mucho tu perfil. ¿Qué planes tienes para el fin de semana?",
      "¡Suena interesante! Yo estoy libre hoy por la tarde.",
      "Qué lindo detalle. Me gustaría mucho practicar español contigo 🇪🇸"
    ];
    
    const repliesEn = [
      "That sounds great! What are you up to today?",
      "I really like your vibe. Let's exchange languages sometime!",
      "Are you planning to travel soon?",
      "I'd love to chat more. Tell me about your city!"
    ];

    const repliesRu = [
      "Как здорово! Я рада нашему общению. Расскажи подробнее о себе.",
      "Мне очень нравится твой профиль! Чем занимаешься сегодня?",
      "Отличный день! Надеюсь, у тебя тоже все хорошо.",
      "Давай созвонимся когда-нибудь! Желаю отличного настроения."
    ];

    const list = lang === "es" ? repliesEs : lang === "ru" ? repliesRu : repliesEn;
    return list[Math.floor(Math.random() * list.length)];
  };

  const activeMessages = activeMatch ? messages[activeMatch.id] || [] : [];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-[#D4A373]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-[#FF6B8B]/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Main Header / Navigation */}
      <header className="w-full glass border-b border-primary/10 px-6 py-4 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4 sm:space-x-6">
            {/* Volver button */}
            <Link
              href={`/${currentLang}/dashboard`}
              className="px-3.5 py-1.5 text-xs font-bold bg-[#151F3C]/80 border border-primary/20 hover:border-primary/40 text-primary rounded-full transition shadow-md shrink-0"
            >
              ← {t("common.back")}
            </Link>

            <Link href={`/${currentLang}/dashboard`} className="flex items-center space-x-2">
              <svg viewBox="0 0 512 512" className="w-8 h-8 text-primary" fill="currentColor">
                <path d="M256,120 C230,80 180,80 150,110 C120,140 120,190 150,220 L256,330 L362,220 C392,190 392,140 362,110 C332,80 282,80 256,120 Z" fill="none" stroke="currentColor" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M256,170 C240,140 200,140 180,160 C160,180 160,210 180,230 L256,305 L332,230 C352,210 352,180 332,160 C312,140 272,140 256,170 Z" fill="none" stroke="#FF6B8B" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span className="text-lg font-bold tracking-widest text-primary font-serif hidden md:inline-block">VELOURA</span>
            </Link>
            
            {/* Nav Tabs */}
            <nav className="flex space-x-2 sm:space-x-4 text-xs sm:text-sm font-semibold">
              <Link href={`/${currentLang}/dashboard`} className="text-muted hover:text-white transition">
                {currentLang === "es" ? "Inicio" : (currentLang === "ru" ? "Главная" : "Home")}
              </Link>
              <Link href={`/${currentLang}/chat`} className="text-primary border-b-2 border-primary pb-1">
                {currentLang === "es" ? "Chat" : (currentLang === "ru" ? "Чат" : "Chat")}
              </Link>
              <Link href={`/${currentLang}/profile`} className="text-muted hover:text-white transition">
                {currentLang === "es" ? "Perfil" : (currentLang === "ru" ? "Профиль" : "Profile")}
              </Link>
              {currentUser?.role === "ADMIN" && (
                <Link href={`/${currentLang}/admin`} className="text-secondary hover:text-white transition">
                  🛡️ Admin
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <LanguageSwitcher currentLang={currentLang} />
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 bg-red-600/20 border border-red-500/30 hover:bg-red-600/35 text-red-400 text-xs font-semibold rounded-full transition"
            >
              {currentLang === "es" ? "Salir" : (currentLang === "ru" ? "Выйти" : "Logout")}
            </button>
          </div>
        </div>
      </header>

      {/* Chat workspace grid */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-8 flex flex-col md:flex-row gap-6 z-10 overflow-hidden">
        {/* Left matches column */}
        <div className="w-full md:w-80 glass border border-primary/10 rounded-3xl p-4 flex flex-col space-y-4">
          <h2 className="text-lg font-bold text-white tracking-wide border-b border-white/5 pb-2">Matches ♥</h2>
          
          <div className="flex-grow overflow-y-auto space-y-2 max-h-[300px] md:max-h-full">
            {matches.length === 0 ? (
              <p className="text-xs text-muted text-center py-12">
                Sin matches todavía. ¡Empieza a buscar perfiles en el Discover deck!
              </p>
            ) : (
              matches.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActiveMatch(m)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                    activeMatch?.id === m.id
                      ? "bg-primary/10 border-primary"
                      : "bg-[#0A1128]/50 border-white/5 hover:border-primary/40"
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-card border border-primary/20 flex items-center justify-center overflow-hidden shrink-0 relative">
                    {m.imageUrl ? (
                      <img src={m.imageUrl} alt={m.firstName} className="w-full h-full object-cover" />
                    ) : (
                      <svg viewBox="0 0 100 100" className="w-8 h-8 text-primary">
                        <circle cx="50" cy="40" r="20" fill="currentColor" />
                        <path d="M20,85 C20,70 30,60 50,60 C70,60 80,70 80,85" fill="currentColor" />
                      </svg>
                    )}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                      {m.firstName}, {m.age}
                      {m.verified && <span className="text-[10px] text-primary">✓</span>}
                    </h4>
                    <p className="text-[11px] text-muted line-clamp-1">{m.city}, {m.country}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right chat dialogue window */}
        <div className="flex-grow glass border border-primary/10 rounded-3xl p-4 flex flex-col justify-between min-h-[400px]">
          {activeMatch ? (
            <>
              {/* Active Match Header Info */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-card border border-primary/20 overflow-hidden flex items-center justify-center relative">
                    {activeMatch.imageUrl ? (
                      <img src={activeMatch.imageUrl} alt={activeMatch.firstName} className="w-full h-full object-cover" />
                    ) : (
                      <svg viewBox="0 0 100 100" className="w-6 h-6 text-primary">
                        <circle cx="50" cy="40" r="20" fill="currentColor" />
                        <path d="M20,85 C20,70 30,60 50,60 C70,60 80,70 80,85" fill="currentColor" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-white flex items-center gap-1.5 text-sm">
                      {activeMatch.firstName} {activeMatch.lastName}
                      {activeMatch.verified && <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[8px] font-bold rounded">VERIFIED</span>}
                    </h3>
                    <p className="text-[10px] text-green-400 font-medium">● {t("chat.online")}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-xs text-primary" title="Call - TODO">📞</button>
                  <button className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-xs text-secondary" title="Video call - TODO">📹</button>
                </div>
              </div>

              {/* Message Streams */}
              <div className="flex-grow overflow-y-auto my-4 space-y-3 px-2 max-h-[350px]">
                {activeMessages.map((msg) => {
                  const isMine = currentUser && msg.senderId === currentUser.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs font-medium shadow-sm leading-relaxed ${
                          isMine
                            ? "bg-premium-gold text-background rounded-tr-none"
                            : "bg-[#151F3C] text-white rounded-tl-none border border-white/5"
                        }`}
                      >
                        <p>{msg.text}</p>
                        <span className={`block text-[9px] text-right mt-1 opacity-70`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-[#151F3C] text-muted text-xs font-semibold px-4 py-2.5 rounded-2xl rounded-tl-none italic animate-pulse">
                      {activeMatch.firstName} is {t("chat.typing")}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Typing Box */}
              <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-white/5">
                <input
                  type="text"
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  className="flex-grow px-4 py-3 bg-[#0A1128] border border-primary/20 focus:border-primary focus:outline-none rounded-xl text-white text-xs"
                  placeholder={t("chat.placeholder")}
                />
                
                {/* Media Attachment Placeholders */}
                <button
                  type="button"
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs"
                  title="Attach Photo (TODO)"
                >
                  🖼️
                </button>
                <button
                  type="button"
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs"
                  title="Send Audio (TODO)"
                >
                  🎙️
                </button>

                <button
                  type="submit"
                  className="px-6 bg-premium-gold text-background font-bold rounded-xl text-xs hover:opacity-90 transition shadow-md"
                >
                  {t("common.send")}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center space-y-3 text-center">
              <span className="text-4xl">💬</span>
              <h3 className="font-bold text-white">{t("chat.title")}</h3>
              <p className="text-xs text-muted max-w-xs">{t("chat.noMessages")}</p>
            </div>
          )}
        </div>
      </main>

      {/* Basic Tab Bar for Mobile App Viewports */}
      <footer className="w-full glass border-t border-primary/10 p-2 sm:hidden z-20">
        <div className="flex justify-around text-muted text-xs">
          <Link href={`/${currentLang}/dashboard`} className="flex flex-col items-center py-1">
            <span>🎴</span>
            <span>{currentLang === "es" ? "Inicio" : (currentLang === "ru" ? "Главная" : "Home")}</span>
          </Link>
          <Link href={`/${currentLang}/chat`} className="flex flex-col items-center py-1 text-primary">
            <span>💬</span>
            <span>{currentLang === "es" ? "Chat" : (currentLang === "ru" ? "Чат" : "Chat")}</span>
          </Link>
          <Link href={`/${currentLang}/profile`} className="flex flex-col items-center py-1">
            <span>👤</span>
            <span>{currentLang === "es" ? "Perfil" : (currentLang === "ru" ? "Профиль" : "Profile")}</span>
          </Link>
          <button onClick={handleLogout} className="flex flex-col items-center py-1 text-red-400">
            <span>🚪</span>
            <span>{currentLang === "es" ? "Salir" : (currentLang === "ru" ? "Выйти" : "Logout")}</span>
          </button>
        </div>
      </footer>

      <footer className="w-full py-6 text-center text-xs text-muted border-t border-white/5 bg-background relative z-10 hidden sm:block">
        <p>© 2026 Veloura Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
