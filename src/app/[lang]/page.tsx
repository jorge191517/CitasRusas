import Link from "next/link";
import { Locale, getTranslation } from "../../lib/i18n";
import LanguageSwitcher from "../../components/LanguageSwitcher";
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

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10 relative">
        <div className="flex items-center space-x-3">
          {/* Veloura Gold Logo */}
          <div className="relative w-10 h-10 flex items-center justify-center">
            <svg viewBox="0 0 512 512" className="w-full h-full text-primary" fill="currentColor">
              <path d="M256,120 C230,80 180,80 150,110 C120,140 120,190 150,220 L256,330 L362,220 C392,190 392,140 362,110 C332,80 282,80 256,120 Z" fill="none" stroke="currentColor" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M256,170 C240,140 200,140 180,160 C160,180 160,210 180,230 L256,305 L332,230 C352,210 352,180 332,160 C312,140 272,140 256,170 Z" fill="none" stroke="#FF6B8B" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <span className="text-2xl font-bold tracking-widest text-primary font-serif">VELOURA</span>
        </div>
        <div className="flex items-center space-x-4">
          <LanguageSwitcher currentLang={currentLang} />
          <Link
            href={`/${currentLang}/login`}
            className="px-5 py-2 text-sm font-semibold rounded-full border border-primary/40 text-primary hover:bg-primary hover:text-background transition-all duration-300 shadow-md"
          >
            {t("common.login")}
          </Link>
        </div>
      </header>

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
              {/* Graphic Representation of User */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-24 h-24 text-primary opacity-60">
                  <circle cx="50" cy="40" r="20" fill="currentColor" />
                  <path d="M20,85 C20,70 30,60 50,60 C70,60 80,70 80,85" fill="currentColor" />
                </svg>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1128] via-transparent to-transparent" />
              
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
