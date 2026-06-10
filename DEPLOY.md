# Guía de Despliegue de Veloura 🚀

Esta es la guía paso a paso para configurar, desplegar y compilar la aplicación **Veloura** tanto en la web (Vercel) como en dispositivos móviles (APK Android).

---

## 1. Configuración de Supabase (Base de Datos y Auth)

1. **Crear un Proyecto**: Ve a [Supabase](https://supabase.com) y crea un nuevo proyecto de base de datos PostgreSQL.
2. **Obtener las Claves**:
   - Copia la URL de tu proyecto (`Project URL`) y la clave Anon pública (`Anon Key`).
   - Copia la clave de servicio (`Service Role Key`) para operaciones administrativas en el servidor.
   - Ve a Settings -> Database -> Connection string y copia la URI de conexión en formato `Transaction` y `Session` para Prisma.
3. **Configuración de Autenticación**:
   - Ve a la sección **Auth** en Supabase.
   - Habilita el inicio de sesión por **Email/Password**.
   - (Opcional) Configura proveedores OAuth (Google / Apple Login) en la pestaña **Providers** introduciendo los Client IDs correspondientes.
4. **Habilitar Supabase Storage**:
   - Ve a **Storage** y crea un Bucket público llamado `photos`. Esto se utilizará para almacenar las fotos subidas por los usuarios.
   - Establece políticas de lectura pública para que las fotos se rendericen en la App.

---

## 2. Configuración de Prisma y Migraciones

Prisma se encarga del modelado de datos. Dado que configuramos el archivo `.env` localmente:

1. Modifica las variables `DATABASE_URL` y `DIRECT_URL` en el archivo `.env` con tus credenciales de Supabase.
2. Ejecuta la primera migración para crear todas las tablas en Supabase PostgreSQL:
   ```bash
   npx prisma migrate dev --name init
   ```
3. Genera el cliente Prisma local:
   ```bash
   npx prisma generate
   ```

---

## 3. Ejecución en Local

Para iniciar el servidor de desarrollo local de Next.js:

1. Instala las dependencias:
   ```bash
   npm install --legacy-peer-deps
   ```
2. Ejecuta el entorno de desarrollo:
   ```bash
   npm run dev
   ```
3. Abre [http://localhost:3000](http://localhost:3000) en tu navegador. Puedes probar el inicio de sesión y registro en modo demo o conectándolo a tu base de datos real.

---

## 4. Despliegue en Vercel (Frontend & Serverless API)

1. Empuja tu código a un repositorio de GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit veloura dating platform MVP"
   git remote add origin <tu-repositorio-github>
   git branch -M main
   git push -u origin main
   ```
2. Conecta el repositorio en la plataforma de [Vercel](https://vercel.com).
3. Añade las variables de entorno en el dashboard de tu proyecto en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `NEXT_PUBLIC_APP_URL` (URL de producción proporcionada por Vercel)
4. ¡Haz clic en **Deploy**! Vercel ejecutará automáticamente la compilación estática y las API Routes.

---

## 5. Compilación del APK Android mediante Capacitor

Para empaquetar Veloura como una aplicación móvil nativa con Capacitor:

1. **Generar el Build Estático**:
   Asegúrate de que Next.js exporte HTML estático para el contenedor nativo. Para esto, modifica `next.config.js` agregando `output: 'export'` si deseas empaquetar el código completo dentro del APK, o utiliza una configuración de redirección a tu URL de Vercel. 
   *(Nota: Nuestro código actual está listo para compilar con SSR/ISR en Vercel, por lo que la configuración del Webview de Capacitor apunta a la URL del servidor).*
   
2. **Inicializar Capacitor**:
   Si deseas agregar las plataformas nativas:
   ```bash
   npm i @capacitor/core @capacitor/cli
   npx cap init Veloura com.veloura.app --web-dir=out
   ```
3. **Agregar la Plataforma Android**:
   ```bash
   npm i @capacitor/android
   npx cap add android
   ```
4. **Sincronizar Recursos**:
   Copia los archivos web generados del build al proyecto nativo:
   ```bash
   npm run build
   npx cap sync
   ```
5. **Compilar el APK con Android Studio**:
   Abre el proyecto de Android Studio generado por Capacitor:
   ```bash
   npx cap open android
   ```
   - En Android Studio, ve a **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.
   - Una vez finalizado, Android Studio generará tu archivo `app-debug.apk` o `app-release.apk` listo para su instalación en teléfonos Android.
