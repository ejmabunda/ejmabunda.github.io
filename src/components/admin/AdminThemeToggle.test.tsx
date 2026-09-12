import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import AdminThemeToggle from "./AdminThemeToggle";
import { ADMIN_THEME_STORAGE_KEY } from "@/lib/adminTheme";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-admin-theme");
});

describe("AdminThemeToggle", () => {
  it("toggles data-admin-theme and persists the choice, independent of the site's theme key", () => {
    document.documentElement.setAttribute("data-admin-theme", "light");
    render(<AdminThemeToggle />);

    fireEvent.click(screen.getByRole("button"));

    expect(document.documentElement.getAttribute("data-admin-theme")).toBe(
      "dark"
    );
    expect(window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY)).toBe("dark");
    expect(window.localStorage.getItem("portfolio-theme")).toBeNull();
  });

  it("toggles back to light on a second click", () => {
    document.documentElement.setAttribute("data-admin-theme", "light");
    render(<AdminThemeToggle />);

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button"));

    expect(document.documentElement.getAttribute("data-admin-theme")).toBe(
      "light"
    );
  });
});
