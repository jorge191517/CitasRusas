import Link from "next/link";
import { Locale, getTranslation } from "../../lib/i18n";
import LandingHeader from "../../components/LandingHeader";
import React from "react";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function LandingPage({ params }: PageProps) {
  const { lang } = await params;
  const currentLang = (lang as Locale) || "es";
  const t = getTranslation(currentLang);

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col justify-between overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#D4A373]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#FF6B8B]/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header — auth-aware */}
      <LandingHeader currentLang={currentLang} />

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row items-center justify-between gap-12 z-10 flex-grow w-full">
        {/* Left Text Column */}
        <div className="flex-1 text-center lg:text-left space-y-8 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-card/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-primary/20 text-xs text-primary shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#FF6B8B] animate-ping" />
            <span className="font-semibold">{t("common.subtitle")}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
            {t("landing.heroTitle").split(" ")[0]}{" "}
            <span className="bg-gradient-to-r from-primary to-[#FF6B8B] bg-clip-text text-transparent">
              {t("landing.heroTitle").split(" ").slice(1).join(" ")}
            </span>
          </h1>
          <p className="text-muted text-base md:text-lg max-w-xl mx-auto lg:mx-0">
            {t("landing.heroSubtitle")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <Link
              href={`/${currentLang}/register`}
              className="w-full sm:w-auto px-8 py-4 bg-premium-gold text-background font-bold rounded-full hover:scale-105 transition-all duration-300 shadow-lg shadow-primary/20 text-center"
            >
              {t("landing.ctaStart")}
            </Link>
            <Link
              href={`/${currentLang}/login`}
              className="w-full sm:w-auto px-8 py-4 bg-card hover:bg-card/80 text-foreground font-semibold rounded-full border border-white/10 hover:scale-105 transition-all duration-300 text-center"
            >
              {t("landing.ctaLogin")}
            </Link>
          </div>
        </div>

        {/* Right Feature Graphic (Mock card interaction) */}
        <div className="flex-1 w-full flex justify-center lg:justify-end relative">
          <div className="relative w-80 h-[450px] bg-[#151F3C]/80 rounded-[40px] border border-primary/30 p-4 shadow-2xl flex flex-col justify-between overflow-hidden glass hover:scale-105 transition-all duration-500">
            {/* Top Bar */}
            <div className="flex justify-between items-center text-xs text-muted">
              <span>Veloura Match ✨</span>
              <span className="w-2 h-2 rounded-full bg-green-500" />
            </div>

            {/* Profile Photo Mock */}
            <div className="my-3 flex-grow rounded-2xl bg-[#0A1128] border border-white/5 relative overflow-hidden flex flex-col justify-end p-4">
              {/* Graphic Representation of User Collage */}
              <div className="absolute inset-0 w-full h-full">
                {/* Card 1 (Man behind) */}
                <div className="absolute top-2 left-[-10px] w-full h-[90%] rounded-2xl overflow-hidden transform -rotate-6 opacity-40 blur-[1px]">
                  <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80" alt="Profile Man" className="w-full h-full object-cover" />
                </div>
                {/* Card 2 (Woman behind) */}
                <div className="absolute top-2 right-[-10px] w-full h-[90%] rounded-2xl overflow-hidden transform rotate-6 opacity-40 blur-[1px]">
                  <img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80" alt="Profile Woman" className="w-full h-full object-cover" />
                </div>
                {/* Main Card (Center) */}
                <div className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden z-10 border border-primary/20 shadow-2xl">
                  <img src="https://images.unsplash.com/photo-1517365830460-955ce3ccd263?w=600&auto=format&fit=crop&q=80" alt="Main Profile" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1128] via-[#0A1128]/40 to-transparent z-10" />
              
              {/* Profile Details */}
              <div className="z-10 text-left">
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-lg text-white">Elena, 26</h3>
                  <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] rounded border border-primary/40 font-bold">✓ VERIFIED</span>
                </div>
                <p className="text-xs text-muted mt-1">Madrid, Spain 🇪🇸</p>
                <p className="text-[10px] text-primary/80 mt-1">🇷🇺 Russian • 🇪🇸 Spanish • 🇬🇧 English</p>
              </div>
            </div>

            {/* Interaction Buttons Mock */}
            <div className="flex justify-around items-center pt-2">
              <button className="w-12 h-12 rounded-full bg-[#151F3C] border border-white/10 flex items-center justify-center hover:bg-[#FF6B8B]/20 text-[#FF6B8B] transition duration-300">
                ✕
              </button>
              <button className="w-14 h-14 rounded-full bg-primary flex items-center justify-center hover:scale-110 shadow-lg text-background font-bold transition duration-300">
                ♥
              </button>
              <button className="w-12 h-12 rounded-full bg-[#151F3C] border border-white/10 flex items-center justify-center hover:bg-blue-500/20 text-blue-400 transition duration-300">
                ⭐
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section className="w-full bg-[#151F3C]/40 py-16 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass p-8 rounded-3xl space-y-4 hover:border-primary/40 transition duration-300">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl">
              🛡️
            </div>
            <h3 className="text-xl font-bold text-white">{t("landing.feature1Title")}</h3>
            <p className="text-sm text-muted leading-relaxed">{t("landing.feature1Desc")}</p>
          </div>
          <div className="glass p-8 rounded-3xl space-y-4 hover:border-primary/40 transition duration-300">
            <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary text-xl">
              💬
            </div>
            <h3 className="text-xl font-bold text-white">{t("landing.feature2Title")}</h3>
            <p className="text-sm text-muted leading-relaxed">{t("landing.feature2Desc")}</p>
          </div>
          <div className="glass p-8 rounded-3xl space-y-4 hover:border-primary/40 transition duration-300">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 text-xl">
              🌍
            </div>
            <h3 className="text-xl font-bold text-white">{t("landing.feature3Title")}</h3>
            <p className="text-sm text-muted leading-relaxed">{t("landing.feature3Desc")}</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-8 text-center text-xs text-muted border-t border-white/5 bg-background relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 Veloura Inc. All rights reserved.</p>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-primary transition">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition">Terms of Service</a>
            <a href="#" className="hover:text-primary transition">Safety Tips</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
