"use client";

import { useEffect, useState } from "react";
import {
  applyAdminTheme,
  resolveAppliedAdminTheme,
  resolveStoredAdminThemePreference,
  setAdminThemePreference,
  subscribeToAdminThemePreference,
  type AdminThemePreference,
} from "@/lib/adminTheme";

const NEXT: Record<AdminThemePreference, AdminThemePreference> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const LABEL: Record<AdminThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export default function AdminThemeToggle() {
  const [preference, setPreference] =
    useState<AdminThemePreference>("system");

  // Reconcile with whatever the beforeInteractive init script actually
  // applied, since server-rendered markup can't know it — and apply it
  // ourselves too, in case that script didn't run for some reason.
  useEffect(() => {
    const resolved = resolveStoredAdminThemePreference();
    setPreference(resolved);
    applyAdminTheme(resolveAppliedAdminTheme(resolved));
  }, []);

  // Stay in sync with every other mounted toggle — the desktop header and
  // the mobile "more" panel each render their own instance of this.
  useEffect(() => subscribeToAdminThemePreference(setPreference), []);

  // While "system" is selected, follow live OS theme changes instead of
  // only picking them up on next page load.
  useEffect(() => {
    if (preference !== "system") return;
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setAdminThemePreference("system");
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [preference]);

  function handleClick() {
    setAdminThemePreference(NEXT[preference]);
  }

  const appliedTheme = resolveAppliedAdminTheme(preference);
  const ariaLabel = `Theme: ${LABEL[preference]}${
    preference === "system" ? ` (${appliedTheme})` : ""
  }. Click to switch to ${LABEL[NEXT[preference]]}.`;

  return (
    <button
      type="button"
      className="admin-theme-toggle"
      aria-label={ariaLabel}
      onClick={handleClick}
    >
      <span className="admin-theme-toggle-dot" aria-hidden="true" />
      {LABEL[preference]}
    </button>
  );
}
