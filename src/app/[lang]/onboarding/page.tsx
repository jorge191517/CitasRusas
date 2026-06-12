"use client";

import React, { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase/client";
import { Locale, getTranslation } from "../../../lib/i18n";

const MAX_PHOTOS = 5;
const MAX_VIDEO_SECONDS = 40;

// ── Selectable chip data ──────────────────────────────────────────────────────
const INTEREST_OPTIONS = [
  "Música","Viajes","Cine","Arte","Fotografía","Lectura","Deportes","Cocina",
  "Naturaleza","Tecnología","Moda","Baile","Fitness","Animales","Cultura",
  "Idiomas","Playa","Montaña","Café","Voluntariado"
];

const HOBBY_OPTIONS = [
  "Senderismo","Gimnasio","Yoga","Correr","Bailar","Cocinar","Ver películas",
  "Leer","Pintar","Tocar música","Viajar","Aprender idiomas","Fotografía",
  "Ir a conciertos","Pasear","Videojuegos","Ciclismo","Natación","Jardinería",
  "Salir con amigos"
];

const LANGUAGE_OPTIONS = [
  { value: "Español", flag: "🇪🇸" },
  { value: "Inglés", flag: "🇬🇧" },
  { value: "Ruso", flag: "🇷🇺" },
  { value: "Ucraniano", flag: "🇺🇦" },
  { value: "Letón", flag: "🇱🇻" },
  { value: "Francés", flag: "🇫🇷" },
  { value: "Alemán", flag: "🇩🇪" },
  { value: "Italiano", flag: "🇮🇹" },
  { value: "Portugués", flag: "🇵🇹" },
  { value: "Polaco", flag: "🇵🇱" },
];

const BIO_OPTIONS = [
  "Me gusta conocer personas auténticas y compartir buenos momentos.",
  "Busco una conexión sincera, con respeto y buena conversación.",
  "Soy una persona tranquila, curiosa y con ganas de vivir nuevas experiencias.",
  "Me encanta viajar, aprender de otras culturas y conocer gente interesante.",
  "Valoro la honestidad, el sentido del humor y las conversaciones profundas.",
  "Soy un hombre tranquilo, trabajador y me gustaría conocer a alguien especial.",
  "Me gusta cuidar los detalles y compartir planes sencillos pero bonitos.",
  "Soy una mujer auténtica, alegre y me gusta conectar con personas sinceras.",
  "Valoro la confianza, el respeto y una buena conversación.",
];

const LOOKING_FOR_OPTIONS = [
  { value: "friendship",    label: { es: "Amistad",              en: "Friendship",           ru: "Дружба" } },
  { value: "relationship",  label: { es: "Relación",             en: "Relationship",         ru: "Отношения" } },
  { value: "serious",       label: { es: "Relación seria",       en: "Serious relationship", ru: "Серьёзные отношения" } },
  { value: "marriage",      label: { es: "Matrimonio",           en: "Marriage",             ru: "Брак" } },
  { value: "cultural",      label: { es: "Intercambio cultural", en: "Cultural exchange",    ru: "Культурный обмен" } },
];

const INTERESTED_IN_OPTIONS = [
  { value: "women",         label: { es: "Mujeres",                     en: "Women",          ru: "Женщин" } },
  { value: "men",           label: { es: "Hombres",                     en: "Men",            ru: "Мужчин" } },
  { value: "men_and_women", label: { es: "Hombres y mujeres",           en: "Men & women",    ru: "Мужчин и женщин" } },
  { value: "everyone",      label: { es: "Todos",                       en: "Everyone",       ru: "Всех" } },
  { value: "any_gender",    label: { es: "Personas de cualquier género", en: "Any gender",    ru: "Любого пола" } },
];

const GENDER_OPTIONS = [
  { value: "MALE",   label: { es: "Hombre",            en: "Man",             ru: "Мужчина" } },
  { value: "FEMALE", label: { es: "Mujer",             en: "Woman",           ru: "Женщина" } },
  { value: "OTHER",  label: { es: "Otro / No binario", en: "Other/Non-binary",ru: "Другое" } },
];

// ── Chip component ────────────────────────────────────────────────────────────
function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
        selected
          ? "bg-primary text-background border-primary shadow-sm"
          : "bg-white/5 border-white/10 text-muted hover:border-primary/40 hover:bg-primary/10"
      }`}
    >
      {label}
    </button>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function FullPageSpinner({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted text-sm">{message}</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const params = useParams();
  const currentLang = (params.lang as Locale) || "es";
  const t = getTranslation(currentLang);

  // 6 steps:
  // 1 — Fotos
  // 2 — Género + ¿A quién buscas?
  // 3 — Datos personales
  // 4 — Intereses + Hobbies + ¿Qué buscas?
  // 5 — Bio + Idiomas
  // 6 — Vídeo (opcional)
  const TOTAL_STEPS = 6;
  const [step, setStep] = useState(1);

  // ── CRITICAL: These two flags gate ALL rendering ───────────────────────────
  // `initializing` = true while we are fetching /api/profile
  // `redirecting`  = true once we know profile is complete and we triggered navigation
  // Both prevent the form from flashing before navigation completes in WebView
  const [initializing, setInitializing] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  // ── STEP 1: Fotos ─────────────────────────────────────────────────────────
  const [mainPhoto, setMainPhoto] = useState<File | null>(null);
  const [mainPhotoPreview, setMainPhotoPreview] = useState<string>("");
  // Already-saved Supabase URLs (NOT blob URLs)
  const [existingMainPhotoUrl, setExistingMainPhotoUrl] = useState<string>("");
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [existingGalleryUrls, setExistingGalleryUrls] = useState<string[]>([]);
  const mainPhotoRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // ── STEP 2: Género + interestedIn ─────────────────────────────────────────
  const [gender, setGender] = useState("FEMALE");
  const [interestedIn, setInterestedIn] = useState("men");

  // ── STEP 3: Datos personales ──────────────────────────────────────────────
  const [firstName, setFirstName] = useState("");
  const [country, setCountry] = useState("");
  const [birthDate, setBirthDate] = useState("");

  // ── STEP 4: Intereses + Hobbies + lookingFor ──────────────────────────────
  const [interests, setInterests] = useState<string[]>([]);
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState("relationship");

  // ── STEP 5: Bio + Idiomas ─────────────────────────────────────────────────
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);

  // ── STEP 6: Vídeo ─────────────────────────────────────────────────────────
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [videoError, setVideoError] = useState("");
  const videoRef = useRef<HTMLInputElement>(null);

  // ── Submit state ──────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // ── Init: check auth + load existing profile ──────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // 1. Get real Supabase session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          if (isMounted) {
            setRedirecting(true);
            window.location.replace(`/${currentLang}/login`);
          }
          return;
        }

        if (isMounted) {
          setCurrentUser({ id: session.user.id, email: session.user.email });
        }

        // 2. Fetch real profile from API — MUST wait for this before rendering form
        let profileData: any = null;
        try {
          const res = await fetch("/api/profile", {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (res.ok) {
            profileData = await res.json();
          }
        } catch (fetchErr) {
          // Network error — continue to show form with empty data
          if (process.env.NODE_ENV === "development") {
            console.warn("[ONBOARDING] Could not fetch profile:", fetchErr);
          }
        }

        const profile = profileData?.profile;

        if (process.env.NODE_ENV === "development") {
          console.log("[ONBOARDING] profile loaded:", profile);
          console.log("[ONBOARDING] profileCompleted:", profile?.profileCompleted);
          console.log("[ONBOARDING] mainPhotoUrl:", profile?.mainPhotoUrl);
          console.log("[ONBOARDING] photos:", profile?.photos);
        }

        // 3. CRITICAL: If profile is already complete → redirect to dashboard immediately
        //    Set redirecting=true BEFORE calling window.location.replace() so that
        //    even if finally/setInitializing(false) fires, the form is never shown.
        if (profile?.profileCompleted === true) {
          if (process.env.NODE_ENV === "development") {
            console.log("[ONBOARDING] redirecting to dashboard — profile already complete");
          }
          if (isMounted) {
            setRedirecting(true); // ← keeps spinner visible, prevents form flash
          }
          window.location.replace(`/${currentLang}/dashboard`);
          return; // stop here — finally will still run but redirecting=true blocks render
        }

        // 4. Profile exists but NOT completed — pre-fill all available data
        if (profile && isMounted) {
          if (profile.firstName) setFirstName(profile.firstName);
          if (profile.gender) setGender(profile.gender);
          if (profile.country) setCountry(profile.country);
          if (profile.birthDate) setBirthDate(profile.birthDate.split("T")[0]);
          if (profile.interestedIn) setInterestedIn(profile.interestedIn);
          if (profile.interests?.length) setInterests(profile.interests);
          if (profile.hobbies?.length) setHobbies(profile.hobbies);
          if (profile.lookingFor) setLookingFor(profile.lookingFor);
          if (profile.bio) setBio(profile.bio);
          if (profile.languages?.length) setLanguages(profile.languages);

          // Load existing main photo (must be a real http URL, NOT blob:)
          if (profile.mainPhotoUrl && profile.mainPhotoUrl.startsWith("http")) {
            setExistingMainPhotoUrl(profile.mainPhotoUrl);
            setMainPhotoPreview(profile.mainPhotoUrl);
          }

          // Load existing gallery photos
          const galleryUrls: string[] = (profile.photos || []).filter(
            (u: string) => u && u.startsWith("http")
          );
          if (galleryUrls.length) {
            setExistingGalleryUrls(galleryUrls);
            setGalleryPreviews(galleryUrls);
          }
        } else if (!profile && isMounted) {
          // No profile yet — derive name from email
          const emailName = (session.user.email || "")
            .split("@")[0]
            .replace(/[._-]/g, " ")
            .trim();
          setFirstName(emailName.length >= 2 ? emailName : "Usuario");
        }

      } catch (err) {
        console.error("[ONBOARDING] init error:", err);
        if (isMounted) {
          setRedirecting(true);
          window.location.replace(`/${currentLang}/login`);
        }
      } finally {
        // Only stop the loading spinner if we are NOT redirecting
        // (redirecting=true means we still want spinner while navigation happens)
        if (isMounted) {
          setInitializing(false);
          // NOTE: if redirecting=true, the render guard below will still show spinner
        }
      }
    };

    initAuth();

    return () => { isMounted = false; };
  }, [currentLang]);

  // ── Photo handlers ────────────────────────────────────────────────────────
  const handleMainPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Solo se permiten imágenes."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("La foto no puede superar 10 MB."); return; }
    setError("");
    setMainPhoto(file);
    setMainPhotoPreview(URL.createObjectURL(file));
    setExistingMainPhotoUrl(""); // new file overrides existing URL
  };

  const handleGalleryPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const currentTotal = galleryFiles.length + existingGalleryUrls.length;
    const remaining = MAX_PHOTOS - currentTotal;
    if (remaining <= 0) { setError(`Máximo ${MAX_PHOTOS} fotos de galería.`); return; }
    const toAdd = files.slice(0, remaining).filter(
      f => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024
    );
    setError("");
    setGalleryFiles(prev => [...prev, ...toAdd]);
    setGalleryPreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))]);
  };

  const removeGalleryPhoto = (idx: number) => {
    if (idx < existingGalleryUrls.length) {
      // Remove from existing saved gallery
      setExistingGalleryUrls(prev => prev.filter((_, i) => i !== idx));
      setGalleryPreviews(prev => prev.filter((_, i) => i !== idx));
    } else {
      const newIdx = idx - existingGalleryUrls.length;
      setGalleryFiles(prev => prev.filter((_, i) => i !== newIdx));
      const newPreviews = galleryPreviews.filter(p => !existingGalleryUrls.includes(p));
      setGalleryPreviews([...existingGalleryUrls, ...newPreviews.filter((_, i) => i !== newIdx)]);
    }
  };

  // ── Video handler ─────────────────────────────────────────────────────────
  const handleVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVideoError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) { setVideoError("Solo se permiten archivos de vídeo."); return; }
    if (file.size > 100 * 1024 * 1024) { setVideoError("El vídeo no puede superar 100 MB."); return; }
    const url = URL.createObjectURL(file);
    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.onloadedmetadata = () => {
      if (vid.duration > MAX_VIDEO_SECONDS) {
        setVideoError(`El vídeo supera los ${MAX_VIDEO_SECONDS}s. Duración: ${Math.round(vid.duration)}s.`);
        setVideoFile(null); setVideoPreview("");
      } else {
        setVideoFile(file); setVideoPreview(url);
      }
    };
    vid.src = url;
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const nextStep = () => {
    setError("");
    if (step === 1) {
      const hasMainPhoto = mainPhoto || existingMainPhotoUrl;
      if (!hasMainPhoto) { setError("La foto principal es obligatoria para continuar."); return; }
    }
    if (step === 2) {
      if (!gender) { setError("Selecciona tu género."); return; }
      if (!interestedIn) { setError("Selecciona a quién quieres conocer."); return; }
    }
    if (step === 3) {
      if (!firstName.trim() || firstName.trim().length < 2) { setError("Introduce tu nombre (mínimo 2 caracteres)."); return; }
      if (!country.trim()) { setError("Introduce tu país."); return; }
      if (!birthDate) { setError("Introduce tu fecha de nacimiento."); return; }
    }
    if (step === 4) {
      if (interests.length === 0) { setError("Selecciona al menos 1 interés."); return; }
      if (hobbies.length === 0) { setError("Selecciona al menos 1 hobby."); return; }
    }
    if (step === 5) {
      if (!bio.trim()) { setError("Selecciona o escribe una descripción."); return; }
      if (languages.length === 0) { setError("Selecciona al menos 1 idioma."); return; }
    }
    if (step < TOTAL_STEPS) setStep(s => s + 1);
  };

  const prevStep = () => {
    setError("");
    if (step > 1) setStep(s => s - 1);
  };

  // ── Upload helper (Supabase Storage) ────────────────────────────────────
  const uploadFile = async (file: File, path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from("profile-media")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw new Error(`Error al subir archivo: ${error.message}`);
    if (!data) throw new Error("No se pudo obtener la información del archivo subido.");
    const { data: pub } = supabase.storage.from("profile-media").getPublicUrl(data.path);
    const publicUrl = pub.publicUrl;
    if (!publicUrl || publicUrl.startsWith("blob:") || !publicUrl.startsWith("http")) {
      throw new Error("La URL devuelta por Supabase no es válida.");
    }
    return publicUrl;
  };

  // ── Final submit ──────────────────────────────────────────────────────────
  const handleFinish = async () => {
    // Final validation
    const hasMainPhoto = mainPhoto || existingMainPhotoUrl;
    if (!hasMainPhoto) { setError("La foto principal es obligatoria."); return; }
    if (!firstName.trim() || firstName.trim().length < 2) { setError("El nombre es obligatorio."); return; }
    if (!gender) { setError("Selecciona tu género."); return; }
    if (!interestedIn) { setError("Selecciona a quién te interesa conocer."); return; }
    if (!country.trim()) { setError("Introduce tu país."); return; }
    if (!birthDate) { setError("Introduce tu fecha de nacimiento."); return; }
    if (interests.length === 0) { setError("Selecciona al menos 1 interés."); return; }
    if (hobbies.length === 0) { setError("Selecciona al menos 1 hobby."); return; }
    if (!bio.trim()) { setError("Selecciona o escribe una descripción."); return; }
    if (languages.length === 0) { setError("Selecciona al menos 1 idioma."); return; }

    setLoading(true);
    setError("");

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        setRedirecting(true);
        window.location.replace(`/${currentLang}/login`);
        return;
      }

      const userId = authSession.user.id;
      const authToken = authSession.access_token;

      // ── Upload main photo only if a NEW file was selected ──
      let finalMainPhotoUrl = existingMainPhotoUrl;
      if (mainPhoto) {
        finalMainPhotoUrl = await uploadFile(mainPhoto, `${userId}/main_${Date.now()}`);
      }

      if (!finalMainPhotoUrl || !finalMainPhotoUrl.startsWith("http")) {
        throw new Error("No se pudo obtener una URL válida para la foto principal.");
      }

      // ── Upload new gallery photos (existing ones are already URLs) ──
      const newGalleryUrls: string[] = [];
      for (let i = 0; i < galleryFiles.length; i++) {
        const url = await uploadFile(galleryFiles[i], `${userId}/gallery_${Date.now()}_${i}`);
        newGalleryUrls.push(url);
      }
      const allGalleryUrls = [...existingGalleryUrls, ...newGalleryUrls];

      // ── Upload video (optional) ──
      let videoUrl = "";
      if (videoFile) {
        videoUrl = await uploadFile(videoFile, `${userId}/video_${Date.now()}`);
      }

      const safeFirstName = firstName.trim().length >= 2 ? firstName.trim() : "Usuario";

      // ── Build complete payload ──
      const profilePayload = {
        userId,
        firstName: safeFirstName,
        lastName: "",
        gender,
        interestedIn,
        country: country.trim(),
        birthDate,
        interests,
        hobbies,
        lookingFor,
        bio: bio.trim(),
        languages: languages.length > 0 ? languages : ["Español"],
        mainPhotoUrl: finalMainPhotoUrl,
        videoIntroUrl: videoUrl || undefined,
        profileCompleted: true,
        photos: [finalMainPhotoUrl, ...allGalleryUrls].filter(Boolean),
      };

      if (process.env.NODE_ENV === "development") {
        console.log("[ONBOARDING] sending PATCH profileCompleted:", profilePayload.profileCompleted);
        console.log("[ONBOARDING] sending PATCH mainPhotoUrl:", profilePayload.mainPhotoUrl);
        console.log("[ONBOARDING] sending PATCH photos:", profilePayload.photos);
        console.log("[ONBOARDING] sending PATCH interestedIn:", profilePayload.interestedIn);
      }

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify(profilePayload),
      });

      const resData = await response.json();

      if (process.env.NODE_ENV === "development") {
        console.log("[ONBOARDING] PATCH response profileCompleted:", resData?.profile?.profileCompleted);
        console.log("[ONBOARDING] PATCH response mainPhotoUrl:", resData?.profile?.mainPhotoUrl);
        console.log("[ONBOARDING] PATCH response interestedIn:", resData?.profile?.interestedIn);
      }

      if (!response.ok) {
        let errMsg = "No se pudo guardar el perfil en el servidor.";
        if (resData?.error) {
          errMsg = typeof resData.error === "string" ? resData.error : JSON.stringify(resData.error);
        }
        throw new Error(errMsg);
      }

      if (resData?.profile?.profileCompleted !== true) {
        throw new Error("El perfil no se marcó como completado. Inténtalo de nuevo.");
      }

      // Update localStorage cache
      try {
        const stored = localStorage.getItem("veloura_user");
        const base = stored ? JSON.parse(stored) : { id: userId, email: currentUser?.email };
        localStorage.setItem("veloura_user", JSON.stringify({
          ...base,
          profile: {
            ...(base.profile || {}),
            ...(resData.profile || {}),
            profileCompleted: true,
          },
        }));
      } catch (_) {}

      if (process.env.NODE_ENV === "development") {
        console.log("[ONBOARDING] redirecting to dashboard — profile saved successfully");
      }

      // ✅ Set redirecting=true BEFORE replace() to block any re-render showing form
      setRedirecting(true);
      window.location.replace(`/${currentLang}/dashboard`);

    } catch (err: any) {
      console.error("[ONBOARDING] finish error:", err);
      setError(err.message || "Error al guardar el perfil.");
      setLoading(false);
    }
    // NOTE: no finally setLoading(false) here — if success, page navigates away
  };

  // ── Step titles ───────────────────────────────────────────────────────────
  const stepTitles: Record<number, string> = {
    1: currentLang === "ru" ? "📸 Фото" : "📸 Tu foto",
    2: currentLang === "ru" ? "💫 Пол и интерес" : "💫 Género e interés",
    3: currentLang === "ru" ? "👤 О себе" : "👤 Sobre ti",
    4: currentLang === "ru" ? "🎯 Интересы" : "🎯 Intereses",
    5: currentLang === "ru" ? "✍️ Bio и языки" : "✍️ Bio e idiomas",
    6: currentLang === "ru" ? "🎥 Видео (необяз.)" : "🎥 Vídeo opcional",
  };

  // ── RENDER GUARD ──────────────────────────────────────────────────────────
  // Show spinner while:
  // (a) initializing = true → waiting for /api/profile response
  // (b) redirecting  = true → navigation triggered, waiting for WebView to navigate
  // This is the KEY fix: even if setInitializing(false) fires after redirect,
  // `redirecting=true` keeps the spinner and PREVENTS the form from showing.
  if (initializing || redirecting) {
    const msg = redirecting
      ? (currentLang === "ru" ? "Entrando..." : "Entrando...")
      : (currentLang === "ru" ? "Cargando..." : "Cargando perfil...");
    return <FullPageSpinner message={msg} />;
  }

  // ── Combined gallery display ──────────────────────────────────────────────
  // existingGalleryUrls = Supabase http:// URLs already in DB
  // galleryPreviews includes blob: URLs for new files pending upload
  const newBlobPreviews = galleryPreviews.filter(p => !existingGalleryUrls.includes(p) && p.startsWith("blob:"));
  const allDisplayedPreviews = [...existingGalleryUrls, ...newBlobPreviews];
  const totalGallery = allDisplayedPreviews.length;

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-[#D4A373]/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-[#FF6B8B]/10 blur-[150px] rounded-full" />

      <div className="w-full max-w-lg glass p-6 sm:p-8 rounded-[32px] border border-primary/20 space-y-6 relative z-10">

        {/* ── Header ── */}
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
            {currentLang === "ru" ? `Шаг ${step} из ${TOTAL_STEPS}` : `Paso ${step} de ${TOTAL_STEPS}`}
          </p>
        </div>

        {/* ── Step Indicator ── */}
        <div className="flex gap-1.5 justify-center">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i + 1 <= step ? "bg-primary w-8" : "bg-white/10 w-4"}`}
            />
          ))}
        </div>

        {/* ────────────── STEP 1: Fotos ────────────── */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            {/* Foto principal */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-2">
                {currentLang === "ru" ? "Главное фото *" : "Foto principal *"}
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
                    <p className="text-xs text-muted">{currentLang === "ru" ? "Нажмите, чтобы добавить фото" : "Toca para añadir foto"}</p>
                  </div>
                )}
              </div>
              <input ref={mainPhotoRef} type="file" accept="image/*" className="hidden" onChange={handleMainPhoto} />
              {mainPhotoPreview && (
                <div className="mt-2 flex items-center gap-3">
                  {existingMainPhotoUrl && !mainPhoto && (
                    <span className="text-[10px] text-green-400 font-semibold">✓ Foto guardada</span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMainPhoto(null);
                      setMainPhotoPreview("");
                      setExistingMainPhotoUrl("");
                    }}
                    className="text-xs text-red-400 hover:underline"
                  >
                    ✕ {currentLang === "ru" ? "Удалить" : "Eliminar"}
                  </button>
                </div>
              )}
            </div>

            {/* Galería */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-2">
                {currentLang === "ru" ? `Галерея (макс. ${MAX_PHOTOS} фото)` : `Galería (máx. ${MAX_PHOTOS} fotos)`}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {allDisplayedPreviews.map((src, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-[#0A1128] border border-white/10">
                    <img src={src} alt={`Gallery ${idx}`} className="absolute inset-0 w-full h-full object-cover" />
                    {existingGalleryUrls.includes(src) && (
                      <span className="absolute bottom-1 left-1 text-[8px] bg-green-500/80 text-white px-1 rounded">✓</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeGalleryPhoto(idx)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-600 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {totalGallery < MAX_PHOTOS && (
                  <div
                    onClick={() => galleryRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-white/15 hover:border-primary/40 flex items-center justify-center cursor-pointer transition text-muted text-2xl"
                  >
                    +
                  </div>
                )}
              </div>
              <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryPhotos} />
              <p className="text-[10px] text-muted mt-1">{totalGallery}/{MAX_PHOTOS} fotos</p>
            </div>
          </div>
        )}

        {/* ────────────── STEP 2: Género + ¿A quién buscas? ────────────── */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <label className="block text-xs font-semibold text-muted mb-3">
                {currentLang === "ru" ? "Твой пол" : "Tu género"}
              </label>
              <div className="grid grid-cols-1 gap-2">
                {GENDER_OPTIONS.map(g => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGender(g.value)}
                    className={`py-3 px-4 rounded-xl text-sm font-bold border transition text-left ${gender === g.value ? "bg-primary text-background border-primary" : "bg-white/5 border-white/10 text-white hover:border-primary/40"}`}
                  >
                    {g.label[currentLang as keyof typeof g.label] || g.label.es}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-3">
                {currentLang === "ru" ? "Кого хочешь встретить?" : "¿A quién quieres conocer?"}
              </label>
              <div className="grid grid-cols-1 gap-2">
                {INTERESTED_IN_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setInterestedIn(opt.value)}
                    className={`py-3 px-4 rounded-xl text-sm font-bold border transition text-left ${interestedIn === opt.value ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/10 text-muted hover:border-primary/40"}`}
                  >
                    {opt.label[currentLang as keyof typeof opt.label] || opt.label.es}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ────────────── STEP 3: Datos personales ────────────── */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                {currentLang === "ru" ? "Имя" : "Tu nombre"}
              </label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-sm"
                placeholder="Ana, María, Carlos..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                {currentLang === "ru" ? "Страна" : "País"}
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
                {currentLang === "ru" ? "Дата рождения" : "Fecha de nacimiento"}
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

        {/* ────────────── STEP 4: Intereses + Hobbies + ¿Qué buscas? ────────────── */}
        {step === 4 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <label className="block text-xs font-semibold text-muted mb-2">
                {currentLang === "ru" ? "Интересы" : "Intereses"}{" "}
                <span className="text-primary">({interests.length} {currentLang === "ru" ? "выбрано" : "seleccionados"})</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map(opt => (
                  <Chip
                    key={opt}
                    label={opt}
                    selected={interests.includes(opt)}
                    onClick={() => setInterests(prev =>
                      prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]
                    )}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-2">
                {currentLang === "ru" ? "Хобби" : "Hobbies"}{" "}
                <span className="text-primary">({hobbies.length} {currentLang === "ru" ? "выбрано" : "seleccionados"})</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {HOBBY_OPTIONS.map(opt => (
                  <Chip
                    key={opt}
                    label={opt}
                    selected={hobbies.includes(opt)}
                    onClick={() => setHobbies(prev =>
                      prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]
                    )}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-2">
                {currentLang === "ru" ? "Что ищете?" : "¿Qué buscas?"}
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

        {/* ────────────── STEP 5: Bio + Idiomas ────────────── */}
        {step === 5 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <label className="block text-xs font-semibold text-muted mb-2">
                {currentLang === "ru" ? "О себе — выберите или напишите" : "Sobre ti — elige o escribe"}
              </label>
              <div className="space-y-2 mb-3">
                {BIO_OPTIONS.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setBio(opt)}
                    className={`w-full text-left py-2.5 px-3 rounded-xl text-xs border transition ${bio === opt ? "bg-primary/20 border-primary text-white" : "bg-white/5 border-white/10 text-muted hover:border-primary/30"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, 300))}
                rows={3}
                className="w-full px-4 py-2.5 bg-[#0A1128]/80 border border-primary/20 rounded-xl text-white focus:outline-none focus:border-primary text-xs resize-none"
                placeholder={currentLang === "ru" ? "Или напишите сами..." : "O escribe algo propio..."}
              />
              <p className="text-[10px] text-muted text-right">{bio.length}/300</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-2">
                {currentLang === "ru" ? "Языки" : "Idiomas que hablas"}{" "}
                <span className="text-primary">({languages.length} {currentLang === "ru" ? "выбрано" : "seleccionados"})</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map(lang => (
                  <Chip
                    key={lang.value}
                    label={`${lang.flag} ${lang.value}`}
                    selected={languages.includes(lang.value)}
                    onClick={() => setLanguages(prev =>
                      prev.includes(lang.value) ? prev.filter(x => x !== lang.value) : [...prev, lang.value]
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ────────────── STEP 6: Vídeo opcional ────────────── */}
        {step === 6 && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-[#151F3C]/60 rounded-2xl p-4 border border-white/10">
              <p className="text-xs text-muted">
                {currentLang === "ru"
                  ? `Необязательно: добавьте видео не более ${MAX_VIDEO_SECONDS} секунд.`
                  : `Opcional: Añade un vídeo de presentación de máximo ${MAX_VIDEO_SECONDS} segundos.`}
              </p>
            </div>

            {!videoPreview ? (
              <div
                onClick={() => videoRef.current?.click()}
                className="w-full h-36 rounded-2xl border-2 border-dashed border-white/20 hover:border-primary/40 flex items-center justify-center cursor-pointer transition"
              >
                <div className="text-center space-y-2">
                  <div className="text-4xl">🎥</div>
                  <p className="text-xs text-muted">{currentLang === "ru" ? "Нажмите для добавления видео" : "Toca para añadir vídeo"}</p>
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
                {currentLang === "ru"
                  ? "Можно пропустить этот шаг. Видео можно добавить позже в профиле."
                  : "Puedes saltar este paso. Siempre podrás añadir el vídeo más tarde desde tu perfil."}
              </p>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <p className="text-red-400 text-xs text-center font-medium">{error}</p>
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <button
              type="button"
              onClick={prevStep}
              disabled={loading}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-sm border border-white/10 transition disabled:opacity-40"
            >
              ← {currentLang === "ru" ? "Назад" : "Atrás"}
            </button>
          )}

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex-grow py-3 bg-premium-gold text-background font-bold rounded-xl text-sm transition hover:opacity-90"
            >
              {currentLang === "ru" ? "Продолжить" : "Continuar"} →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={loading}
              className="flex-grow py-3 bg-premium-gold text-background font-bold rounded-xl text-sm hover:opacity-90 disabled:opacity-50 transition shadow-md"
            >
              {loading
                ? (currentLang === "ru" ? "Guardando..." : "Guardando...")
                : (currentLang === "ru" ? "🚀 Завершить" : "🚀 Completar perfil")}
            </button>
          )}
        </div>

        {/* Skip video step */}
        {step === 6 && (
          <p className="text-center">
            <button
              type="button"
              onClick={handleFinish}
              disabled={loading}
              className="text-xs text-muted hover:text-white underline transition disabled:opacity-50"
            >
              {currentLang === "ru" ? "Пропустить и завершить →" : "Saltar vídeo y completar perfil →"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
