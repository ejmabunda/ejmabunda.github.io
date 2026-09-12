/**
 * The admin console's own light/dark/system theme preference. Deliberately
 * independent of the public site's `portfolio-theme` mechanism (own storage
 * key, own `data-admin-theme` attribute) per the console redesign — see
 * `docs/admin-console-handover.md`.
 *
 * A "preference" is what's stored/chosen (light, dark, or system); the
 * "applied" theme is always resolved down to light or dark — system just
 * means "whatever the OS says right now," tracked live while it's selected
 * rather than only checked once at load.
 */

export const ADMIN_THEME_STORAGE_KEY = "admin-theme";

const CHANGE_EVENT = "admin-theme-preference-change";

export type AdminThemePreference = "light" | "dark" | "system";
export type AdminTheme = "light" | "dark";

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

/** Stored preference if present and valid, otherwise "system" — detecting
 *  the OS preference is the default until the user picks something else. */
export function resolveStoredAdminThemePreference(): AdminThemePreference {
  try {
    const stored = window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage unavailable (e.g. private browsing)
  }
  return "system";
}

/** Resolves a preference down to the actual value to render the page in. */
export function resolveAppliedAdminTheme(
  preference: AdminThemePreference
): AdminTheme {
  if (preference === "system") return systemPrefersDark() ? "dark" : "light";
  return preference;
}

export function applyAdminTheme(theme: AdminTheme): void {
  document.documentElement.setAttribute("data-admin-theme", theme);
}

export function persistAdminThemePreference(
  preference: AdminThemePreference
): void {
  try {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, preference);
  } catch {
    // localStorage unavailable — preference just won't persist
  }
}

/**
 * Sets the preference, applies the theme it resolves to, and notifies every
 * other mounted toggle — there's more than one at a time (the desktop
 * header and the mobile "more" panel each render their own), and without
 * this they'd each hold their own stale copy of the choice until next
 * remount.
 */
export function setAdminThemePreference(
  preference: AdminThemePreference
): void {
  persistAdminThemePreference(preference);
  applyAdminTheme(resolveAppliedAdminTheme(preference));
  window.dispatchEvent(
    new CustomEvent<AdminThemePreference>(CHANGE_EVENT, {
      detail: preference,
    })
  );
}

export function subscribeToAdminThemePreference(
  callback: (preference: AdminThemePreference) => void
): () => void {
  function handleChange(event: Event) {
    callback((event as CustomEvent<AdminThemePreference>).detail);
  }
  window.addEventListener(CHANGE_EVENT, handleChange);
  return () => window.removeEventListener(CHANGE_EVENT, handleChange);
}
