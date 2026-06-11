"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Locale, getTranslation } from "../../../lib/i18n";
import { DatingProfile } from "../../../components/TinderCard";
import { mockProfiles } from "../../../lib/mockData";
import AppHeader from "../../../components/AppHeader";
import MobileBottomNav from "../../../components/MobileBottomNav";

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

const REPLIES: Record<string, string[]> = {
  es: [
    "¡Qué bien! Me alegra que me respondas. ¿Cuándo vienes de visita? 😊",
    "Me gusta mucho tu perfil. ¿Qué planes tienes para el fin de semana?",
    "¡Suena interesante! Yo estoy libre hoy por la tarde.",
    "Qué lindo detalle. Me gustaría practicar español contigo 🇪🇸",
    "Claro, cuéntame más sobre ti. Tengo mucha curiosidad.",
  ],
  en: [
    "That sounds great! What are you up to today? 😊",
    "I really like your vibe. Let's exchange languages sometime!",
    "Are you planning to travel soon?",
    "I'd love to chat more. Tell me about your city!",
    "Sounds fun! Let's plan something together.",
  ],
  ru: [
    "Как здорово! Я рада нашему общению. Расскажи подробнее о себе. 😊",
    "Мне очень нравится твой профиль! Чем занимаешься сегодня?",
    "Отличный день! Надеюсь, у тебя тоже все хорошо.",
    "Давай созвонимся когда-нибудь! Желаю отличного настроения.",
    "Здорово! Расскажи о своем городе, мне очень интересно.",
  ],
};

export default function ChatPage() {
  const params = useParams();
  const currentLang = (params.lang as Locale) || "es";
  const t = getTranslation(currentLang);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [matches, setMatches] = useState<DatingProfile[]>([]);
  const [activeMatch, setActiveMatch] = useState<DatingProfile | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [typedMessage, setTypedMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showList, setShowList] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("veloura_user");
    if (!stored) { window.location.href = `/${currentLang}/login`; return; }
    setCurrentUser(JSON.parse(stored));

    const storedMatches: DatingProfile[] = JSON.parse(localStorage.getItem("veloura_matches") || "[]");
    // If no matches yet, use first 2 mock profiles as demo chats
    const chatList = storedMatches.length > 0 ? storedMatches : mockProfiles.slice(0, 2);
    setMatches(chatList);

    const initMsgs: Record<string, ChatMessage[]> = {};
    chatList.forEach((m: DatingProfile) => {
      initMsgs[m.id] = [
        {
          id: `init-${m.id}`,
          senderId: m.id,
          text: currentLang === "ru"
            ? `Привет! Рада познакомиться с тобой. Как дела? 😊`
            : currentLang === "es"
            ? `¡Hola! Estoy muy contenta de conectar contigo. ¿Cómo estás? 😊`
            : `Hi there! Really happy to connect with you. How are you? 😊`,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ];
    });
    setMessages(initMsgs);
  }, [currentLang]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeMatch]);

  const openChat = (match: DatingProfile) => {
    setActiveMatch(match);
    setShowList(false);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !activeMatch || !currentUser) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      text: typedMessage.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => ({
      ...prev,
      [activeMatch.id]: [...(prev[activeMatch.id] || []), newMsg],
    }));
    setTypedMessage("");

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const replies = REPLIES[currentLang] || REPLIES.es;
      const reply: ChatMessage = {
        id: `reply-${Date.now()}`,
        senderId: activeMatch.id,
        text: replies[Math.floor(Math.random() * replies.length)],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => ({
        ...prev,
        [activeMatch.id]: [...(prev[activeMatch.id] || []), reply],
      }));
    }, 1800 + Math.random() * 1000);
  };

  const activeMessages = activeMatch ? messages[activeMatch.id] || [] : [];

  const getLastMessage = (id: string) => {
    const msgs = messages[id];
    if (!msgs || msgs.length === 0) return "";
    return msgs[msgs.length - 1].text;
  };

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <div className="fixed top-0 right-0 w-[40%] h-[40%] bg-[#D4A373]/5 blur-[100px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[40%] h-[40%] bg-[#FF6B8B]/5 blur-[100px] rounded-full pointer-events-none z-0" />

      <AppHeader
        currentLang={currentLang}
        title={activeMatch && !showList
          ? activeMatch.firstName
          : (currentLang === "es" ? "Chats" : (currentLang === "ru" ? "Сообщения" : "Chats"))}
        showBackTo={activeMatch && !showList ? undefined : undefined}
      />

      <main className="flex-1 overflow-hidden relative z-10 max-w-lg mx-auto w-full flex flex-col" style={{ paddingBottom: "80px" }}>
        {/* ── CONVERSATION LIST ── */}
        {showList && (
          <div className="flex-1 overflow-y-auto">
            {matches.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-20 space-y-4 px-6">
                <span className="text-5xl">💬</span>
                <h3 className="font-bold text-white text-base">
                  {currentLang === "es" ? "Sin conversaciones aún" : "No conversations yet"}
                </h3>
                <p className="text-xs text-muted text-center">
                  {currentLang === "es" ? "Cuando consigas un match, podréis chatear aquí." : "Once you get a match, you can chat here."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {matches.map((m) => (
                  <li key={m.id}>
                    <button
                      onClick={() => openChat(m)}
                      className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/3 transition text-left"
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-[#151F3C] border-2 border-primary/20">
                          {m.imageUrl ? (
                            <img src={m.imageUrl} alt={m.firstName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg viewBox="0 0 100 100" className="w-8 h-8 text-primary/40">
                                <circle cx="50" cy="38" r="22" fill="currentColor" />
                                <path d="M16,90 C16,70 28,56 50,56 C72,56 84,70 84,90" fill="currentColor" />
                              </svg>
                            </div>
                          )}
                        </div>
                        {/* Online dot */}
                        <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-bold text-sm text-white">
                            {m.firstName}, {m.age}
                            {m.verified && <span className="ml-1 text-primary text-[10px]">✓</span>}
                          </span>
                          <span className="text-[10px] text-muted shrink-0">
                            {currentLang === "es" ? "hace 1h" : "1h ago"}
                          </span>
                        </div>
                        <p className="text-xs text-muted truncate">{getLastMessage(m.id)}</p>
                        <p className="text-[10px] text-muted/60 mt-0.5">📍 {m.country}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── ACTIVE CHAT ── */}
        {!showList && activeMatch && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#0D1530]/80 backdrop-blur-sm">
              <button
                onClick={() => { setShowList(true); setActiveMatch(null); }}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-muted hover:text-white transition shrink-0"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="w-10 h-10 rounded-full overflow-hidden bg-[#151F3C] border border-primary/20 shrink-0">
                {activeMatch.imageUrl ? (
                  <img src={activeMatch.imageUrl} alt={activeMatch.firstName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-6 h-6 text-primary/40">
                      <circle cx="50" cy="38" r="22" fill="currentColor" />
                      <path d="M16,90 C16,70 28,56 50,56 C72,56 84,70 84,90" fill="currentColor" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-white truncate">
                  {activeMatch.firstName}
                  {activeMatch.verified && <span className="ml-1 text-primary text-[10px]">✓</span>}
                </p>
                <p className="text-[10px] text-green-400 font-medium">● {t("chat.online")}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {activeMessages.map((msg) => {
                const isMine = currentUser && msg.senderId === currentUser.id;
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    {!isMine && (
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-[#151F3C] border border-primary/20 mr-2 shrink-0 self-end">
                        {activeMatch.imageUrl ? (
                          <img src={activeMatch.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center text-[8px] text-primary">👤</div>
                        )}
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        isMine
                          ? "text-background rounded-tr-none"
                          : "bg-[#151F3C] text-white rounded-tl-none border border-white/5"
                      }`}
                      style={isMine ? { background: "linear-gradient(135deg, #D4A373, #FF6B8B)" } : {}}
                    >
                      <p>{msg.text}</p>
                      <span className="block text-[9px] text-right mt-1 opacity-60">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {isMine && " ✓✓"}
                      </span>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex justify-start items-end gap-2">
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-[#151F3C] border border-primary/20 shrink-0">
                    {activeMatch.imageUrl && <img src={activeMatch.imageUrl} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="bg-[#151F3C] border border-white/5 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="flex gap-2 px-4 py-3 border-t border-white/10 bg-[#0D1530]/80 backdrop-blur-sm">
              <button type="button" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-muted hover:bg-white/10 transition text-base">
                🖼️
              </button>
              <input
                type="text"
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-[#0A1128] border border-primary/20 focus:border-primary focus:outline-none rounded-2xl text-white text-sm"
                placeholder={t("chat.placeholder")}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={!typedMessage.trim()}
                className="w-10 h-10 rounded-full flex items-center justify-center text-background font-bold disabled:opacity-40 transition hover:scale-105"
                style={{ background: "linear-gradient(135deg, #D4A373, #FF6B8B)" }}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        )}
      </main>

      <MobileBottomNav currentLang={currentLang} active="chat" />
    </div>
  );
}
