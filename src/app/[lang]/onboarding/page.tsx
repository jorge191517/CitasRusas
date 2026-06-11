"use client";

import React, { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase/client";
import { Locale, getTranslation } from "../../../lib/i18n";

const MAX_PHOTOS = 5;
const MAX_VIDEO_SECONDS = 40;
const LOOKING_FOR_OPTIONS = [
  { value: "friendship", label: { es: "Amistad", en: "Friendship", ru: "Дружба" } },
  { value: "relationship", label: { es: "Relación", en: "Relationship", ru: "Отношения" } },
  { value: "serious", label: { es: "Relación seria", en: "Serious relationship", ru: "Серьёзные отношения" } },
  { value: "marriage", label: { es: "Matrimonio", en: "Marriage", ru: "Брак" } },
  { value: "cultural", label: { es: "Intercambio cultural", en: "Cultural exchange", ru: "Культурный обмен" } },
];

export default function OnboardingPage() {
  const params = useParams();
  const currentLang = (params.lang as Locale) || "es";
  const t = getTranslation(currentLang);

  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 5;

  // Step 1 — Fotos
  const [mainPhoto, setMainPhoto] = useState<File | null>(null);
  const [mainPhotoPreview, setMainPhotoPreview] = useState<string>("");
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const mainPhotoRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Step 2 — Datos personales
  const [firstName, setFirstName] = useState("");
  const [gender, setGender] = useState("FEMALE");
  const [country, setCountry] = useState("");
  const [birthDate, setBirthDate] = useState("");

  // Step 3 — Intereses
  const [interestInput, setInterestInput] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [hobbyInput, setHobbyInput] = useState("");
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState("relationship");

  // Step 4 — Bio e idiomas
  const [bio, setBio] = useState("");
  const [langInput, setLangInput] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);

  // Step 5 — Vídeo
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [videoError, setVideoError] = useState("");
  const videoRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // SOURCE OF TRUTH: Supabase Auth session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.location.replace(`/${currentLang}/login`);
          return;
        }

        // Build user object from session
        const sessionUser = {
          id: session.user.id,
          email: session.user.email,
          profile: null as any,
        };

        // Derive a firstName from email if not yet set
        const emailName = (session.user.email || "").split("@")[0].replace(/[._-]/g, " ").trim();
        const defaultName = emailName.length >= 2 ? emailName : "Usuario";

        // Try to prefill from localStorage cache (secondary)
        try {
          const stored = localStorage.getItem("veloura_user");
          if (stored) {
            const cached = JSON.parse(stored);
            if (cached.id === session.user.id && cached.profile) {
              sessionUser.profile = cached.profile;
              setFirstName(cached.profile.firstName || defaultName);
              setGender(cached.profile.gender || "FEMALE");
              setCountry(cached.profile.country || "");
              setBirthDate(cached.profile.birthDate || "");
            } else {
              setFirstName(defaultName);
            }
          } else {
            setFirstName(defaultName);
          }
        } catch (_) {
          setFirstName(defaultName);
        }

        setCurrentUser(sessionUser);
      } catch (err) {
        console.error("Onboarding auth error:", err);
        window.location.replace(`/${currentLang}/login`);
      }
    };
    initAuth();
  }, [currentLang]);

  // ─── STEP 1: Foto principal ───────────────────────────────────
  const handleMainPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("La foto no puede superar 10 MB.");
      return;
    }
    setError("");
    setMainPhoto(file);
    setMainPhotoPreview(URL.createObjectURL(file));
  };

  const handleGalleryPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_PHOTOS - galleryFiles.length;
    if (remaining <= 0) {
      setError(`Máximo ${MAX_PHOTOS} fotos de galería.`);
      return;
    }
    const toAdd = files.slice(0, remaining).filter(f => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024);
    if (toAdd.length < files.length) setError("Algunas fotos fueron ignoradas (tipo o tamaño inválido).");
    else setError("");
    setGalleryFiles(prev => [...prev, ...toAdd]);
    setGalleryPreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))]);
  };

  const removeGalleryPhoto = (idx: number) => {
    setGalleryFiles(prev => prev.filter((_, i) => i !== idx));
    setGalleryPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  // ─── STEP 3: Intereses / Hobbies ──────────────────────────────
  const addInterest = () => {
    const v = interestInput.trim();
    if (v && !interests.includes(v) && interests.length < 10) {
      setInterests([...interests, v]);
      setInterestInput("");
    }
  };
  const addHobby = () => {
    const v = hobbyInput.trim();
    if (v && !hobbies.includes(v) && hobbies.length < 10) {
      setHobbies([...hobbies, v]);
      setHobbyInput("");
    }
  };

  // ─── STEP 4: Idiomas ──────────────────────────────────────────
  const addLanguage = () => {
    const v = langInput.trim().toLowerCase();
    if (v && !languages.includes(v) && languages.length < 6) {
      setLanguages([...languages, v]);
      setLangInput("");
    }
  };

  // ─── STEP 5: Vídeo ────────────────────────────────────────────
  const handleVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideoError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setVideoError("Solo se permiten archivos de vídeo.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setVideoError("El vídeo no puede superar 100 MB.");
      return;
    }
    // Check duration via HTML5 video element
    const url = URL.createObjectURL(file);
    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.onloadedmetadata = () => {
      if (vid.duration > MAX_VIDEO_SECONDS) {
        setVideoError(`El vídeo supera los ${MAX_VIDEO_SECONDS} segundos. Duración: ${Math.round(vid.duration)}s.`);
        setVideoFile(null);
        setVideoPreview("");
      } else {
        setVideoFile(file);
        setVideoPreview(url);
      }
    };
    vid.src = url;
  };

  // ─── Navegación entre pasos ───────────────────────────────────
  const nextStep = () => {
    setError("");
    if (step === 1 && !mainPhoto) {
      setError("La foto principal es obligatoria para continuar.");
      return;
    }
    if (step === 2) {
      if (!country.trim()) { setError("Introduce tu país."); return; }
      if (!birthDate) { setError("Introduce tu fecha de nacimiento."); return; }
    }
    if (step < TOTAL_STEPS) setStep(s => s + 1);
  };

  const prevStep = () => {
    setError("");
    if (step > 1) setStep(s => s - 1);
  };

  // ─── Upload helper (Supabase Storage) ────────────────────────
  // Converts file to base64 data URL — persistent, can be stored in DB
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    // 1. Try Supabase Storage (public bucket 'profile-media')
    try {
      const { data, error } = await supabase.storage
        .from("profile-media")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (!error && data) {
        const { data: pub } = supabase.storage.from("profile-media").getPublicUrl(data.path);
        const publicUrl = pub.publicUrl;
        // Verify it's a real https URL, not a blob
        if (publicUrl && publicUrl.startsWith("https://")) {
          console.log("[UPLOAD] Supabase Storage OK:", publicUrl);
          return publicUrl;
        }
      }
      console.warn("[UPLOAD] Supabase Storage failed:", error?.message, "— using base64 fallback");
    } catch (storageErr) {
      console.warn("[UPLOAD] Supabase Storage exception:", storageErr);
    }

    // 2. Fallback: convert to base64 data URL (persistent — works without Storage bucket)
    // IMPORTANT: base64 URLs are stored in DB and always work. Max ~2MB recommended.
    if (file.size <= 2 * 1024 * 1024) {
      const base64 = await fileToBase64(file);
      console.log("[UPLOAD] Using base64 fallback, size:", Math.round(file.size / 1024), "KB");
      return base64;
    }

    // 3. File too large for base64 — compress it first
    const compressedBase64 = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
    console.log("[UPLOAD] Using compressed base64 fallback");
    return compressedBase64;
  };

  // ─── SUBMIT FINAL ─────────────────────────────────────────────
  const handleFinish = async () => {
    if (!mainPhoto) {
      setError("La foto principal es obligatoria.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      // Always get userId + token from real Supabase session, not from state
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        window.location.replace(`/${currentLang}/login`);
        return;
      }
      const userId = authSession.user.id;
      if (!userId) throw new Error("Usuario no autenticado.");
      const authToken = authSession.access_token;

      // Upload main photo
      const mainPhotoUrl = await uploadFile(mainPhoto, `${userId}/main_${Date.now()}`);

      // Upload gallery
      const galleryUrls: string[] = [];
      for (let i = 0; i < galleryFiles.length; i++) {
        const url = await uploadFile(galleryFiles[i], `${userId}/gallery_${i}_${Date.now()}`);
        galleryUrls.push(url);
      }

      // Upload video (optional)
      let videoUrl = "";
      if (videoFile) {
        videoUrl = await uploadFile(videoFile, `${userId}/video_${Date.now()}`);
      }

      // Build profile payload
      // firstName is required by Zod schema (min 2 chars)
      const safeFirstName = firstName.trim().length >= 2 ? firstName.trim() : (currentUser?.email || "").split("@")[0].replace(/[._-]/g, " ").trim() || "Usuario";

      const profilePayload = {
        userId,
        firstName: safeFirstName,
        lastName: "",
        gender,
        country: country.trim(),
        birthDate,
        interests,
        hobbies,
        lookingFor,
        bio: bio.trim(),
        languages: languages.length > 0 ? languages : ["es"],
        mainPhotoUrl,
        videoIntroUrl: videoUrl || undefined,
        profileCompleted: true,  // ← Mark as completed
        photos: [mainPhotoUrl, ...galleryUrls].filter(Boolean),
      };

      if (process.env.NODE_ENV === "development") {
        console.log("[ONBOARDING] PATCH payload profileCompleted:", profilePayload.profileCompleted);
        console.log("[ONBOARDING] PATCH payload mainPhotoUrl:", profilePayload.mainPhotoUrl);
      }

      // PATCH API (Mandatory)
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers,
        body: JSON.stringify(profilePayload),
      });
      const resData = await response.json();

      if (process.env.NODE_ENV === "development") {
        console.log("[ONBOARDING] PATCH response profileCompleted:", resData?.profile?.profileCompleted);
        console.log("[ONBOARDING] PATCH response mainPhotoUrl:", resData?.profile?.mainPhotoUrl);
      }

      if (!response.ok) {
        let errMsg = "No se pudo guardar el perfil en el servidor.";
        if (resData && resData.error) {
          if (typeof resData.error === "string") {
            errMsg = resData.error;
          } else {
            errMsg = JSON.stringify(resData.error);
          }
        }
        throw new Error(errMsg);
      }

      // Verify profileCompleted was actually saved
      if (resData?.profile?.profileCompleted !== true) {
        throw new Error("El perfil no se marcó como completado en el servidor. Inténtalo de nuevo.");
      }

      // Update localStorage cache with real data from server response
      try {
        const stored = localStorage.getItem("veloura_user");
        const base = stored ? JSON.parse(stored) : { id: userId, email: currentUser?.email };
        const updated = {
          ...base,
          profile: {
            ...(base.profile || {}),
            ...(resData?.profile || {}),
            profileCompleted: true,
          }
        };
        localStorage.setItem("veloura_user", JSON.stringify(updated));
      } catch (_) {}

      // ✅ Redirect to DASHBOARD using replace
      window.location.replace(`/${currentLang}/dashboard`);
    } catch (err: any) {
      console.error("Onboarding finish error:", err);
      setError(err.message || "Error al guardar el perfil.");
    } finally {
      setLoading(false);
    }
  };

  const stepTitles: Record<number, string> = {
    1: currentLang === "es" ? "📸 Tu foto" : (currentLang === "ru" ? "📸 Фото" : "📸 Your photo"),
    2: currentLang === "es" ? "👤 Sobre ti" : (currentLang === "ru" ? "👤 О себе" : "👤 About you"),
    3: currentLang === "es" ? "🎯 Intereses" : (currentLang === "ru" ? "🎯 Интересы" : "🎯 Interests"),
    4: currentLang === "es" ? "✍️ Bio e idiomas" : (currentLang === "ru" ? "✍️ Bio и языки" : "✍️ Bio & languages"),
    5: currentLang === "es" ? "🎥 Vídeo opcional" : (currentLang === "ru" ? "🎥 Видео (необяз.)" : "🎥 Optional video"),
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-[#D4A373]/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-[#FF6B8B]/10 blur-[150px] rounded-full" />

      <div className="w-full max-w-lg glass p-6 sm:p-8 rounded-[32px] border border-primary/20 space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center">
          <Link href={`/${currentLang}/dashboard`} className="flex items-center justify-center space-x-2 mb-4">
            <svg viewBox="0 0 512 512" className="w-8 h-8 text-primary" fill="currentColor">
              <path d="M256,120 C230,80 180,80 150,110 C120,140 120,190 150,220 L256,330 L362,220 C392,190 392,140 362,110 C332,80 282,80 256,120 Z" fill="none" stroke="currentColor" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M256,170 C240,140 200,140 180,160 C160,180 160,210 180,230 L256,305 L332,230 C352,210 352,180 332,160 C312,140 272,140 256,170 Z" fill="none" stroke="#FF6B8B" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-xl font-bold tracking-widest text-primary font-serif">VELOURA</span>
          </Link>
          <h1 className="text-xl font-extrabold text-white">{stepTitles[step]}</h1>
          <p className="text-xs text-muted mt-1">
            {currentLang === "es" ? `Paso ${step} de ${TOTAL_STEPS}` : `Step ${step} of ${TOTAL_STEPS}`}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex gap-1.5 justify-center">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i + 1 <= step ? "bg-primary w-8" : "bg-white/10 w-4"}`}
            />
          ))}
        </div>

        {/* ── STEP 1: Fotos ── */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            {/* Foto principal */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-2">
                {currentLang === "es" ? "Foto principal *" : "Main photo *"}
              </label>
              <div
                onClick={() => mainPhotoRef.current?.click()}
                className={`w-full aspect-square max-h-56 rounded-2xl border-2 border-dashed transition cursor-pointer flex items-center justify-center overflow-hidden relative ${mainPhotoPreview ? "border-primary/40" : "border-white/20 hover:border-primary/40"}`}
              >
                {mainPhotoPreview ? (
                  <img src={mainPhotoPreview} alt="Main" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="text-center space-y-2">
                    <div className="text-4xl">📷</div>
                    <p className="text-xs text-muted">{currentLang === "es" ? "Toca para añadir foto" : "Tap to add photo"}</p>
                  </div>
                )}
              </div>
              <input ref={mainPhotoRef} type="file" accept="image/*" className="hidden" onChange={handleMainPhoto} />
              {mainPhotoPreview && (
                <button
                  type="button"
                  onClick={() => { setMainPhoto(null); setMainPhotoPreview(""); }}
                  className="mt-2 text-xs text-red-400 hover:underline"
                >
                  ✕ {currentLang === "es" ? "Eliminar" : "Remove"}
                </button>
              )}
            </div>

            {/* Galería */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-2">
                {currentLang === "es" ? `Galería (máx. ${MAX_PHOTOS} fotos)` : `Gallery (max ${MAX_PHOTOS} photos)`}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {galleryPreviews.map((src, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-[#0A1128] border border-white/10">
                    <img src={src} alt={`Gallery ${idx}`} className="absolute inset-0 w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeGalleryPhoto(idx)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-600 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {galleryPreviews.length < MAX_PHOTOS && (
                  <div
                    onClick={() => galleryRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-white/15 hover:border-primary/40 flex items-center justify-center cursor-pointer transition text-muted text-2xl"
                  >
                    +
                  </div>
                )}
              </div>
              <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryPhotos} />
              <p className="text-[10px] text-muted mt-1">{galleryPreviews.length}/{MAX_PHOTOS} fotos</p>
            </div>
          </div>
        )}

        {/* ── STEP 2: Datos personales ── */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                {currentLang === "es" ? "Género" : (currentLang === "ru" ? "Пол" : "Gender")}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["MALE", "FEMALE", "OTHER"].map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition ${gender === g ? "bg-primary text-background border-primary" : "bg-white/5 border-white/10 text-muted hover:border-primary/40"}`}
                  >
                    {g === "MALE" ? (currentLang === "es" ? "Hombre" : "Male") : g === "FEMALE" ? (currentLang === "es" ? "Mujer" : "Female") : (currentLang === "es" ? "Otro" : "Other")}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                {currentLang === "es" ? "País" : (currentLang === "ru" ? "Страна" : "Country")}
              </label>
              <input
                type="text"
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm"
                placeholder="España, Rusia, Letonia..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                {currentLang === "es" ? "Fecha de nacimiento" : (currentLang === "ru" ? "Дата рождения" : "Birth date")}
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().split("T")[0]}
                className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm"
              />
            </div>
          </div>
        )}

        {/* ── STEP 3: Intereses ── */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            {/* Intereses */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-2">
                {currentLang === "es" ? "Intereses" : (currentLang === "ru" ? "Интересы" : "Interests")}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={interestInput}
                  onChange={e => setInterestInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addInterest())}
                  className="flex-grow px-3 py-2 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white text-xs focus:outline-none focus:border-primary"
                  placeholder="Viajes, Arte, Música..."
                />
                <button type="button" onClick={addInterest} className="px-3 bg-primary text-background font-bold rounded-xl text-sm hover:opacity-90">+</button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-2">
                {interests.map(i => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-full text-[11px] text-primary">
                    {i}<button type="button" onClick={() => setInterests(interests.filter(x => x !== i))} className="text-red-400 font-bold ml-1">✕</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Hobbies */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-2">
                {currentLang === "es" ? "Hobbies" : (currentLang === "ru" ? "Хобби" : "Hobbies")}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={hobbyInput}
                  onChange={e => setHobbyInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addHobby())}
                  className="flex-grow px-3 py-2 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white text-xs focus:outline-none focus:border-primary"
                  placeholder="Senderismo, Cocina, Yoga..."
                />
                <button type="button" onClick={addHobby} className="px-3 bg-primary text-background font-bold rounded-xl text-sm hover:opacity-90">+</button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-2">
                {hobbies.map(h => (
                  <span key={h} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FF6B8B]/10 border border-[#FF6B8B]/20 rounded-full text-[11px] text-[#FF6B8B]">
                    {h}<button type="button" onClick={() => setHobbies(hobbies.filter(x => x !== h))} className="text-red-400 font-bold ml-1">✕</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Qué busca */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-2">
                {currentLang === "es" ? "¿Qué buscas?" : (currentLang === "ru" ? "Что ищете?" : "What are you looking for?")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {LOOKING_FOR_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLookingFor(opt.value)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition text-left ${lookingFor === opt.value ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/10 text-muted hover:border-primary/40"}`}
                  >
                    {opt.label[currentLang as keyof typeof opt.label] || opt.label.es}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Bio e idiomas ── */}
        {step === 4 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <label className="block text-xs font-semibold text-muted mb-2">
                {currentLang === "es" ? "Cuéntanos algo sobre ti" : (currentLang === "ru" ? "Расскажите о себе" : "Tell us about yourself")}
              </label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, 300))}
                rows={4}
                className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm resize-none"
                placeholder={currentLang === "es" ? "Cuéntanos quién eres, qué te apasiona y qué buscas en esta plataforma..." : "Tell us who you are, your passions and what you seek here..."}
              />
              <p className="text-[10px] text-muted text-right">{bio.length}/300</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-2">
                {currentLang === "es" ? "Idiomas que hablas" : (currentLang === "ru" ? "Языки" : "Spoken languages")}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={langInput}
                  onChange={e => setLangInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addLanguage())}
                  className="flex-grow px-3 py-2 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white text-xs focus:outline-none focus:border-primary"
                  placeholder="es, en, ru, de..."
                />
                <button type="button" onClick={addLanguage} className="px-3 bg-primary text-background font-bold rounded-xl text-sm hover:opacity-90">+</button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-2">
                {languages.map(l => (
                  <span key={l} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 rounded-full text-[11px] text-white uppercase font-bold">
                    {l}<button type="button" onClick={() => setLanguages(languages.filter(x => x !== l))} className="text-red-400 font-bold ml-1">✕</button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: Vídeo ── */}
        {step === 5 && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-[#151F3C]/60 rounded-2xl p-4 border border-white/10 space-y-2">
              <p className="text-xs text-muted">
                {currentLang === "es"
                  ? `Opcional: Añade un vídeo de presentación de máximo ${MAX_VIDEO_SECONDS} segundos. Los perfiles con vídeo reciben más conexiones.`
                  : `Optional: Add a ${MAX_VIDEO_SECONDS}-second intro video. Profiles with video get more connections.`}
              </p>
            </div>

            {!videoPreview ? (
              <div
                onClick={() => videoRef.current?.click()}
                className="w-full h-36 rounded-2xl border-2 border-dashed border-white/20 hover:border-primary/40 flex items-center justify-center cursor-pointer transition"
              >
                <div className="text-center space-y-2">
                  <div className="text-4xl">🎥</div>
                  <p className="text-xs text-muted">{currentLang === "es" ? "Toca para añadir vídeo" : "Tap to add video"}</p>
                  <p className="text-[10px] text-muted/60">Max {MAX_VIDEO_SECONDS}s · MP4, MOV, WEBM</p>
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-primary/30">
                <video src={videoPreview} controls className="w-full rounded-2xl max-h-48" />
                <button
                  type="button"
                  onClick={() => { setVideoFile(null); setVideoPreview(""); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-red-600 rounded-full text-white text-xs font-bold flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            )}

            <input ref={videoRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={handleVideo} />

            {videoError && <p className="text-red-400 text-xs font-medium">{videoError}</p>}

            <div className="bg-[#0A1128]/60 rounded-xl p-3 border border-white/5">
              <p className="text-[11px] text-muted">
                {currentLang === "es"
                  ? "Puedes saltar este paso. Siempre podrás añadir el vídeo más tarde desde tu perfil."
                  : "You can skip this step. You can always add the video later from your profile."}
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && <p className="text-red-400 text-xs text-center font-medium">{error}</p>}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-sm border border-white/10 transition"
            >
              ← {currentLang === "es" ? "Atrás" : "Back"}
            </button>
          )}

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex-grow py-3 bg-premium-gold text-background font-bold rounded-xl text-sm transition hover:opacity-90"
            >
              {currentLang === "es" ? "Continuar" : "Continue"} →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={loading}
              className="flex-grow py-3 bg-premium-gold text-background font-bold rounded-xl text-sm hover:opacity-90 disabled:opacity-50 transition shadow-md"
            >
              {loading
                ? (currentLang === "es" ? "Guardando..." : "Saving...")
                : (currentLang === "es" ? "🚀 Completar perfil" : "🚀 Complete profile")}
            </button>
          )}
        </div>

        {/* Skip link for step 5 */}
        {step === 5 && (
          <p className="text-center">
            <button
              type="button"
              onClick={() => window.location.replace(`/${currentLang}/dashboard`)}
              className="text-xs text-muted hover:text-white underline transition"
            >
              {currentLang === "es" ? "Saltar y entrar a la app →" : "Skip and enter the app →"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
