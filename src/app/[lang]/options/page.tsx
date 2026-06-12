"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Locale, getTranslation } from "../../../lib/i18n";
import AppHeader from "../../../components/AppHeader";
import MobileBottomNav from "../../../components/MobileBottomNav";
import { supabase } from "../../../lib/supabase/client";

export default function OptionsPage() {
  const params = useParams();
  const currentLang = (params.lang as Locale) || "es";
  const t = getTranslation(currentLang);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("veloura_user");
    if (!stored) {
      window.location.replace(`/${currentLang}/login`);
      return;
    }
    setCurrentUser(JSON.parse(stored));
  }, [currentLang]);

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {});
    document.cookie = "veloura-auth-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    localStorage.removeItem("veloura_user");
    window.location.href = `/${currentLang}/login`;
  };

  const handleDeleteProfile = async () => {
    try {
      setIsDeleting(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session) headers["Authorization"] = `Bearer ${session.access_token}`;

      // Call API DELETE method to delete internal profile/data (auth.users is NOT touched)
      const res = await fetch("/api/profile", {
        method: "DELETE",
        headers
      });

      if (res.ok) {
        // Sign out locally
        await supabase.auth.signOut().catch(() => {});
        document.cookie = "veloura-auth-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
        localStorage.removeItem("veloura_user");
        
        alert(currentLang === "es" ? "Perfil eliminado con éxito" : "Profile deleted successfully");
        window.location.href = `/${currentLang}/login`;
      } else {
        const data = await res.json();
        alert(data.error || "Error al eliminar el perfil");
      }
    } catch (err: any) {
      console.error("Error deleting profile:", err);
      alert("Error al eliminar el perfil");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <div className="fixed top-0 right-0 w-[50%] h-[50%] bg-[#D4A373]/5 blur-[130px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[50%] h-[50%] bg-[#FF6B8B]/5 blur-[130px] rounded-full pointer-events-none z-0" />

      <AppHeader
        currentLang={currentLang}
        title={currentLang === "es" ? "Opciones de cuenta" : (currentLang === "ru" ? "Опции" : "Options")}
      />

      <main className="flex-grow max-w-lg mx-auto w-full px-4 pt-4 pb-28 relative z-10 space-y-4">
        {currentUser && (
          <div className="glass rounded-2xl p-4 border border-white/5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-[#151F3C] border border-primary/20 shrink-0">
              {currentUser.profile?.mainPhotoUrl ? (
                <img src={currentUser.profile.mainPhotoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl text-primary font-bold">👤</div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-white text-base">{currentUser.profile?.firstName || "Usuario"}</h3>
              <p className="text-xs text-muted mt-0.5">{currentUser.email}</p>
            </div>
          </div>
        )}

        <div className="glass rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
          {/* Mi perfil */}
          <Link
            href={`/${currentLang}/profile`}
            className="flex items-center justify-between px-4 py-4 hover:bg-white/3 transition text-sm text-white font-medium"
          >
            <div className="flex items-center gap-3">
              <span>👤</span>
              <span>{currentLang === "es" ? "Mi perfil" : "My Profile"}</span>
            </div>
            <span className="text-muted">→</span>
          </Link>

          {/* VIP */}
          <Link
            href={`/${currentLang}/vip`}
            className="flex items-center justify-between px-4 py-4 hover:bg-white/3 transition text-sm text-white font-medium"
          >
            <div className="flex items-center gap-3">
              <span>👑</span>
              <span>VIP / Premium</span>
            </div>
            <span className="text-muted">→</span>
          </Link>

          {/* Verificación */}
          <Link
            href={`/${currentLang}/profile`}
            className="flex items-center justify-between px-4 py-4 hover:bg-white/3 transition text-sm text-white font-medium"
          >
            <div className="flex items-center gap-3">
              <span>🛡️</span>
              <span>{currentLang === "es" ? "Verificación de identidad" : "Verify identity"}</span>
            </div>
            <span className="text-muted">→</span>
          </Link>
        </div>

        <div className="glass rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
          {/* Cerrar sesión */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-white/3 transition text-sm text-white font-medium text-left"
          >
            <div className="flex items-center gap-3">
              <span>🚪</span>
              <span>{currentLang === "es" ? "Cerrar sesión" : "Log out"}</span>
            </div>
            <span className="text-muted">→</span>
          </button>

          {/* Eliminar perfil */}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-red-950/20 hover:text-red-300 transition text-sm text-red-400 font-medium text-left"
          >
            <div className="flex items-center gap-3">
              <span>🗑️</span>
              <span>{currentLang === "es" ? "Eliminar perfil" : "Delete profile"}</span>
            </div>
            <span className="text-red-400/60">→</span>
          </button>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="glass max-w-sm w-full p-6 rounded-3xl border border-red-500/20 text-center space-y-5">
            <span className="text-5xl block">⚠️</span>
            <h3 className="text-xl font-bold text-white">{currentLang === "es" ? "¿Eliminar tu cuenta?" : "Delete account?"}</h3>
            <p className="text-xs text-muted leading-relaxed">
              Esta acción es permanente. Se borrarán de forma inmediata todos tus datos de perfil, fotos, me gustas, matches y conversaciones del servidor.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleDeleteProfile}
                disabled={isDeleting}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-center text-sm shadow-md transition disabled:opacity-50"
              >
                {isDeleting ? "Eliminando..." : "Sí, eliminar definitivamente"}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl text-center text-sm transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileBottomNav currentLang={currentLang} active="options" />
    </div>
  );
}
