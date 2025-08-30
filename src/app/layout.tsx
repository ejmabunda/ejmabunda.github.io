import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const IBMPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: "500"
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: "100"
});

export const metadata: Metadata = {
  title: "Junior Mabunda - Software Engineer",
  description: "Portfolio website of Junior Mabunda, a WeThinkCode_ student, and aspiring software engineer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
