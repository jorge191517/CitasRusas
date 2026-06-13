"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Locale, getTranslation } from "../../../lib/i18n";
import { DatingProfile } from "../../../components/TinderCard";
import { getOptimizedSupabaseImageUrl } from "../../../lib/image-utils";
import AppHeader from "../../../components/AppHeader";
import MobileBottomNav from "../../../components/MobileBottomNav";
import { supabase } from "../../../lib/supabase/client";

export default function ProfilePage() {
  const params = useParams();
  const currentLang = (params.lang as Locale) || "es";
  const t = getTranslation(currentLang);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  // Real metrics from DB (not mocked)
  const [matchCount, setMatchCount] = useState(0);
  const [likesReceivedCount, setLikesReceivedCount] = useState(0);
  const [visitsCount] = useState(0); // No visits table yet — always 0

  // Editable fields
  const [firstName, setFirstName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [profession, setProfession] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState("");
  const [mainPhotoUrl, setMainPhotoUrl] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");

  const photoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // 1. Check real Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.location.replace(`/${currentLang}/login`);
          return;
        }

        // 2. Prefill from localStorage cache while API loads
        const stored = localStorage.getItem("veloura_user");
        if (stored) {
          try {
            const u = JSON.parse(stored);
            setCurrentUser(u);
            const p = u.profile || {};
            setFirstName(p.firstName || "");
            setBio(p.bio || "");
            setCountry(p.country || "");
            setProfession(p.profession || "");
            setInterests(p.interests || []);
            setHobbies(p.hobbies || []);
            setLookingFor(p.lookingFor || "");
            setMainPhotoUrl(p.mainPhotoUrl || "");
            setPhotos(p.photos || []);
          } catch (_) {}
        }

        // 3. Fetch real profile data from API (always from DB, never from cache alone)
        try {
          const res = await fetch("/api/profile", {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: "no-store",
          });
          if (res.ok) {
            const data = await res.json();
            const p = data.profile || {};

            if (process.env.NODE_ENV === "development") {
              console.log("[PROFILE] API response profileCompleted:", p.profileCompleted);
              console.log("[PROFILE] API response mainPhotoUrl:", p.mainPhotoUrl);
              console.log("[PROFILE] API response allPhotos:", p.allPhotos);
            }

            // Resolve main photo: mainPhotoUrl OR first isPrimary photo OR first photo
            const resolvedMain = p.mainPhotoUrl ||
              (p.allPhotos?.find((ph: any) => ph.isPrimary))?.url ||
              (p.allPhotos?.[0])?.url ||
              "";

            // Gallery = all non-primary photos from allPhotos
            const resolvedGallery: string[] = (p.allPhotos || [])
              .filter((ph: any) => !ph.isPrimary && ph.url && ph.url.startsWith("http"))
              .map((ph: any) => ph.url);

            const userObj = {
              id: session.user.id,
              email: session.user.email,
              role: data.role || "USER",
              profile: { ...p, mainPhotoUrl: resolvedMain, photos: resolvedGallery },
            };
            setCurrentUser(userObj);
            setFirstName(p.firstName || "");
            setBio(p.bio || "");
            setCountry(p.country || "");
            setProfession(p.profession || "");
            setInterests(p.interests || []);
            setHobbies(p.hobbies || []);
            setLookingFor(p.lookingFor || "");
            setMainPhotoUrl(resolvedMain);
            setPhotos(resolvedGallery);

            // Update localStorage cache with real API data
            try {
              localStorage.setItem("veloura_user", JSON.stringify(userObj));
            } catch (_) {}
          }
        } catch (apiErr) {
          console.error("Profile API fetch error:", apiErr);
          // Keep localStorage data as fallback
        }

        // 4. Fetch real metrics from /api/matches
        try {
          const matchRes = await fetch("/api/matches", {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: "no-store",
          });
          if (matchRes.ok) {
            const matchData = await matchRes.json();
            setMatchCount((matchData.matches || []).length);
            setLikesReceivedCount((matchData.receivedLikes || []).length);
          }
        } catch (_) {}
        // Note: visitsCount has no table yet, stays at 0
      } catch (err) {
        console.error("Profile load error:", err);
        window.location.replace(`/${currentLang}/login`);
      }
    };
    loadProfile();
  }, [currentLang]);

  const calcAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const bd = new Date(birthDate);
    const now = new Date();
    let age = now.getFullYear() - bd.getFullYear();
    const m = now.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) age--;
    return age;
  };

  const handleSave = async () => {
    if (!currentUser) return;

    // Client-side validation
    if (!firstName.trim() || firstName.trim().length < 2) {
      alert(currentLang === "es" ? "El nombre debe tener al menos 2 caracteres." : "Name must be at least 2 characters.");
      return;
    }
    if (!country.trim() || country.trim().length < 2) {
      alert(currentLang === "es" ? "El país debe tener al menos 2 caracteres." : "Country must be at least 2 characters.");
      return;
    }

    const updatedProfile = {
      ...(currentUser.profile || {}),
      firstName: firstName.trim(),
      bio: bio.trim(),
      country: country.trim(),
      profession: profession.trim(),
      interests, hobbies, lookingFor,
      mainPhotoUrl, photos,
    };
    
    setEditing(false);
    setSuccessMsg(currentLang === "es" ? "Perfil guardado ✓" : "Profile saved ✓");
    setTimeout(() => setSuccessMsg(""), 3000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session) headers["Authorization"] = `Bearer ${session.access_token}`;

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers,
        body: JSON.stringify(updatedProfile),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setPhotos(data.profile.photos || []);
          setMainPhotoUrl(data.profile.mainPhotoUrl || "");
          const updated = { 
            ...currentUser, 
            profile: {
              ...currentUser.profile,
              ...data.profile
            }
          };
          localStorage.setItem("veloura_user", JSON.stringify(updated));
          setCurrentUser(updated);
        }
      }
    } catch (err) {
      console.error("Error saving profile:", err);
    }
  };

  const [uploading, setUploading] = useState(false);

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from("profile-media")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) {
      console.error("[UPLOAD] Supabase Storage failed:", error.message);
      throw new Error(`Error al subir la imagen: ${error.message}`);
    }

    if (!data) {
      throw new Error("No se pudo obtener la información del archivo subido.");
    }

    const { data: pub } = supabase.storage.from("profile-media").getPublicUrl(data.path);
    const publicUrl = pub.publicUrl;

    if (!publicUrl || publicUrl.startsWith("blob:") || !publicUrl.startsWith("http")) {
      throw new Error("La URL devuelta por el servidor no es válida o es una URL temporal (blob).");
    }

    console.log("[UPLOAD] Supabase Storage OK:", publicUrl);
    return publicUrl;
  };

  const handlePhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    try {
      setUploading(true);
      const userId = currentUser?.id || "user";
      const path = `${userId}/${Date.now()}_profile`;
      const uploadedUrl = await uploadFile(file, path);

      if (uploadedUrl) {
        let newMain = mainPhotoUrl;
        let newPhotos = [...photos];

        if (!mainPhotoUrl) {
          newMain = uploadedUrl;
          setMainPhotoUrl(uploadedUrl);
        } else if (photos.length < 4) {
          newPhotos = [...photos, uploadedUrl];
          setPhotos(newPhotos);
        }

        // Auto save to database!
        // Only send mainPhotoUrl and photos to prevent Zod validation errors on empty basic fields
        const photoPayload = {
          mainPhotoUrl: newMain,
          photos: newPhotos,
        };

        // Fetch patch
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (session) headers["Authorization"] = `Bearer ${session.access_token}`;

        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers,
          body: JSON.stringify(photoPayload),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setPhotos(data.profile.photos || []);
            setMainPhotoUrl(data.profile.mainPhotoUrl || "");
            const updated = { 
              ...currentUser, 
              profile: {
                ...currentUser.profile,
                ...data.profile
              }
            };
            localStorage.setItem("veloura_user", JSON.stringify(updated));
            setCurrentUser(updated);
          }
        }
      }
    } catch (err: any) {
      console.error("Error uploading photo:", err);
      alert(err.message || "Error al subir la foto");
    } finally {
      setUploading(false);
    }
  };

  const age = calcAge(currentUser?.profile?.birthDate);
  const verifiedStatus = currentUser?.profile?.verifiedStatus || "UNVERIFIED";

  const LOOKING_FOR_LABELS: Record<string, Record<string, string>> = {
    friendship:   { es: "Amistad", en: "Friendship", ru: "Дружба" },
    relationship: { es: "Relación", en: "Relationship", ru: "Отношения" },
    serious:      { es: "Relación seria", en: "Serious relationship", ru: "Серьёзные отношения" },
    marriage:     { es: "Matrimonio", en: "Marriage", ru: "Брак" },
    cultural:     { es: "Intercambio cultural", en: "Cultural exchange", ru: "Культурный обмен" },
  };

  const lbl = (key: string) => LOOKING_FOR_LABELS[key]?.[currentLang] || LOOKING_FOR_LABELS[key]?.es || key;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <div className="fixed top-0 right-0 w-[50%] h-[50%] bg-[#D4A373]/5 blur-[130px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[50%] h-[50%] bg-[#FF6B8B]/5 blur-[130px] rounded-full pointer-events-none z-0" />

      <AppHeader
        currentLang={currentLang}
        title={currentLang === "es" ? "Mi perfil" : (currentLang === "ru" ? "Профиль" : "My profile")}
      />

      <main className="flex-grow max-w-lg mx-auto w-full px-4 pt-4 pb-28 relative z-10 space-y-5">

        {/* ── PROFILE CARD ── */}
        <div className="relative w-full rounded-[28px] overflow-hidden border border-white/10 shadow-2xl bg-[#0D1530]" style={{ minHeight: "280px" }}>
          {/* Photo background */}
          {mainPhotoUrl ? (
            <img
              src={getOptimizedSupabaseImageUrl(mainPhotoUrl, 600, 800)}
              alt={firstName}
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#151F3C] to-[#0A1128]">
              <svg viewBox="0 0 100 100" className="w-24 h-24 text-primary/20">
                <circle cx="50" cy="38" r="22" fill="currentColor" />
                <path d="M16,90 C16,70 28,56 50,56 C72,56 84,70 84,90" fill="currentColor" />
              </svg>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A1128] via-[#0A1128]/30 to-transparent" />

          {/* Verified badge */}
          {verifiedStatus === "VERIFIED" && (
            <div className="absolute top-4 right-4 px-2.5 py-1 bg-black/50 backdrop-blur-md rounded-full border border-primary/30">
              <span className="text-primary text-[10px] font-bold">✓ VERIFICADA</span>
            </div>
          )}

          {/* Edit photo button */}
          <button
            onClick={() => photoRef.current?.click()}
            className="absolute top-4 left-4 w-9 h-9 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition border border-white/20"
            disabled={uploading}
          >
            {uploading ? "⏳" : "📷"}
          </button>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />

          {/* Info */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">{firstName || "Tu nombre"}{age ? `, ${age}` : ""}</h2>
                <p className="text-sm text-white/70 mt-0.5">📍 {country || "—"}</p>
                {profession && <p className="text-xs text-white/60 mt-0.5">💼 {profession}</p>}
              </div>
              {lookingFor && (
                <span className="px-2 py-1 bg-primary/20 border border-primary/30 rounded-lg text-[10px] font-bold text-primary shrink-0 mb-1">
                  {lbl(lookingFor)}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setEditing(!editing)}
          className="w-full py-3 bg-[#151F3C]/85 border border-primary/25 hover:bg-[#151F3C] text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition hover:scale-[1.01] active:scale-[0.99] shadow-md relative z-10"
        >
          ✏️ {editing ? (currentLang === "es" ? "Cancelar edición" : "Cancel editing") : (currentLang === "es" ? "Editar datos de perfil" : "Edit profile details")}
        </button>

        {/* ── EDIT FIELDS ── */}
        {editing && (
          <div className="glass rounded-2xl p-4 border border-white/5 space-y-3 relative z-10 animate-fade-in">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
              {currentLang === "es" ? "Datos básicos" : "Basic info"}
            </h3>
            <div>
              <label className="text-[10px] text-muted mb-1 block">{currentLang === "es" ? "Nombre" : "Name"}</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3 py-2 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-muted mb-1 block">{currentLang === "es" ? "País" : "Country"}</label>
              <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className="w-full px-3 py-2 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-muted mb-1 block">{currentLang === "es" ? "Profesión" : "Profession"}</label>
              <input type="text" value={profession} onChange={(e) => setProfession(e.target.value)} className="w-full px-3 py-2 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-muted mb-1 block">{currentLang === "es" ? "¿Qué buscas?" : "Looking for"}</label>
              <select value={lookingFor} onChange={(e) => setLookingFor(e.target.value)} className="w-full px-3 py-2 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white text-sm focus:outline-none">
                <option value="">—</option>
                <option value="friendship">{currentLang === "es" ? "Amistad" : "Friendship"}</option>
                <option value="relationship">{currentLang === "es" ? "Relación" : "Relationship"}</option>
                <option value="serious">{currentLang === "es" ? "Relación seria" : "Serious relationship"}</option>
                <option value="marriage">{currentLang === "es" ? "Matrimonio" : "Marriage"}</option>
                <option value="cultural">{currentLang === "es" ? "Intercambio cultural" : "Cultural exchange"}</option>
              </select>
            </div>
            <button onClick={handleSave} className="w-full py-3 font-bold rounded-xl text-sm text-background" style={{ background: "linear-gradient(135deg, #D4A373, #FF6B8B)" }}>
              💾 {currentLang === "es" ? "Guardar cambios" : "Save changes"}
            </button>
          </div>
        )}

        {/* ── PHOTO GALLERY ── */}
        <div>
          <h3 className="text-xs font-bold text-muted mb-2 uppercase tracking-wider">
            {currentLang === "es" ? "Galería" : "Gallery"}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {mainPhotoUrl ? (
              <div className="relative aspect-square rounded-2xl overflow-hidden border-2 border-primary/40">
                <img
                  src={getOptimizedSupabaseImageUrl(mainPhotoUrl, 180, 180)}
                  alt="Main"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.style.display = "none";
                    el.parentElement!.style.background = "linear-gradient(135deg, #151F3C, #0A1128)";
                  }}
                />
                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-primary/80 rounded text-[8px] font-bold text-background">MAIN</div>
              </div>
            ) : (
              <div
                onClick={() => photoRef.current?.click()}
                className="aspect-square rounded-2xl border-2 border-dashed border-white/15 hover:border-primary/40 flex flex-col items-center justify-center text-muted text-xs cursor-pointer hover:text-white transition"
              >
                <span>📷 Main</span>
                <span className="text-[9px] mt-0.5">(Añadir)</span>
              </div>
            )}

            {photos.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10">
                <img src={getOptimizedSupabaseImageUrl(url, 180, 180)} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const confirmDelete = confirm(currentLang === "es" ? "¿Seguro de eliminar esta foto?" : "Delete this photo?");
                    if (!confirmDelete) return;

                    const newPhotos = photos.filter((_, idx) => idx !== i);
                    setPhotos(newPhotos);

                    const photoPayload = {
                      mainPhotoUrl,
                      photos: newPhotos,
                    };

                    const { data: { session } } = await supabase.auth.getSession();
                    const headers: Record<string, string> = { "Content-Type": "application/json" };
                    if (session) headers["Authorization"] = `Bearer ${session.access_token}`;

                    const res = await fetch("/api/profile", {
                      method: "PATCH",
                      headers,
                      body: JSON.stringify(photoPayload),
                    });

                    if (res.ok) {
                      const data = await res.json();
                      if (data.profile) {
                        setPhotos(data.profile.photos || []);
                        setMainPhotoUrl(data.profile.mainPhotoUrl || "");
                        const updated = { 
                          ...currentUser, 
                          profile: {
                            ...currentUser.profile,
                            ...data.profile
                          }
                        };
                        localStorage.setItem("veloura_user", JSON.stringify(updated));
                        setCurrentUser(updated);
                      }
                    }
                  }}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-600/85 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-lg"
                >
                  ✕
                </button>
              </div>
            ))}

            {/* Empty placeholders to make up to 5 total photos (1 main + 4 gallery) */}
            {Array.from({ length: Math.max(0, 5 - (photos.length + (mainPhotoUrl ? 1 : 0))) }).map((_, i) => (
              <button
                key={i}
                onClick={() => photoRef.current?.click()}
                className="aspect-square rounded-2xl border-2 border-dashed border-white/15 hover:border-primary/40 flex items-center justify-center text-muted text-2xl hover:text-white transition"
                disabled={uploading}
              >
                {uploading && i === 0 ? "⏳" : "+"}
              </button>
            ))}
          </div>
        </div>

        {/* ── STATS — real data from DB ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: currentLang === "es" ? "Visitas" : "Visits", value: visitsCount.toString() },
            { label: currentLang === "es" ? "Likes" : "Likes", value: likesReceivedCount.toString() },
            { label: "Matches", value: matchCount.toString() },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-2xl p-3 text-center border border-white/5">
              <p className="text-xl font-black text-primary">{stat.value}</p>
              <p className="text-[10px] text-muted mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── BIO ── */}
        <div className="glass rounded-2xl p-4 border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Bio</h3>
            <button onClick={() => setEditing(!editing)} className="text-[10px] text-primary hover:underline font-semibold">
              {editing ? (currentLang === "es" ? "Cancelar" : "Cancel") : (currentLang === "es" ? "✏️ Editar" : "✏️ Edit")}
            </button>
          </div>
          {editing ? (
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 300))}
              rows={3}
              className="w-full bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white text-sm px-3 py-2 focus:outline-none focus:border-primary resize-none"
              placeholder={currentLang === "es" ? "Cuéntanos sobre ti..." : "Tell us about you..."}
            />
          ) : (
            <p className="text-sm text-white/80 leading-relaxed">
              {bio || <span className="text-muted italic">{currentLang === "es" ? "Sin bio aún. Toca Editar para añadir." : "No bio yet. Tap Edit to add."}</span>}
            </p>
          )}
        </div>

        {/* ── INTERESTS ── */}
        {(interests.length > 0 || editing) && (
          <div className="glass rounded-2xl p-4 border border-white/5 space-y-2">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider">
              {currentLang === "es" ? "Intereses" : "Interests"}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {interests.map((i) => (
                <span key={i} className="px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-full text-[11px] text-primary font-semibold">
                  #{i}
                  {editing && (
                    <button onClick={() => setInterests(interests.filter(x => x !== i))} className="ml-1 text-red-400 font-bold">✕</button>
                  )}
                </span>
              ))}
            </div>
            {editing && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (interestInput.trim()) { setInterests(prev => [...prev, interestInput.trim()]); setInterestInput(""); } } }}
                  className="flex-1 px-3 py-1.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white text-xs focus:outline-none"
                  placeholder={currentLang === "es" ? "Añadir interés..." : "Add interest..."}
                />
                <button
                  type="button"
                  onClick={() => { if (interestInput.trim()) { setInterests(prev => [...prev, interestInput.trim()]); setInterestInput(""); } }}
                  className="px-3 bg-primary text-background font-bold rounded-xl text-xs"
                >+</button>
              </div>
            )}
          </div>
        )}



        {successMsg && (
          <div className="glass rounded-2xl p-3 border border-green-500/30 text-center">
            <p className="text-green-400 text-sm font-semibold">{successMsg}</p>
          </div>
        )}

        {/* ── VERIFICATION ── */}
        {verifiedStatus !== "VERIFIED" && (
          <div className="glass rounded-2xl p-4 border border-primary/20 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🛡️</span>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {currentLang === "es" ? "Verificar identidad" : "Verify identity"}
                </h3>
                <p className="text-[10px] text-muted">
                  {currentLang === "es" ? "Los perfiles verificados reciben 3x más matches" : "Verified profiles get 3x more matches"}
                </p>
              </div>
            </div>
            <button className="w-full py-2.5 bg-primary/10 border border-primary/30 text-primary text-xs font-bold rounded-xl hover:bg-primary/20 transition">
              {currentLang === "es" ? "Solicitar verificación" : "Request verification"} →
            </button>
          </div>
        )}

        {/* ── QUICK LINKS ── */}
        <div className="space-y-2 pb-4">
          <button
            onClick={() => window.location.href = `/${currentLang}/onboarding`}
            className="w-full flex items-center gap-3 px-4 py-3 bg-white/3 hover:bg-white/6 border border-white/5 rounded-2xl text-sm text-muted hover:text-white transition"
          >
            <span>✨</span>
            <span>{currentLang === "es" ? "Completar onboarding" : "Complete onboarding"}</span>
            <svg viewBox="0 0 24 24" className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
          <button
            onClick={async () => {
              await supabase.auth.signOut().catch(() => {});
              document.cookie = "veloura-auth-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
              localStorage.removeItem("veloura_user");
              window.location.href = `/${currentLang}/login`;
            }}
            className="w-full flex items-center gap-3 px-4 py-3 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 rounded-2xl text-sm text-red-400 hover:text-red-300 transition"
          >
            <span>🚪</span>
            <span>{currentLang === "es" ? "Cerrar sesión" : (currentLang === "ru" ? "Выйти" : "Log out")}</span>
          </button>
        </div>
      </main>

      <MobileBottomNav currentLang={currentLang} active="options" />
    </div>
  );
}
