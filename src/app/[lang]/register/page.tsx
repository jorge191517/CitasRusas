"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase/client";
import { Locale, getTranslation } from "../../../lib/i18n";

export default function RegisterPage() {
  const params = useParams();
  const router = useRouter();
  const currentLang = (params.lang as Locale) || "es";
  const t = getTranslation(currentLang);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("MALE");
  const [country, setCountry] = useState("España");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // Validate environment variables in development only
      if (process.env.NODE_ENV === "development") {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          console.error("DEBUG DEV ALERT: Supabase Public Env Variables are missing!");
        }
      }

      // Real Supabase Register Flow
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data?.user) {
        document.cookie = `veloura-auth-session=${data.session?.access_token || "supabase-registered"}; path=/; SameSite=Lax; Secure`;
        
        const userObj = {
          id: data.user.id,
          email: data.user.email,
          role: "USER",
          profile: {
            firstName,
            lastName,
            birthDate,
            gender,
            country,
            city,
            languages: [currentLang],
            verifiedStatus: "UNVERIFIED"
          }
        };
        localStorage.setItem("veloura_user", JSON.stringify(userObj));
        
        // POST to profile setup API
        await fetch(`/api/profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userObj)
        }).catch(err => console.error("Profile API deferred setup error:", err));

        setSuccessMsg(t("auth.successRegister"));
        setTimeout(() => {
          router.push(`/${currentLang}/dashboard`);
          router.refresh();
        }, 1000);
      }
    } catch (err: any) {
      console.error("Register error details:", err);
      setErrorMsg(`${t("auth.errorAuth")}: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-[#D4A373]/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-[#FF6B8B]/10 blur-[150px] rounded-full" />

      <div className="w-full max-w-lg glass p-8 rounded-[32px] border border-primary/20 text-center space-y-6 relative z-10">
        <Link href={`/${currentLang}`} className="inline-flex items-center space-x-2 mb-2">
          <svg viewBox="0 0 512 512" className="w-8 h-8 text-primary" fill="currentColor">
            <path d="M256,120 C230,80 180,80 150,110 C120,140 120,190 150,220 L256,330 L362,220 C392,190 392,140 362,110 C332,80 282,80 256,120 Z" fill="none" stroke="currentColor" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M256,170 C240,140 200,140 180,160 C160,180 160,210 180,230 L256,305 L332,230 C352,210 352,180 332,160 C312,140 272,140 256,170 Z" fill="none" stroke="#FF6B8B" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span className="text-xl font-bold tracking-widest text-primary font-serif">VELOURA</span>
        </Link>

        <h2 className="text-2xl font-bold text-white">{t("auth.signUp")}</h2>

        <form onSubmit={handleRegister} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-muted mb-1">{t("common.email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm"
              placeholder="email@example.com"
              required
            />
          </div>
          
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-muted mb-1">{t("common.password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1">{t("profile.firstName")}</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">{t("profile.lastName")}</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1">{t("profile.birthDate")}</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1">{t("profile.gender")}</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm"
            >
              <option value="MALE">{t("profile.genderMale")}</option>
              <option value="FEMALE">{t("profile.genderFemale")}</option>
              <option value="OTHER">{t("profile.genderOther")}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1">{t("profile.country")}</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1">{t("profile.city")}</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm"
              required
            />
          </div>

          {errorMsg && <p className="text-red-400 text-xs mt-1 text-center font-medium sm:col-span-2">{errorMsg}</p>}
          {successMsg && <p className="text-green-400 text-xs mt-1 text-center font-medium sm:col-span-2">{successMsg}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-premium-gold text-background font-bold rounded-xl hover:opacity-90 transition duration-300 disabled:opacity-50 text-sm shadow-md sm:col-span-2 mt-2"
          >
            {loading ? t("common.loading") : t("auth.signUp")}
          </button>
        </form>

        <div className="flex flex-col space-y-2 pt-2">
          <Link href={`/${currentLang}/login`} className="text-xs text-[#FF6B8B] hover:underline">
            {t("auth.hasAccount")}
          </Link>
        </div>
      </div>
    </div>
  );
}
