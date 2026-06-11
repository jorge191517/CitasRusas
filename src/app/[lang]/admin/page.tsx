"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Locale, getTranslation } from "../../../lib/i18n";
import LanguageSwitcher from "../../../components/LanguageSwitcher";
import { supabase } from "../../../lib/supabase/client";

interface ModerationReport {
  id: string;
  reporterName: string;
  reportedName: string;
  reason: string;
  details: string;
  createdAt: string;
}

interface VerificationRequest {
  id: string;
  userName: string;
  country: string;
  selfieUrl: string;
  documentUrl: string;
}

export default function AdminPage() {
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
  
  // Mock Admin States
  const [reports, setReports] = useState<ModerationReport[]>([
    {
      id: "report-101",
      reporterName: "Carlos Gómez",
      reportedName: "Fake Profile Elena",
      reason: "Perfiles falsos / Spam",
      details: "Utiliza fotos de stock de internet y envía enlaces sospechosos por chat.",
      createdAt: "2026-06-10"
    },
    {
      id: "report-102",
      reporterName: "Svetlana Smirnova",
      reportedName: "Dmitry Ivanov",
      reason: "Lenguaje inapropiado",
      details: "Insultos reiterados tras el match.",
      createdAt: "2026-06-09"
    }
  ]);

  const [verifications, setVerifications] = useState<VerificationRequest[]>([
    {
      id: "verif-201",
      userName: "Olga Kovalenko",
      country: "Ucrania",
      selfieUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
      documentUrl: "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=150"
    }
  ]);

  useEffect(() => {
    const storedUser = localStorage.getItem("veloura_user");
    if (!storedUser) {
      router.push(`/${currentLang}/login`);
      return;
    }
    const userObj = JSON.parse(storedUser);
    setCurrentUser(userObj);

    if (userObj.role !== "ADMIN") {
      // Access protection
      router.push(`/${currentLang}/dashboard`);
    }

    // Dynamic verification check: if current user requested verification, add it here for testing!
    if (userObj.profile?.verifiedStatus === "PENDING") {
      setVerifications((prev) => [
        ...prev,
        {
          id: `verif-user-${userObj.id}`,
          userName: `${userObj.profile.firstName} ${userObj.profile.lastName}`,
          country: userObj.profile.country,
          selfieUrl: userObj.profile.photos?.[0] || "",
          documentUrl: ""
        }
      ]);
    }
  }, [currentLang, router]);

  const handleApproveVerification = (id: string) => {
    setVerifications(verifications.filter((v) => v.id !== id));
    
    // If it's the current user, update local storage status to VERIFIED!
    if (currentUser && id === `verif-user-${currentUser.id}`) {
      const updatedUser = {
        ...currentUser,
        profile: {
          ...currentUser.profile,
          verifiedStatus: "VERIFIED"
        }
      };
      localStorage.setItem("veloura_user", JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
    }
  };

  const handleRejectVerification = (id: string) => {
    setVerifications(verifications.filter((v) => v.id !== id));
    
    if (currentUser && id === `verif-user-${currentUser.id}`) {
      const updatedUser = {
        ...currentUser,
        profile: {
          ...currentUser.profile,
          verifiedStatus: "REJECTED"
        }
      };
      localStorage.setItem("veloura_user", JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
    }
  };

  const handleResolveReport = (id: string) => {
    setReports(reports.filter((r) => r.id !== id));
  };

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
              <Link href={`/${currentLang}/chat`} className="text-muted hover:text-white transition">
                {currentLang === "es" ? "Chat" : (currentLang === "ru" ? "Чат" : "Chat")}
              </Link>
              <Link href={`/${currentLang}/profile`} className="text-muted hover:text-white transition">
                {currentLang === "es" ? "Perfil" : (currentLang === "ru" ? "Профиль" : "Profile")}
              </Link>
              <Link href={`/${currentLang}/admin`} className="text-primary border-b-2 border-primary pb-1">
                🛡️ Admin
              </Link>
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

      {/* Admin dashboard panels */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-8 space-y-8 z-10">
        
        {/* Statistics Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass p-6 rounded-2xl border border-primary/20 flex flex-col justify-between">
            <h3 className="text-muted text-xs font-bold uppercase tracking-wider">{t("admin.users")}</h3>
            <p className="text-4xl font-extrabold text-white mt-2">1,248</p>
            <span className="text-xs text-green-400 mt-2">↑ 12% este mes</span>
          </div>
          <div className="glass p-6 rounded-2xl border border-primary/20 flex flex-col justify-between">
            <h3 className="text-muted text-xs font-bold uppercase tracking-wider">{t("admin.active")}</h3>
            <p className="text-4xl font-extrabold text-white mt-2">342</p>
            <span className="text-xs text-green-400 mt-2">Activos en las últimas 24h</span>
          </div>
          <div className="glass p-6 rounded-2xl border border-primary/20 flex flex-col justify-between">
            <h3 className="text-muted text-xs font-bold uppercase tracking-wider">Conversión Premium</h3>
            <p className="text-4xl font-extrabold text-primary mt-2">18.4%</p>
            <span className="text-xs text-[#FF6B8B] mt-2">Stripe Checkout OK</span>
          </div>
        </div>

        {/* Content Moderation Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Identity Verifications list */}
          <div className="glass p-6 rounded-3xl border border-primary/10 space-y-4">
            <h2 className="text-xl font-bold text-white tracking-wide border-b border-white/5 pb-2">
              🛡️ {t("admin.verifications")} ({verifications.length})
            </h2>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {verifications.length === 0 ? (
                <p className="text-xs text-muted py-8 text-center">No hay solicitudes pendientes.</p>
              ) : (
                verifications.map((v) => (
                  <div key={v.id} className="p-4 bg-[#0A1128]/50 border border-white/5 rounded-2xl flex flex-col sm:flex-row justify-between gap-4">
                    <div className="space-y-2">
                      <h4 className="font-bold text-sm text-white">{v.userName}</h4>
                      <p className="text-xs text-muted">📍 País: {v.country}</p>
                      
                      {/* Photos check comparison preview */}
                      <div className="flex gap-2 pt-1">
                        <div>
                          <p className="text-[9px] text-muted">Selfie / Perfil</p>
                          {v.selfieUrl ? (
                            <img src={v.selfieUrl} alt="Selfie" className="w-16 h-16 rounded object-cover border border-white/10" />
                          ) : (
                            <span className="inline-block w-16 h-16 bg-card rounded border border-white/5" />
                          )}
                        </div>
                        <div>
                          <p className="text-[9px] text-muted">Documento</p>
                          {v.documentUrl ? (
                            <img src={v.documentUrl} alt="Document" className="w-16 h-16 rounded object-cover border border-white/10" />
                          ) : (
                            <div className="w-16 h-16 bg-card rounded border border-white/5 flex items-center justify-center text-[10px] text-muted font-bold">
                              No doc
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col justify-end gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => handleApproveVerification(v.id)}
                        className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-xs transition"
                      >
                        {t("admin.approve")}
                      </button>
                      <button
                        onClick={() => handleRejectVerification(v.id)}
                        className="px-4 py-1.5 bg-red-600/20 border border-red-500/40 text-red-400 hover:bg-red-600/30 font-bold rounded-lg text-xs transition"
                      >
                        {t("admin.reject")}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reports backlog list */}
          <div className="glass p-6 rounded-3xl border border-primary/10 space-y-4">
            <h2 className="text-xl font-bold text-white tracking-wide border-b border-white/5 pb-2">
              ⚠️ {t("admin.reports")} ({reports.length})
            </h2>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {reports.length === 0 ? (
                <p className="text-xs text-muted py-8 text-center">No hay reportes sin resolver.</p>
              ) : (
                reports.map((r) => (
                  <div key={r.id} className="p-4 bg-[#0A1128]/50 border border-white/5 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-secondary">{r.reason}</span>
                      <span className="text-muted">{r.createdAt}</span>
                    </div>
                    
                    <p className="text-xs text-white">
                      <span className="text-muted">Denunciante:</span> {r.reporterName} → <span className="text-muted">Denunciado:</span> <span className="font-bold">{r.reportedName}</span>
                    </p>

                    <p className="text-xs text-muted italic bg-white/5 p-2.5 rounded-lg border border-white/5">
                      "{r.details}"
                    </p>

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleResolveReport(r.id)}
                        className="px-4 py-1.5 bg-primary text-background font-bold rounded-lg text-xs transition"
                      >
                        Archivar / Resolver
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Basic Tab Bar for Mobile App Viewports */}
      <footer className="w-full glass border-t border-primary/10 p-2 sm:hidden z-20">
        <div className="flex justify-around text-muted text-xs">
          <Link href={`/${currentLang}/dashboard`} className="flex flex-col items-center py-1">
            <span>🎴</span>
            <span>{currentLang === "es" ? "Inicio" : (currentLang === "ru" ? "Главная" : "Home")}</span>
          </Link>
          <Link href={`/${currentLang}/chat`} className="flex flex-col items-center py-1">
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
