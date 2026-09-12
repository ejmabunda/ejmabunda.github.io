import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import Script from "next/script";
import { ADMIN_THEME_STORAGE_KEY } from "@/lib/adminTheme";

const instrumentSans = Instrument_Sans({
  variable: "--font-admin-sans",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-admin-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Admin — ejmabunda",
  robots: { index: false, follow: false },
};

// Runs before hydration so the admin console's own light/dark preference is
// applied before first paint, mirroring the public site's theme-init script
// but scoped to its own storage key and [data-admin-theme] attribute — see
// src/lib/adminTheme.ts.
const ADMIN_THEME_INIT_SCRIPT = `(function(){try{var t=window.localStorage.getItem('${ADMIN_THEME_STORAGE_KEY}');var dark=t==='dark'||(t!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-admin-theme',dark?'dark':'light');}catch(e){}})();`;

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`${instrumentSans.variable} ${ibmPlexMono.variable}`}>
      <Script id="admin-theme-init" strategy="beforeInteractive">
        {ADMIN_THEME_INIT_SCRIPT}
      </Script>
      {children}
    </div>
  );
}
