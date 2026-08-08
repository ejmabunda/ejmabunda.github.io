import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Hero from "./Hero";
import { profile } from "@/content/profile";

describe("Hero", () => {
  it("renders the name, subtitle, bio, and every CTA button", () => {
    render(<Hero />);
    expect(
      screen.getByRole("heading", { name: profile.name, level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText(profile.subtitle)).toBeInTheDocument();
    expect(screen.getByText(profile.bio)).toBeInTheDocument();

    profile.heroCtas.forEach((cta) => {
      if (cta.kind === "preview") {
        expect(screen.getByRole("button", { name: cta.label })).toBeInTheDocument();
      } else {
        expect(screen.getByRole("link", { name: cta.label })).toHaveAttribute(
          "href",
          cta.href
        );
      }
    });
  });
});
