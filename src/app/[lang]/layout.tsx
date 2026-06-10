import "../globals.css";
import type { Metadata } from "next";
import { locales, Locale } from "../../lib/i18n";
import React from "react";

export const metadata: Metadata = {
  title: "Veloura - Premium International Dating",
  description: "Connecting hearts without borders. Meeting people in Spain, Russia, Ukraine, Baltic countries, and all of Europe.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Veloura",
  },
};

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function RootLayout({ children, params }: LayoutProps) {
  const { lang } = await params;
  const currentLang = locales.includes(lang as Locale) ? lang : "es";

  return (
    <html lang={currentLang} className="h-full">
      <body className="h-full bg-background text-foreground antialiased overflow-x-hidden">
        <div className="flex flex-col min-h-screen">
          {children}
        </div>
        
        {/* PWA Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
