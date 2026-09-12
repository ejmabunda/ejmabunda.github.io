"use client";

import { useEffect, useState } from "react";
import {
  applyAdminTheme,
  persistAdminTheme,
  resolveInitialAdminTheme,
  type AdminTheme,
} from "@/lib/adminTheme";

export default function AdminThemeToggle() {
  const [theme, setTheme] = useState<AdminTheme>("light");

  // Reconcile with whatever the beforeInteractive init script actually
  // applied, since server-rendered markup can't know it.
  useEffect(() => {
    setTheme(resolveInitialAdminTheme());
  }, []);

  function handleClick() {
    const next: AdminTheme = theme === "dark" ? "light" : "dark";
    applyAdminTheme(next);
    persistAdminTheme(next);
    setTheme(next);
  }

  const ariaLabel =
    theme === "dark"
      ? "Dark theme active. Switch to light theme."
      : "Light theme active. Switch to dark theme.";

  return (
    <button
      type="button"
      className="admin-theme-toggle"
      aria-label={ariaLabel}
      onClick={handleClick}
    >
      <span className="admin-theme-toggle-dot" aria-hidden="true" />
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}
