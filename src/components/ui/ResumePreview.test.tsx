import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ResumePreview from "./ResumePreview";

// This file renders two tests with an identically-labelled "Résumé" trigger,
// which — unlike the rest of the suite's single-test files — collide unless
// each render's DOM is torn down first (globals:false means RTL's automatic
// per-test cleanup isn't wired up here).
afterEach(cleanup);

describe("ResumePreview", () => {
  it("renders a plain new-tab link as the mobile fallback", () => {
    render(
      <ResumePreview label="Résumé" href="/Resume.pdf" variant="secondary" />
    );

    const links = screen.getAllByRole("link", { name: "Résumé" });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/Resume.pdf");
    expect(links[0]).toHaveAttribute("target", "_blank");
    expect(links[0]).not.toHaveAttribute("download");
  });

  it("opens a preview overlay with a download link and closes on request", () => {
    render(
      <ResumePreview label="Résumé" href="/Resume.pdf" variant="secondary" />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Résumé" }));
    expect(screen.getByRole("dialog", { name: "Résumé preview" })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    const download = screen.getByRole("link", { name: "Download ↓" });
    expect(download).toHaveAttribute("href", "/Resume.pdf");
    expect(download).toHaveAttribute("download");

    expect(screen.getByTitle("Résumé preview")).toHaveAttribute(
      "src",
      "/Resume.pdf#toolbar=0&navpanes=0"
    );

    fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });
});
