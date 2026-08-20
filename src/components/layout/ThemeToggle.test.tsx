import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import ThemeToggle from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    window.localStorage.clear();
  });

  afterEach(cleanup);

  it("cycles light -> dark -> system -> light, applying data-theme and persisting to localStorage", async () => {
    render(<ThemeToggle />);
    const button = await screen.findByRole("button", {
      name: "System theme active. Switch to light theme.",
    });

    fireEvent.click(button);
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(window.localStorage.getItem("portfolio-theme")).toBe("light");
    expect(
      screen.getByRole("button", {
        name: "Light theme active. Switch to dark theme.",
      }),
    ).toBe(button);

    fireEvent.click(button);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem("portfolio-theme")).toBe("dark");
    expect(
      screen.getByRole("button", {
        name: "Dark theme active. Switch to system theme.",
      }),
    ).toBe(button);

    fireEvent.click(button);
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(window.localStorage.getItem("portfolio-theme")).toBe("system");
    expect(
      screen.getByRole("button", {
        name: "System theme active. Switch to light theme.",
      }),
    ).toBe(button);
  });

  it("resolves an unset preference to system mode on mount", async () => {
    render(<ThemeToggle />);
    const button = await screen.findByRole("button", {
      name: "System theme active. Switch to light theme.",
    });
    expect(button).toHaveAttribute("data-mode", "system");
  });
});
