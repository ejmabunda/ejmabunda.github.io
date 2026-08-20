import type { Metadata } from "next";
import { Caprasimo, Figtree } from "next/font/google";
import Script from "next/script";
import { profile } from "@/content/profile";
import { site } from "@/content/site";
import "./globals.css";

const caprasimo = Caprasimo({
  variable: "--font-heading",
  weight: "400",
  subsets: ["latin"],
});

const figtree = Figtree({
  variable: "--font-body",
  weight: ["400", "600", "700"],
  subsets: ["latin"],
});

// Runs before hydration (next/script beforeInteractive) so the correct theme
// is applied before first paint — avoids a flash of the wrong theme without
// needing any React state for it. Mirrors ThemeToggle's mode resolution:
// explicit 'dark'/'light' win outright, and anything else (including no
// stored preference yet) falls back to the OS setting.
const THEME_INIT_SCRIPT = `(function(){try{var t=window.localStorage.getItem('portfolio-theme');var dark=t==='dark'||(t!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(dark){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`;

const title = `${profile.name} — ${profile.subtitle}`;

export const metadata: Metadata = {
  metadataBase: new URL(`https://${site.domain}`),
  title,
  description: profile.bio,
  openGraph: {
    title,
    description: profile.bio,
    url: `https://${site.domain}`,
    siteName: profile.name,
    images: [profile.photo.src],
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description: profile.bio,
    images: [profile.photo.src],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${caprasimo.variable} ${figtree.variable}`}
    >
      <body className="antialiased">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        {children}
      </body>
    </html>
  );
}
