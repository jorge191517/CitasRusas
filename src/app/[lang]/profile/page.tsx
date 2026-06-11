"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Locale, getTranslation } from "../../../lib/i18n";
import LanguageSwitcher from "../../../components/LanguageSwitcher";
import { supabase } from "../../../lib/supabase/client";

interface UserProfile {
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  country: string;
  city: string;
  languages: string[];
  profession: string;
  maritalStatus: string;
  bio: string;
  interests: string[];
  height: number;
  verifiedStatus: string;
  photos: string[];
}

export default function ProfilePage() {
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

  // States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("MALE");
  const [country, setCountry] = useState("España");
  const [city, setCity] = useState("");
  const [profession, setProfession] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("Single");
  const [bio, setBio] = useState("");
  const [height, setHeight] = useState(170);
  const [interests, setInterests] = useState<string[]>([]);
  const [verifiedStatus, setVerifiedStatus] = useState("UNVERIFIED");
  const [photos, setPhotos] = useState<string[]>([]);
  
  const [interestInput, setInterestInput] = useState("");
  const [photoInput, setPhotoInput] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("veloura_user");
    if (!storedUser) {
      router.push(`/${currentLang}/login`);
      return;
    }

    const userObj = JSON.parse(storedUser);
    setCurrentUser(userObj);

    // Populate profile states
    const prof: UserProfile = userObj.profile || {
      firstName: "",
      lastName: "",
      birthDate: "1995-01-01",
      gender: "FEMALE",
      country: "España",
      city: "",
      languages: [currentLang],
      profession: "",
      maritalStatus: "Single",
      bio: "",
      interests: [],
      height: 170,
      verifiedStatus: "UNVERIFIED",
      photos: []
    };

    setFirstName(prof.firstName || "");
    setLastName(prof.lastName || "");
    setBirthDate(prof.birthDate || "");
    setGender(prof.gender || "FEMALE");
    setCountry(prof.country || "");
    setCity(prof.city || "");
    setProfession(prof.profession || "");
    setMaritalStatus(prof.maritalStatus || "Single");
    setBio(prof.bio || "");
    setHeight(prof.height || 170);
    setInterests(prof.interests || []);
    setVerifiedStatus(prof.verifiedStatus || "UNVERIFIED");
    setPhotos(prof.photos || []);
  }, [currentLang, router]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const updatedUser = {
      ...currentUser,
      profile: {
        firstName,
        lastName,
        birthDate,
        gender,
        country,
        city,
        languages: currentUser.profile?.languages || [currentLang],
        profession,
        maritalStatus,
        bio,
        interests,
        height,
        verifiedStatus,
        photos
      }
    };

    localStorage.setItem("veloura_user", JSON.stringify(updatedUser));
    
    // Simulate API patch
    fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedUser)
    }).catch(err => console.log("Profile DB update skipped in mock environment:", err));

    setSuccessMsg(t("common.save") + " ok!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const addInterest = () => {
    if (interestInput && !interests.includes(interestInput)) {
      setInterests([...interests, interestInput]);
      setInterestInput("");
    }
  };

  const removeInterest = (item: string) => {
    setInterests(interests.filter((i) => i !== item));
  };

  const addPhoto = () => {
    if (photoInput && !photos.includes(photoInput)) {
      setPhotos([...photos, photoInput]);
      setPhotoInput("");
    }
  };

  const removePhoto = (url: string) => {
    setPhotos(photos.filter((p) => p !== url));
  };

  const requestVerification = () => {
    setVerifiedStatus("PENDING");
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        profile: {
          ...currentUser.profile,
          verifiedStatus: "PENDING"
        }
      };
      localStorage.setItem("veloura_user", JSON.stringify(updatedUser));
    }
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
              <Link href={`/${currentLang}/profile`} className="text-primary border-b-2 border-primary pb-1">
                {currentLang === "es" ? "Perfil" : (currentLang === "ru" ? "Профиль" : "Profile")}
              </Link>
              {currentUser?.role === "ADMIN" && (
                <Link href={`/${currentLang}/admin`} className="text-secondary hover:text-white transition">
                  🛡️ Admin
                </Link>
              )}
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

      {/* Main Profile Layout */}
      <main className="flex-grow max-w-4xl mx-auto px-6 py-12 w-full z-10">
        <div className="glass p-8 rounded-3xl border border-primary/20 space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-white/10 gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-white">{t("profile.title")}</h1>
              <p className="text-muted text-xs mt-1">ID: {currentUser?.id}</p>
            </div>
            
            {/* Identity Verification Status */}
            <div className="flex items-center space-x-3">
              {verifiedStatus === "VERIFIED" ? (
                <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/40 text-xs font-bold rounded-full">
                  🛡️ {t("profile.verified")}
                </span>
              ) : verifiedStatus === "PENDING" ? (
                <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 text-xs font-bold rounded-full">
                  ⏳ Verificación Pendiente
                </span>
              ) : (
                <button
                  onClick={requestVerification}
                  className="px-4 py-1.5 bg-[#FF6B8B] text-white hover:opacity-90 text-xs font-semibold rounded-full shadow-md transition"
                >
                  Request Verification 🛡️
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">{t("profile.firstName")}</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">{t("profile.lastName")}</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm font-semibold"
                  required
                />
              </div>

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

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">{t("profile.country")}</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">{t("profile.city")}</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">{t("profile.profession")}</label>
                <input
                  type="text"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">{t("profile.maritalStatus")}</label>
                <input
                  type="text"
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">{t("profile.height")}</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(parseFloat(e.target.value))}
                  className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">{t("profile.bio")}</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm font-semibold"
              />
            </div>

            {/* Interests Section */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-muted mb-1">{t("profile.interests")}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  className="flex-grow px-4 py-2 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white text-sm"
                  placeholder="e.g. Travel, Fitness"
                />
                <button
                  type="button"
                  onClick={addInterest}
                  className="px-4 bg-primary text-background font-bold rounded-xl text-sm hover:opacity-90 transition"
                >
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {interests.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => removeInterest(item)}
                      className="text-red-400 hover:text-red-600 font-bold"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Photo Gallery Module */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h3 className="text-lg font-bold text-white">📸 {t("profile.photos")}</h3>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={photoInput}
                  onChange={(e) => setPhotoInput(e.target.value)}
                  className="flex-grow px-4 py-2 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white text-sm"
                  placeholder="Pegue la URL de su foto aquí"
                />
                <button
                  type="button"
                  onClick={addPhoto}
                  className="px-4 bg-primary text-background font-bold rounded-xl text-sm hover:opacity-90 transition"
                >
                  Añadir
                </button>
              </div>

              {/* Photos List Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                {photos.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-xs text-muted border border-dashed border-white/15 rounded-2xl">
                    No hay fotos agregadas. ¡Introduce URLs arriba para probar tu galería!
                  </div>
                ) : (
                  photos.map((url, index) => (
                    <div key={url} className="relative aspect-square rounded-2xl bg-card border border-white/10 overflow-hidden flex flex-col justify-end p-2 group">
                      <img src={url} alt={`Gallery ${index}`} className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => removePhoto(url)}
                          className="p-1.5 bg-red-600 rounded-full text-white text-xs hover:scale-110 transition"
                          title="Eliminar"
                        >
                          ✕
                        </button>
                      </div>
                      <span className="z-10 text-[9px] font-bold px-1.5 py-0.5 bg-background/80 rounded self-start">
                        {index === 0 ? "★ Principal" : `Foto ${index + 1}`}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {successMsg && (
              <p className="text-green-400 text-sm font-semibold text-center mt-4">{successMsg}</p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-premium-gold text-background font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition duration-300"
            >
              💾 {t("common.save")}
            </button>
          </form>

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
          <Link href={`/${currentLang}/profile`} className="flex flex-col items-center py-1 text-primary">
            <span>👤</span>
            <span>{currentLang === "es" ? "Perfil" : (currentLang === "ru" ? "Профиль" : "Profile")}</span>
          </Link>
          <button onClick={handleLogout} className="flex flex-col items-center py-1 text-red-400">
            <span>🚪</span>
            <span>{currentLang === "es" ? "Salir" : (currentLang === "ru" ? "Выйти" : "Logout")}</span>
          </button>
        </div>
      </footer>

      <footer className="w-full py-6 text-center text-xs text-muted border-t border-white/5 bg-background relative z-10 mt-12 hidden sm:block">
        <p>© 2026 Veloura Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
