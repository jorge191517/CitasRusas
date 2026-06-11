# AUDIT_CRITICAL_FLOW.md — Veloura APK
**Fecha:** 2026-06-11 | **Versión auditada:** post-fix

---

## 1. Flujo real auditado

### Abrir APK
- `capacitor.config.json` → `server.url = /es/auth-redirect`
- La APK carga **`/es/auth-redirect`** (página pública, excluida del middleware)
- La página splash revisa `supabase.auth.getSession()` client-side
- **Si hay sesión** → consulta `/api/profile` → redirige a `/dashboard` o `/onboarding`
- **Si no hay sesión** → redirige a `/login`

### Login
- `login/page.tsx` usa `getPostLoginRedirect()` como única fuente de verdad
- NO hay `autoFocus` en ningún input → **teclado NO se abre automáticamente**
- Después de login exitoso → `window.location.replace()` inmediato

### Registro
- `register/page.tsx` → `supabase.auth.signUp()` → redirige a `/onboarding`
- `localStorage` solo se usa como cache visual

### Onboarding
- Verifica sesión real con `supabase.auth.getSession()` al montar
- Al finalizar → `PATCH /api/profile` con `profileCompleted: true`
- API usa `prisma.profile.upsert()` → crea si no existe, actualiza si existe
- Redirige a `/dashboard` con `window.location.replace()`

### Login posterior (sesión ya guardada)
1. APK abre `/es/auth-redirect`
2. `getSession()` encuentra sesión en localStorage de Supabase
3. `/api/profile` devuelve `profileCompleted: true`
4. Redirige a `/es/dashboard` directamente

### Logout
- Botón logout llama `supabase.auth.signOut()`
- Limpia `localStorage.removeItem("veloura_user")`
- Redirige a `/login`

---

## 2. Problemas corregidos

| # | Problema | Estado |
|---|----------|--------|
| 1 | Teclado se abre al entrar (autofocus) | ✅ CORREGIDO — eliminado en login |
| 2 | Login no redirige | ✅ CORREGIDO — usa `replace()` + helper central |
| 3 | Sesión no persiste en WebView | ✅ CORREGIDO — `auth-redirect` revisa sesión client-side |
| 4 | Onboarding se repite | ✅ CORREGIDO — `profileCompleted` persistido en Supabase |
| 5 | `prisma.profile.update()` falla si no existe | ✅ CORREGIDO — cambiado a `upsert()` |
| 6 | `localStorage` usado como fuente de verdad | ✅ CORREGIDO — solo cache secundaria |
| 7 | Middleware redirige a login antes de sesión | ✅ CORREGIDO — `auth-redirect` es ruta pública |
| 8 | Columnas faltantes en Supabase | ✅ CORREGIDO — `npx prisma db push` ejecutado |
| 9 | Keyboard `adjustResize` encoge WebView | ✅ CORREGIDO — `adjustPan` en AndroidManifest |

---

## 3. Archivos modificados en esta auditoría

| Archivo | Cambio |
|---------|--------|
| `src/lib/auth-routing.ts` | **NUEVO** — Helper central de redirección |
| `src/app/[lang]/login/page.tsx` | Reescrito — sin autoFocus, usa helper central |
| `src/app/[lang]/auth-redirect/page.tsx` | **NUEVO** — Splash page de entrada APK |
| `src/app/[lang]/debug-auth/page.tsx` | **NUEVO** — Solo development |
| `src/app/[lang]/onboarding/page.tsx` | Auth desde Supabase real, no localStorage |
| `src/app/api/profile/route.ts` | `update()` → `upsert()` en PATCH |
| `src/middleware.ts` | Excluye `auth-redirect` y `debug-auth` |
| `android/app/src/main/AndroidManifest.xml` | `adjustPan`, permisos cámara/media |
| `capacitor.config.json` | `server.url` apunta a `/es/auth-redirect` |
| `src/app/globals.css` | Fixes mobile viewport, font-size, dvh |

---

## 4. Fuente de verdad — Arquitectura final

```
APK arranca
    ↓
/es/auth-redirect  (pública)
    ↓
supabase.auth.getSession()
    ↓
/api/profile?Bearer token
    ↓
profileCompleted?
    ├── true  → /es/dashboard
    └── false → /es/onboarding
```

**Regla:** `localStorage` solo se actualiza DESPUÉS de confirmar sesión real.
Nunca se usa para decidir rutas críticas.

---

## 5. Flujo a probar en la APK

1. Abrir APK → debe mostrar spinner/logo → luego ir a login (si no hay sesión)
2. Introducir credenciales → teclado NO debe abrirse solo
3. Tocar email input manualmente → teclado aparece SIN encoger la pantalla
4. Login → debe ir a dashboard o onboarding sin quedarse bloqueado
5. Cerrar APK completamente → volver a abrir → debe ir directo a dashboard
6. Cerrar sesión → volver a abrir → debe ir a login
