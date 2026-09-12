import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_THEME_STORAGE_KEY,
  applyAdminTheme,
  persistAdminTheme,
  resolveInitialAdminTheme,
} from "./adminTheme";

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-admin-theme");
  vi.unstubAllGlobals();
});

describe("resolveInitialAdminTheme", () => {
  it("returns a validly stored preference", () => {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, "dark");
    expect(resolveInitialAdminTheme()).toBe("dark");
  });

  it("ignores a garbage stored value and falls back to the OS preference", () => {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, "sepia");
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    expect(resolveInitialAdminTheme()).toBe("dark");
  });

  it("falls back to light when nothing is stored and the OS has no preference", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    expect(resolveInitialAdminTheme()).toBe("light");
  });
});

describe("applyAdminTheme / persistAdminTheme", () => {
  it("sets data-admin-theme on the document element", () => {
    applyAdminTheme("dark");
    expect(document.documentElement.getAttribute("data-admin-theme")).toBe(
      "dark"
    );
  });

  it("persists under its own storage key, independent of the site theme key", () => {
    persistAdminTheme("dark");
    expect(window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY)).toBe("dark");
    expect(window.localStorage.getItem("portfolio-theme")).toBeNull();
  });
});
