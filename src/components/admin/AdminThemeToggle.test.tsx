import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminThemeToggle from "./AdminThemeToggle";
import { ADMIN_THEME_STORAGE_KEY } from "@/lib/adminTheme";

/** A minimal MediaQueryList stub that actually supports add/removeEventListener,
 *  so the live system-theme-tracking effect has something to attach to. */
function stubMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<(e: { matches: boolean }) => void>();
  const mql = {
    get matches() {
      return matches;
    },
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
      listeners.add(cb);
    },
    removeEventListener: (
      _: string,
      cb: (e: { matches: boolean }) => void
    ) => {
      listeners.delete(cb);
    },
  };
  vi.stubGlobal("matchMedia", () => mql);
  return {
    setMatches(next: boolean) {
      matches = next;
      listeners.forEach((cb) => cb({ matches }));
    },
  };
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-admin-theme");
  vi.unstubAllGlobals();
});

describe("AdminThemeToggle", () => {
  it("defaults to System when nothing is stored, detecting the OS preference", () => {
    stubMatchMedia(true);
    render(<AdminThemeToggle />);

    expect(screen.getByRole("button")).toHaveTextContent("System");
  });

  it("cycles System → Light → Dark → System, persisting and applying each", () => {
    stubMatchMedia(false);
    render(<AdminThemeToggle />);
    const button = screen.getByRole("button");

    fireEvent.click(button);
    expect(button).toHaveTextContent("Light");
    expect(document.documentElement.getAttribute("data-admin-theme")).toBe(
      "light"
    );
    expect(window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY)).toBe(
      "light"
    );

    fireEvent.click(button);
    expect(button).toHaveTextContent("Dark");
    expect(document.documentElement.getAttribute("data-admin-theme")).toBe(
      "dark"
    );
    expect(window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY)).toBe("dark");

    fireEvent.click(button);
    expect(button).toHaveTextContent("System");
    expect(window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY)).toBe(
      "system"
    );
  });

  it("respects a previously stored explicit choice instead of the OS default", () => {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, "dark");
    stubMatchMedia(false);
    render(<AdminThemeToggle />);

    expect(screen.getByRole("button")).toHaveTextContent("Dark");
  });

  it("keeps every mounted instance in sync with a change made in another", () => {
    stubMatchMedia(false);
    render(
      <>
        <AdminThemeToggle />
        <AdminThemeToggle />
      </>
    );
    const [first, second] = screen.getAllByRole("button");

    fireEvent.click(first);

    expect(first).toHaveTextContent("Light");
    expect(second).toHaveTextContent("Light");
  });

  it("follows a live OS theme change while System is selected", () => {
    const media = stubMatchMedia(false);
    render(<AdminThemeToggle />);

    expect(document.documentElement.getAttribute("data-admin-theme")).toBe(
      "light"
    );

    media.setMatches(true);

    expect(document.documentElement.getAttribute("data-admin-theme")).toBe(
      "dark"
    );
    expect(screen.getByRole("button")).toHaveTextContent("System");
  });

  it("stops following the OS once an explicit theme is chosen", () => {
    const media = stubMatchMedia(false);
    render(<AdminThemeToggle />);

    fireEvent.click(screen.getByRole("button")); // System -> Light

    media.setMatches(true);

    expect(document.documentElement.getAttribute("data-admin-theme")).toBe(
      "light"
    );
  });
});
