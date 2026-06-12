"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Locale, getTranslation } from "../../../lib/i18n";
import AppHeader from "../../../components/AppHeader";
import MobileBottomNav from "../../../components/MobileBottomNav";
import { supabase } from "../../../lib/supabase/client";

export default function VipPage() {
  const params = useParams();
  const currentLang = (params.lang as Locale) || "es";
  const t = getTranslation(currentLang);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isVip, setIsVip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("veloura_user");
    if (!stored) {
      window.location.replace(`/${currentLang}/login`);
      return;
    }
    const user = JSON.parse(stored);
    setCurrentUser(user);

    // Fetch latest profile status from server to get accurate VIP status
    fetchProfileLatest();
  }, [currentLang]);

  const fetchProfileLatest = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session) headers["Authorization"] = `Bearer ${session.access_token}`;

      const res = await fetch("/api/profile", { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.subscription && data.subscription.tier === "PREMIUM" && data.subscription.isActive) {
          setIsVip(true);
        }
      }
    } catch (err) {
      console.error("Error fetching latest profile:", err);
    }
  };

  const handleActivateVip = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session) headers["Authorization"] = `Bearer ${session.access_token}`;

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          subscription: {
            tier: "PREMIUM",
            isActive: true,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
          }
        })
      });

      if (res.ok) {
        setIsVip(true);
        setSuccessMsg(
          currentLang === "es"
            ? "¡Felicidades! Tu cuenta ha sido mejorada a VIP de forma gratuita."
            : currentLang === "ru"
            ? "Поздравляем! Ваш аккаунт успешно улучшен до VIP бесплатно."
            : "Congratulations! Your account has been upgraded to VIP for free."
        );
        // Update local state and fetch again
        fetchProfileLatest();
      } else {
        alert("Error al activar VIP");
      }
    } catch (err) {
      console.error("Error activating VIP:", err);
      alert("Error al activar VIP");
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    {
      icon: "❤️",
      title: currentLang === "es" ? "Likes Ilimitados" : "Unlimited Likes",
      desc: currentLang === "es" ? "Envía tantos likes como quieras sin restricciones" : "Send as many likes as you want with no restrictions"
    },
    {
      icon: "👀",
      title: currentLang === "es" ? "Saber quién te dio like" : "See Who Liked You",
      desc: currentLang === "es" ? "Revela las personas a las que les gustas antes de swipear" : "Reveal the people who like you before swiping"
    },
    {
      icon: "⚡",
      title: currentLang === "es" ? "Destacar Perfil" : "Profile Boost",
      desc: currentLang === "es" ? "Obtén hasta 10 veces más visibilidad en tu ciudad" : "Get up to 10x more visibility in your city"
    },
    {
      icon: "🛡️",
      title: currentLang === "es" ? "Verificación prioritaria" : "Priority Verification",
      desc: currentLang === "es" ? "Tu insignia de perfil verificado será procesada más rápido" : "Your verified profile badge will be processed faster"
    },
    {
      icon: "🌍",
      title: currentLang === "es" ? "Sin límites de distancia" : "Global Passports",
      desc: currentLang === "es" ? "Conecta con personas de otras ciudades y países sin límites" : "Connect with people from other cities and countries"
    },
    {
      icon: "✨",
      title: currentLang === "es" ? "Acceso Premium Exclusivo" : "Exclusive Premium Access",
      desc: currentLang === "es" ? "Disfruta de las nuevas interacciones seguras y funciones VIP futuras" : "Enjoy new secure interactions and future VIP features"
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Background gradients */}
      <div className="fixed top-0 right-0 w-[60%] h-[50%] bg-[#D4A373]/10 blur-[130px] rounded-full pointer-events-none z-0 animate-pulse" />
      <div className="fixed bottom-0 left-0 w-[60%] h-[50%] bg-[#FF6B8B]/10 blur-[130px] rounded-full pointer-events-none z-0 animate-pulse" />

      <AppHeader
        currentLang={currentLang}
        title={currentLang === "es" ? "Membresía VIP" : (currentLang === "ru" ? "VIP Подписка" : "VIP Membership")}
      />

      <main className="flex-grow max-w-lg mx-auto w-full px-4 pt-4 pb-28 relative z-10 space-y-6 overflow-y-auto">
        {/* VIP Badge Header */}
        <div className="text-center space-y-2 py-6 relative">
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-tr from-[#D4A373] to-[#FF6B8B] flex items-center justify-center shadow-xl animate-bounce">
            <span className="text-4xl text-white">👑</span>
          </div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#D4A373] to-[#FF6B8B] tracking-wide uppercase">
            VELOURA VIP
          </h2>
          <p className="text-xs text-muted max-w-xs mx-auto">
            {currentLang === "es"
              ? "Desbloquea el máximo potencial de tu experiencia y encuentra conexiones reales hoy mismo"
              : "Unlock the maximum potential of your experience and find real connections today"}
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider pl-1">
            {currentLang === "es" ? "Beneficios Incluidos" : "Included Benefits"}
          </h3>
          <div className="grid gap-3">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="glass border border-white/5 rounded-2xl p-4 flex gap-4 hover:border-primary/20 transition duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl shrink-0">
                  {benefit.icon}
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-bold text-sm text-white">{benefit.title}</h4>
                  <p className="text-xs text-muted leading-relaxed">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Purchase Card / Free Activation Action */}
        <div className="glass border border-primary/20 rounded-3xl p-6 text-center space-y-4 bg-[#0D1530]/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#D4A373] uppercase tracking-widest">
              {currentLang === "es" ? "Oferta de Lanzamiento" : "Launch Promotion"}
            </span>
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-muted line-through">$14.99</span>
              <span className="text-3xl font-black text-white">{currentLang === "es" ? "¡GRATIS!" : "FREE!"}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {currentLang === "es"
                ? "Por tiempo limitado, activa todas las funciones premium sin pagar nada."
                : "For a limited time, activate all premium features without paying anything."}
            </p>
          </div>

          {successMsg && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-300 rounded-xl p-3 text-xs leading-relaxed">
              {successMsg}
            </div>
          )}

          {isVip ? (
            <div className="w-full py-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-green-300 font-bold rounded-2xl text-center text-sm shadow-md">
              ✓ {currentLang === "es" ? "Tu membresía VIP está ACTIVA" : "Your VIP membership is ACTIVE"}
            </div>
          ) : (
            <button
              onClick={handleActivateVip}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-[#D4A373] to-[#FF6B8B] hover:opacity-95 text-background font-bold rounded-2xl text-center text-sm shadow-lg transform active:scale-95 transition disabled:opacity-50"
            >
              {loading
                ? (currentLang === "es" ? "Activando VIP..." : "Activating VIP...")
                : (currentLang === "es" ? "Activar VIP Gratis Ahora" : "Activate Free VIP Now")}
            </button>
          )}
        </div>
      </main>

      <MobileBottomNav currentLang={currentLang} active="vip" />
    </div>
  );
}
