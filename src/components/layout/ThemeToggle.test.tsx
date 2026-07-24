import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import ThemeToggle from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    window.localStorage.clear();
  });

  it("toggles data-theme on <html> and persists the choice to localStorage", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: "Toggle dark mode" });

    fireEvent.click(button);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem("portfolio-theme")).toBe("dark");

    fireEvent.click(button);
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(window.localStorage.getItem("portfolio-theme")).toBe("light");
  });
});
