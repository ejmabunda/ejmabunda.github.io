/**
 * The admin console's own light/dark toggle. Deliberately independent of the
 * public site's `portfolio-theme` mechanism (own storage key, own
 * `data-admin-theme` attribute) per the console redesign — see
 * `docs/admin-console-handover.md`.
 */

export const ADMIN_THEME_STORAGE_KEY = "admin-theme";

export type AdminTheme = "light" | "dark";

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

/** Stored preference if present and valid, otherwise the OS preference. */
export function resolveInitialAdminTheme(): AdminTheme {
  try {
    const stored = window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage unavailable (e.g. private browsing)
  }
  return systemPrefersDark() ? "dark" : "light";
}

export function applyAdminTheme(theme: AdminTheme): void {
  document.documentElement.setAttribute("data-admin-theme", theme);
}

export function persistAdminTheme(theme: AdminTheme): void {
  try {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage unavailable — theme just won't persist
  }
}
