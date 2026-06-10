"use client";

import { usePathname, useRouter } from "next/navigation";
import { Locale, locales } from "../lib/i18n";
import React from "react";

export default function LanguageSwitcher({ currentLang }: { currentLang: Locale }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLanguageChange = (newLang: Locale) => {
    if (!pathname) return;
    
    // Replace the current locale path prefix (e.g. /es/dashboard -> /en/dashboard)
    const segments = pathname.split("/");
    if (locales.includes(segments[1] as Locale)) {
      segments[1] = newLang;
    } else {
      segments.splice(1, 0, newLang);
    }
    
    const newPath = segments.join("/");
    router.push(newPath);
  };

  const labelMap: Record<Locale, string> = {
    es: "ES 🇪🇸",
    en: "EN 🇬🇧",
    ru: "RU 🇷🇺",
  };

  return (
    <div className="flex items-center space-x-1 bg-card/60 backdrop-blur-sm p-1 rounded-full border border-primary/20">
      {locales.map((locale) => (
        <button
          key={locale}
          onClick={() => handleLanguageChange(locale)}
          className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-300 ${
            currentLang === locale
              ? "bg-primary text-background shadow-md font-bold"
              : "text-muted hover:text-white"
          }`}
        >
          {labelMap[locale]}
        </button>
      ))}
    </div>
  );
}
