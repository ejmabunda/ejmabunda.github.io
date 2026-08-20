"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "portfolio-theme";

type ThemeMode = "light" | "dark" | "system";

const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const LABELS: Record<ThemeMode, string> = {
  light: "Light theme active. Switch to dark theme.",
  dark: "Dark theme active. Switch to system theme.",
  system: "System theme active. Switch to light theme.",
};

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const dark = mode === "dark" || (mode === "system" && systemPrefersDark());

  if (dark) {
    root.setAttribute("data-theme", "dark");
  } else {
    root.removeAttribute("data-theme");
  }
}

function readStoredMode(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage unavailable (e.g. private browsing)
  }
  return "system";
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");

  // Reconcile with the mode the beforeInteractive init script (and any prior
  // visit) actually applied, since server-rendered markup can't know it.
  useEffect(() => {
    setMode(readStoredMode());
  }, []);

  // Keep a "system" selection live if the OS theme changes while the page
  // is open, rather than only picking it up on next load.
  useEffect(() => {
    if (mode !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [mode]);

  function handleClick() {
    const next = NEXT_MODE[mode];
    applyTheme(next);
    setMode(next);

    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (e.g. private browsing) — theme just won't persist
    }
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      data-mode={mode}
      aria-label={LABELS[mode]}
      onClick={handleClick}
    >
      <svg
        className="icon-moon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
      <svg
        className="icon-sun"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
      <svg
        className="icon-system"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    </button>
  );
}
