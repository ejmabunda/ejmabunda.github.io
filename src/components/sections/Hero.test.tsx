import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Hero from "./Hero";
import { profile } from "@/content/profile";
import { useProfile, type ProfileState } from "@/hooks/useProfile";

vi.mock("@/hooks/useProfile", () => ({
  useProfile: vi.fn(),
}));

const mockUseProfile = vi.mocked(useProfile);

// globals:false means RTL's automatic per-test cleanup isn't wired up here,
// and every test in this file renders the same section (see ResumePreview.test.tsx).
afterEach(cleanup);

function setProfileState(state: ProfileState) {
  mockUseProfile.mockReturnValue(state);
}

describe("Hero", () => {
  it("always renders the photo and every CTA button, regardless of profile state", () => {
    setProfileState({ status: "loading" });
    render(<Hero />);

    expect(screen.getByAltText(profile.photo.alt)).toBeInTheDocument();
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

  it("shows a loading placeholder while the profile is in flight", () => {
    setProfileState({ status: "loading" });
    render(<Hero />);

    expect(screen.getByLabelText("Loading profile")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("renders the live title, headline, and subtitle on success", () => {
    setProfileState({
      status: "success",
      data: {
        id: 1,
        title: "Matimu Mabunda",
        headline: "Software Developer — Backend & Business Systems",
        subtitle: "Production experience building backend systems.",
      },
    });
    render(<Hero />);

    expect(
      screen.getByRole("heading", { name: "Matimu Mabunda", level: 1 })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Software Developer — Backend & Business Systems")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Production experience building backend systems.")
    ).toBeInTheDocument();
  });

  it("shows an error state only after retries are exhausted", () => {
    setProfileState({ status: "error" });
    render(<Hero />);

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load profile/i);
  });

  it("shows an empty state when the profile has no data", () => {
    setProfileState({ status: "empty" });
    render(<Hero />);

    expect(screen.getByText(/profile content isn't available/i)).toBeInTheDocument();
  });
});
