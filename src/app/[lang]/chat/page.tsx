"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Locale, getTranslation } from "../../../lib/i18n";
import { DatingProfile } from "../../../components/TinderCard";
import AppHeader from "../../../components/AppHeader";
import MobileBottomNav from "../../../components/MobileBottomNav";
import { supabase } from "../../../lib/supabase/client";

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

function ChatContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const targetConversationId = searchParams.get("conversationId");
  const currentLang = (params.lang as Locale) || "es";
  const t = getTranslation(currentLang);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [activeMatch, setActiveMatch] = useState<any | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typedMessage, setTypedMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showList, setShowList] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Guest State
  const [isGuest, setIsGuest] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);

  // Dropdown / Modal state
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Spam");
  const [reportDetails, setReportDetails] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);

      if (!currentSession) {
        setIsGuest(true);
        setShowAuthModal(true);
        setLoadingMatches(false);
        return;
      }

      const stored = localStorage.getItem("veloura_user");
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }

      // Fetch profile to verify VIP status
      try {
        const profileRes = await fetch("/api/profile", {
          headers: { "Authorization": `Bearer ${currentSession.access_token}` }
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setIsVip(profileData.subscription?.tier === "PREMIUM" && profileData.subscription?.isActive);
        }
      } catch (err) {
        console.error("Error reading VIP status in ChatPage:", err);
      }

      fetchMatches(currentSession);
    };

    init();
  }, [currentLang]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeMatch, isTyping]);

  // Auto-open chat if conversationId is provided in URL
  useEffect(() => {
    if (loadingMatches || matches.length === 0) return;
    if (targetConversationId) {
      const match = matches.find(m => m.conversationId === targetConversationId);
      if (match) {
        openChat(match);
      }
    }
  }, [loadingMatches, matches, targetConversationId]);

  const fetchMatches = async (currSession: any) => {
    try {
      setLoadingMatches(true);
      const res = await fetch("/api/matches", {
        headers: {
          "Authorization": `Bearer ${currSession.access_token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches || []);
      }
    } catch (err) {
      console.error("Error fetching matches:", err);
    } finally {
      setLoadingMatches(false);
    }
  };

  const openChat = async (match: any) => {
    setActiveMatch(match);
    setShowList(false);
    setShowMenu(false);
    fetchMessages(match.conversationId);
  };

  const fetchMessages = async (convId: string) => {
    if (!convId || !session) return;
    try {
      setLoadingMessages(true);
      const res = await fetch(`/api/messages?conversationId=${convId}`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !activeMatch || !currentUser || !session) return;

    const messageText = typedMessage.trim();
    setTypedMessage("");

    // optimistic update
    const tempId = `temp-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: tempId,
      senderId: currentUser.id,
      text: messageText,
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, newMsg]);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          conversationId: activeMatch.conversationId,
          text: messageText
        })
      });

      if (res.ok) {
        const data = await res.json();
        // replace temp message with real saved message
        setMessages((prev) => prev.map(m => m.id === tempId ? data.message : m));

        // If activeMatch is a mock user, trigger simulated response
        if (activeMatch.id.startsWith("mock-")) {
          triggerMockReply(activeMatch.id, activeMatch.conversationId);
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const triggerMockReply = (mockUserId: string, conversationId: string) => {
    setIsTyping(true);
    setTimeout(async () => {
      try {
        const replies = REPLIES[currentLang] || REPLIES.es;
        const text = replies[Math.floor(Math.random() * replies.length)];

        // We POST with mock sender ID to the server message endpoint.
        // The endpoint skips auth verification for mock-* senders.
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            conversationId,
            senderId: mockUserId,
            text
          })
        });

        if (res.ok) {
          const data = await res.json();
          setMessages((prev) => [...prev, data.message]);
        }
      } catch (err) {
        console.error("Error generating mock reply:", err);
      } finally {
        setIsTyping(false);
      }
    }, 1800 + Math.random() * 1000);
  };

  // 1. DELETE CHAT
  const handleDeleteChat = async () => {
    if (!activeMatch?.conversationId || !session) return;
    const confirmDelete = window.confirm(
      currentLang === "es"
        ? "¿Seguro que quieres borrar este chat? Esta acción eliminará todo el historial de mensajes de forma definitiva."
        : "Are you sure you want to delete this chat? This action will permanently remove all message history."
    );

    if (!confirmDelete) return;

    try {
      setIsDeletingChat(true);
      const res = await fetch(`/api/messages?conversationId=${activeMatch.conversationId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        alert(currentLang === "es" ? "Chat borrado correctamente." : "Chat deleted successfully.");
        setActiveMatch(null);
        setShowList(true);
        fetchMatches(session);
      } else {
        alert("Error al borrar el chat");
      }
    } catch (err) {
      console.error("Error deleting chat:", err);
      alert("Error al borrar el chat");
    } finally {
      setIsDeletingChat(false);
      setShowMenu(false);
    }
  };

  // 2. BLOCK USER
  const handleBlockUser = async () => {
    if (!activeMatch?.id || !session) return;
    const confirmBlock = window.confirm(
      currentLang === "es"
        ? `¿Seguro que quieres bloquear a ${activeMatch.firstName}? Ya no os veréis ni podréis chatear.`
        : `Are you sure you want to block ${activeMatch.firstName}? You will no longer see each other or be able to chat.`
    );

    if (!confirmBlock) return;

    try {
      setIsBlocking(true);
      const res = await fetch("/api/blocks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ blockedId: activeMatch.id })
      });

      if (res.ok) {
        alert(
          currentLang === "es"
            ? `${activeMatch.firstName} ha sido bloqueado/a.`
            : `${activeMatch.firstName} has been blocked.`
        );
        setActiveMatch(null);
        setShowList(true);
        fetchMatches(session);
      } else {
        alert("Error al bloquear usuario");
      }
    } catch (err) {
      console.error("Error blocking user:", err);
      alert("Error al bloquear usuario");
    } finally {
      setIsBlocking(false);
      setShowMenu(false);
    }
  };

  // 3. REPORT USER
  const handleReportUser = async () => {
    if (!activeMatch?.id || !session || !reportReason) return;
    try {
      setIsReporting(true);
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          reportedUserId: activeMatch.id,
          reason: reportReason,
          details: reportDetails
        })
      });

      if (res.ok) {
        alert(
          currentLang === "es"
            ? `Reporte enviado. Gracias por ayudarnos a mantener segura la comunidad.`
            : `Report submitted. Thank you for keeping the community safe.`
        );
        setShowReportModal(false);
        setReportDetails("");
        
        // Automatically block user after reporting them
        const blockRes = await fetch("/api/blocks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ blockedId: activeMatch.id })
        });

        if (blockRes.ok) {
          setActiveMatch(null);
          setShowList(true);
          fetchMatches(session);
        }
      } else {
        alert("Error al enviar reporte");
      }
    } catch (err) {
      console.error("Error reporting user:", err);
      alert("Error al enviar reporte");
    } finally {
      setIsReporting(false);
      setShowMenu(false);
    }
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
      />

      <main className="flex-1 overflow-hidden relative z-10 max-w-lg mx-auto w-full flex flex-col" style={{ paddingBottom: "80px" }}>
        {/* ── GUEST BLOCK SCREEN ── */}
        {isGuest ? (
          <div className="flex flex-col items-center justify-center flex-grow py-20 px-6 space-y-4 text-center">
            <span className="text-6xl">🔒</span>
            <h3 className="font-bold text-white text-lg">
              {currentLang === "es" ? "Inicia sesión para chatear" : "Log in to chat"}
            </h3>
            <p className="text-xs text-muted max-w-xs leading-relaxed">
              {currentLang === "es"
                ? "El chat seguro solo está disponible para usuarios registrados y verificados."
                : "Secure chat is only available for registered and verified users."}
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
            {/* ── CONVERSATION LIST ── */}
            {showList && (
              <div className="flex-1 overflow-y-auto">
                {loadingMatches ? (
                  <div className="flex flex-col items-center justify-center h-full py-20">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-muted mt-2">Cargando conversaciones...</p>
                  </div>
                ) : matches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-20 space-y-5 px-6 text-center">
                    <span className="text-5xl">💬</span>
                    <h3 className="font-bold text-white text-base">
                      {currentLang === "es" ? "Sin conversaciones aún" : "No conversations yet"}
                    </h3>
                    <p className="text-xs text-muted text-center max-w-xs leading-relaxed">
                      {currentLang === "es"
                        ? "Cuando consigas un match con alguien, tu conversación aparecerá aquí automáticamente."
                        : "Once you get a match, your conversation will appear here automatically."}
                    </p>
                    <Link
                      href={`/${currentLang}/dashboard`}
                      className="px-6 py-3 bg-gradient-to-r from-[#D4A373] to-[#FF6B8B] text-background font-black rounded-xl text-xs shadow-md transition hover:scale-105 active:scale-95"
                    >
                      {currentLang === "es" ? "Descubrir perfiles" : "Discover profiles"}
                    </Link>
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
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-bold text-sm text-white">
                                {m.firstName}, {m.age}
                                {m.verified && <span className="ml-1 text-primary text-[10px]">✓</span>}
                              </span>
                              <span className="text-[10px] text-muted shrink-0">
                                1h
                              </span>
                            </div>
                            <p className="text-xs text-muted truncate">📍 {m.city || m.country}</p>
                            <p className="text-[10px] text-primary mt-1">¡Chatea ahora!</p>
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
              <div className="flex flex-col flex-1 overflow-hidden relative">
                {/* Chat header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#0D1530]/80 backdrop-blur-sm relative z-20">
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
                  </div>

                  {/* 3-dots Menu Button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted hover:text-white transition shrink-0"
                    >
                      ⋮
                    </button>

                    {/* Dropdown Menu */}
                    {showMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-[#0D1530] border border-white/10 rounded-2xl shadow-xl py-2 z-50 animate-fade-in text-sm font-medium">
                        <button
                          onClick={handleDeleteChat}
                          disabled={isDeletingChat}
                          className="w-full px-4 py-2.5 text-left text-white hover:bg-white/5 transition flex items-center gap-2"
                        >
                          🗑️ {currentLang === "es" ? "Borrar chat" : "Delete chat"}
                        </button>
                        <button
                          onClick={handleBlockUser}
                          disabled={isBlocking}
                          className="w-full px-4 py-2.5 text-left text-red-400 hover:bg-white/5 transition flex items-center gap-2 border-t border-white/5"
                        >
                          🚫 {currentLang === "es" ? "Bloquear" : "Block user"}
                        </button>
                        <button
                          onClick={() => { setShowReportModal(true); setShowMenu(false); }}
                          className="w-full px-4 py-2.5 text-left text-yellow-400 hover:bg-white/5 transition flex items-center gap-2 border-t border-white/5"
                        >
                          ⚠️ {currentLang === "es" ? "Reportar" : "Report user"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Messages Panel */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 relative z-10">
                  {loadingMessages ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-[10px] text-muted mt-1.5">Cargando historial...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-10 px-6">
                      <p className="text-xs text-muted leading-relaxed">
                        Conexión establecida de forma segura. Escribe un mensaje para romper el hielo.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
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
                            <span className="block text-[8px] text-right mt-1 opacity-60">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}

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

                {/* Input Panel */}
                <form onSubmit={handleSend} className="flex gap-2 px-4 py-3 border-t border-white/10 bg-[#0D1530]/80 backdrop-blur-sm relative z-20">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isVip) {
                        setShowVipModal(true);
                      } else {
                        alert(currentLang === "es" ? "La subida de archivos VIP estará disponible próximamente." : "VIP media uploads will be available soon.");
                      }
                    }}
                    className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-muted hover:bg-white/10 transition text-base"
                  >
                    🖼️
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isVip) {
                        setShowVipModal(true);
                      } else {
                        alert(currentLang === "es" ? "La grabación de audio VIP estará disponible próximamente." : "VIP audio recording will be available soon.");
                      }
                    }}
                    className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-muted hover:bg-white/10 transition text-base"
                  >
                    🎙️
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
          </>
        )}
      </main>

      {/* ── REPORT MODAL ── */}
      {showReportModal && activeMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="glass max-w-sm w-full p-6 rounded-3xl border border-yellow-500/20 space-y-4">
            <h3 className="text-lg font-bold text-white text-center">⚠️ Reportar a {activeMatch.firstName}</h3>
            <p className="text-xs text-muted text-center">
              Tu reporte será revisado de forma anónima por el equipo de moderación en un plazo de 24 horas.
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-muted mb-1">Motivo del reporte</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A1128] border border-white/10 rounded-xl text-white text-xs"
                >
                  <option value="Spam">Spam / Publicidad</option>
                  <option value="Comportamiento inadecuado">Comportamiento inapropiado</option>
                  <option value="Falso perfil">Perfil falso / Mock</option>
                  <option value="Acoso">Acoso o amenazas</option>
                  <option value="Otro">Otro motivo</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-muted mb-1">Detalles adicionales (opcional)</label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[#0A1128] border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-primary"
                  placeholder="Por favor, describe brevemente qué ha ocurrido..."
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleReportUser}
                disabled={isReporting}
                className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-xl text-center text-xs shadow-md transition disabled:opacity-50"
              >
                {isReporting ? "Enviando..." : "Enviar Reporte"}
              </button>
              <button
                onClick={() => setShowReportModal(false)}
                disabled={isReporting}
                className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl text-center text-xs transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GUEST AUTH MODAL ── */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="glass max-w-sm w-full p-6 rounded-3xl border border-primary/20 text-center space-y-5">
            <span className="text-5xl block">💬</span>
            <h3 className="text-xl font-bold text-white">¡Conecta con otros!</h3>
            <p className="text-xs text-muted leading-relaxed">
              Crea una cuenta para continuar. Podrás chatear de forma segura, ver quién te dio like y activar funciones VIP de forma gratuita.
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

      {/* ── VIP MULTIMEDIA MODAL ── */}
      {showVipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="glass max-w-sm w-full p-6 rounded-3xl border border-primary/20 text-center space-y-5">
            <span className="text-5xl block">👑</span>
            <h3 className="text-xl font-bold text-white">
              {currentLang === "es" ? "Función VIP requerida" : "VIP Feature Required"}
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              {currentLang === "es"
                ? "Los mensajes multimedia estarán disponibles en VIP. Envía fotos, audios y vídeos ilimitados activando la membresía gratis."
                : "Multimedia messages are only available for VIP members. Send unlimited photos, voice notes, and videos by activating the free membership."}
            </p>
            <div className="flex flex-col gap-2.5">
              <Link
                href={`/${currentLang}/vip`}
                className="w-full py-3 bg-premium-gold text-background font-bold rounded-xl text-center text-sm shadow-md"
                onClick={() => setShowVipModal(false)}
              >
                {currentLang === "es" ? "Conseguir VIP Gratis" : "Get Free VIP"}
              </Link>
              <button
                onClick={() => setShowVipModal(false)}
                className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl text-center text-sm"
              >
                {currentLang === "es" ? "Cerrar" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileBottomNav currentLang={currentLang} active="chat" />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-background text-foreground flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
