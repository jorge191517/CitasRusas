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

  // Wizard Steps: 1, 2, 3
  const [step, setStep] = useState(1);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [gender, setGender] = useState("MALE");
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState("España");

  // State Management
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const nextStep = () => {
    if (step === 1) {
      if (!email.trim() || !password.trim()) {
        setErrorMsg("Por favor, rellena todos los campos.");
        return;
      }
      if (password.length < 6) {
        setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
        return;
      }
    }
    if (step === 2) {
      if (!firstName.trim()) {
        setErrorMsg("Por favor, introduce tu nombre.");
        return;
      }
    }
    setErrorMsg("");
    setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setErrorMsg("");
    setStep((prev) => prev - 1);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthDate || !country.trim()) {
      setErrorMsg("Por favor, introduce tu fecha de nacimiento y país.");
      return;
    }
    
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // Real Supabase Register Flow
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data?.user) {
        // Set session token cookie for Route Checkers
        document.cookie = `veloura-auth-session=${data.session?.access_token || "supabase-registered"}; path=/; SameSite=Lax; Secure`;
        
        // Build Profile payload. Since lastName and city are required in Prisma schema, we supply empty string fallbacks.
        const userObj = {
          id: data.user.id,
          email: data.user.email,
          role: "USER",
          profile: {
            firstName: firstName.trim(),
            lastName: "", // Default empty string to satisfy database schema constraint
            birthDate,
            gender,
            country: country.trim(),
            city: "", // Default empty string to satisfy database schema constraint
            languages: [currentLang],
            verifiedStatus: "UNVERIFIED"
          }
        };

        localStorage.setItem("veloura_user", JSON.stringify(userObj));
        
        // POST to backend API to write Profile record in Supabase PostgreSQL
        const apiRes = await fetch(`/api/profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userObj)
        });

        if (!apiRes.ok) {
          const apiErr = await apiRes.json();
          throw new Error(apiErr.error || "Error al crear el perfil de usuario en la base de datos.");
        }

        setSuccessMsg(t("auth.successRegister"));
        setTimeout(() => {
          router.push(`/${currentLang}/dashboard`);
          router.refresh();
        }, 1200);
      }
    } catch (err: any) {
      console.error("Register flow error:", err);
      setErrorMsg(err.message || t("auth.errorAuth"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Lights */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-[#D4A373]/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-[#FF6B8B]/10 blur-[150px] rounded-full" />

      <div className="w-full max-w-md glass p-6 sm:p-8 rounded-[32px] border border-primary/20 text-center space-y-6 relative z-10">
        
        {/* Brand Logo */}
        <Link href={`/${currentLang}`} className="inline-flex items-center space-x-2 mb-2">
          <svg viewBox="0 0 512 512" className="w-8 h-8 text-primary" fill="currentColor">
            <path d="M256,120 C230,80 180,80 150,110 C120,140 120,190 150,220 L256,330 L362,220 C392,190 392,140 362,110 C332,80 282,80 256,120 Z" fill="none" stroke="currentColor" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M256,170 C240,140 200,140 180,160 C160,180 160,210 180,230 L256,305 L332,230 C352,210 352,180 332,160 C312,140 272,140 256,170 Z" fill="none" stroke="#FF6B8B" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span className="text-xl font-bold tracking-widest text-primary font-serif">VELOURA</span>
        </Link>

        {/* Step Indicator */}
        <div className="flex justify-between items-center px-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= 1 ? "bg-primary text-background" : "bg-[#151F3C] text-muted"}`}>1</div>
          <div className={`flex-grow h-0.5 mx-2 transition-all duration-300 ${step >= 2 ? "bg-primary" : "bg-[#151F3C]"}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= 2 ? "bg-primary text-background" : "bg-[#151F3C] text-muted"}`}>2</div>
          <div className={`flex-grow h-0.5 mx-2 transition-all duration-300 ${step >= 3 ? "bg-primary" : "bg-[#151F3C]"}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${step >= 3 ? "bg-primary text-background" : "bg-[#151F3C] text-muted"}`}>3</div>
        </div>

        <h2 className="text-xl font-extrabold text-white">
          {step === 1 && "Crea tus Credenciales"}
          {step === 2 && "Cuéntanos sobre ti"}
          {step === 3 && "Tu Origen y Edad"}
        </h2>

        {/* Form Fields Wizard */}
        <div className="space-y-4 text-left">
          
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">{t("common.email")}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm font-semibold"
                  placeholder="email@example.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">{t("common.password")}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm font-semibold"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">{t("profile.firstName")}</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm font-semibold"
                  placeholder="Escribe tu nombre"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">{t("profile.gender")}</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm font-semibold"
                >
                  <option value="MALE">{t("profile.genderMale")}</option>
                  <option value="FEMALE">{t("profile.genderFemale")}</option>
                  <option value="OTHER">{t("profile.genderOther")}</option>
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">{t("profile.birthDate")}</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">{t("profile.country")}</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm font-semibold"
                  placeholder="España, Rusia, Ucrania..."
                  required
                />
              </div>
            </div>
          )}

          {errorMsg && <p className="text-red-400 text-xs text-center font-medium pt-2">{errorMsg}</p>}
          {successMsg && <p className="text-green-400 text-xs text-center font-medium pt-2">{successMsg}</p>}

          {/* Navigation Controls */}
          <div className="flex gap-3 pt-4">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-sm border border-white/10 transition duration-300"
              >
                Volver
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex-grow py-3 bg-premium-gold text-background font-bold rounded-xl text-sm transition duration-300"
              >
                Continuar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRegister}
                disabled={loading}
                className="flex-grow py-3 bg-premium-gold text-background font-bold rounded-xl text-sm hover:opacity-90 disabled:opacity-50 transition duration-300 shadow-md"
              >
                {loading ? t("common.loading") : t("auth.signUp")}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col space-y-2 pt-2 border-t border-white/5">
          <Link href={`/${currentLang}/login`} className="text-xs text-[#FF6B8B] hover:underline">
            {t("auth.hasAccount")}
          </Link>
        </div>
      </div>
    </div>
  );
}
