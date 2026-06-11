"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase/client";
import { Locale, getTranslation } from "../../../lib/i18n";

export default function RegisterPage() {
  const params = useParams();
  const currentLang = (params.lang as Locale) || "es";
  const t = getTranslation(currentLang);

  // Wizard Steps: 1, 2, 3
  const [step, setStep] = useState(1);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [gender, setGender] = useState("FEMALE");
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState("España");

  // State
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

  const handleRegister = async () => {
    if (!birthDate || !country.trim()) {
      setErrorMsg("Por favor, introduce tu fecha de nacimiento y país.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            firstName: firstName.trim(),
            birthDate,
            gender,
            country: country.trim(),
          },
        },
      });

      if (error) throw error;

      // data.user exists even when Supabase requires email confirmation (session will be null)
      if (!data?.user) {
        throw new Error("No se pudo crear la cuenta. Inténtalo de nuevo.");
      }

      const token = data.session?.access_token;

      // Set cookie only if auto-confirm is on and we have a token
      if (token && data.session) {
        document.cookie = `veloura-auth-session=${token}; path=/; max-age=${data.session.expires_in}; SameSite=Lax`;
      }

      // Save minimal user to localStorage so onboarding can read userId
      const userObj = {
        id: data.user.id,
        email: data.user.email,
        role: "USER",
        profile: {
          firstName: firstName.trim(),
          lastName: "",
          birthDate,
          gender,
          country: country.trim(),
          city: "",
          languages: [currentLang],
          verifiedStatus: "UNVERIFIED",
          profileCompleted: false,
        },
      };
      localStorage.setItem("veloura_user", JSON.stringify(userObj));

      // Try to create backend profile — non-blocking
      fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(userObj),
      }).catch((err) => console.warn("Profile POST skipped:", err));

      // ✅ REDIRECT IMMEDIATELY — no setTimeout, no waiting
      setSuccessMsg("✅ Cuenta creada. Redirigiendo...");
      window.location.href = `/${currentLang}/onboarding`;

    } catch (err: any) {
      console.error("Register error:", err);
      setErrorMsg(err.message || t("auth.errorAuth"));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Back button */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href={`/${currentLang}`}
          className="px-4 py-2 text-xs font-bold bg-[#151F3C]/80 border border-primary/20 hover:border-primary/40 text-primary rounded-full transition shadow-md"
        >
          ← {t("common.back")}
        </Link>
      </div>

      {/* Background lights */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-[#D4A373]/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-[#FF6B8B]/10 blur-[150px] rounded-full" />

      <div className="w-full max-w-md glass p-6 sm:p-8 rounded-[32px] border border-primary/20 text-center space-y-6 relative z-10">

        {/* Brand Logo */}
        <Link href={`/${currentLang}`} className="inline-flex items-center space-x-2 mb-2">
          <svg viewBox="0 0 512 512" className="w-8 h-8 text-primary" fill="currentColor">
            <path d="M256,120 C230,80 180,80 150,110 C120,140 120,190 150,220 L256,330 L362,220 C392,190 392,140 362,110 C332,80 282,80 256,120 Z" fill="none" stroke="currentColor" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M256,170 C240,140 200,140 180,160 C160,180 160,210 180,230 L256,305 L332,230 C352,210 352,180 332,160 C312,140 272,140 256,170 Z" fill="none" stroke="#FF6B8B" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />
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

        {/* Form Fields */}
        <div className="space-y-4 text-left">

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">{t("common.email")}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm"
                  placeholder="email@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">{t("common.password")}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">{t("profile.firstName")}</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm"
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">{t("profile.gender")}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: "FEMALE", label: t("profile.genderFemale") },
                    { val: "MALE", label: t("profile.genderMale") },
                    { val: "OTHER", label: t("profile.genderOther") },
                  ].map(({ val, label }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setGender(val)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${gender === val ? "bg-primary text-background border-primary" : "bg-white/5 border-white/10 text-muted hover:border-primary/40"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">{t("profile.birthDate")}</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().split("T")[0]}
                  className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">{t("profile.country")}</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm"
                  placeholder="España, Rusia, Letonia..."
                />
              </div>
            </div>
          )}

          {/* Messages */}
          {errorMsg && <p className="text-red-400 text-xs text-center font-medium pt-2">{errorMsg}</p>}
          {successMsg && <p className="text-green-400 text-xs text-center font-medium pt-2">{successMsg}</p>}

          {/* Navigation */}
          <div className="flex gap-3 pt-4">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                disabled={loading}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-sm border border-white/10 transition"
              >
                Volver
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex-grow py-3 bg-premium-gold text-background font-bold rounded-xl text-sm transition hover:opacity-90"
              >
                Continuar →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRegister}
                disabled={loading}
                className="flex-grow py-3 bg-premium-gold text-background font-bold rounded-xl text-sm hover:opacity-90 disabled:opacity-50 transition shadow-md"
              >
                {loading ? "Creando cuenta..." : t("auth.signUp")}
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
