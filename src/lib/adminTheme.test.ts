import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_THEME_STORAGE_KEY,
  applyAdminTheme,
  persistAdminThemePreference,
  resolveAppliedAdminTheme,
  resolveStoredAdminThemePreference,
  setAdminThemePreference,
  subscribeToAdminThemePreference,
} from "./adminTheme";

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-admin-theme");
  vi.unstubAllGlobals();
});

describe("resolveStoredAdminThemePreference", () => {
  it("returns a validly stored preference", () => {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, "dark");
    expect(resolveStoredAdminThemePreference()).toBe("dark");
  });

  it("returns a stored 'system' preference", () => {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, "system");
    expect(resolveStoredAdminThemePreference()).toBe("system");
  });

  it("defaults to 'system' when nothing is stored", () => {
    expect(resolveStoredAdminThemePreference()).toBe("system");
  });

  it("ignores a garbage stored value and defaults to 'system'", () => {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, "sepia");
    expect(resolveStoredAdminThemePreference()).toBe("system");
  });
});

describe("resolveAppliedAdminTheme", () => {
  it("resolves 'system' to the OS preference", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    expect(resolveAppliedAdminTheme("system")).toBe("dark");

    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    expect(resolveAppliedAdminTheme("system")).toBe("light");
  });

  it("passes an explicit light/dark preference through unchanged", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    expect(resolveAppliedAdminTheme("light")).toBe("light");
    expect(resolveAppliedAdminTheme("dark")).toBe("dark");
  });
});

describe("applyAdminTheme / persistAdminThemePreference", () => {
  it("sets data-admin-theme on the document element", () => {
    applyAdminTheme("dark");
    expect(document.documentElement.getAttribute("data-admin-theme")).toBe(
      "dark"
    );
  });

  it("persists under its own storage key, independent of the site theme key", () => {
    persistAdminThemePreference("system");
    expect(window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY)).toBe(
      "system"
    );
    expect(window.localStorage.getItem("portfolio-theme")).toBeNull();
  });
});

describe("setAdminThemePreference", () => {
  it("persists the preference and applies the theme it resolves to", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    setAdminThemePreference("system");

    expect(window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY)).toBe(
      "system"
    );
    expect(document.documentElement.getAttribute("data-admin-theme")).toBe(
      "dark"
    );
  });

  it("notifies subscribers of the new preference", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToAdminThemePreference(onChange);

    setAdminThemePreference("light");

    expect(onChange).toHaveBeenCalledWith("light");
    unsubscribe();
  });

  it("stops notifying a subscriber after it unsubscribes", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToAdminThemePreference(onChange);
    unsubscribe();

    setAdminThemePreference("dark");

    expect(onChange).not.toHaveBeenCalled();
  });
});
