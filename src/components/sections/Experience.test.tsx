import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Experience from "./Experience";
import {
  useExperiences,
  type ExperiencesState,
} from "@/hooks/useExperiences";
import type { Experience as ExperienceDto } from "@/lib/experienceApi";

vi.mock("@/hooks/useExperiences", () => ({
  useExperiences: vi.fn(),
}));

const mockUseExperiences = vi.mocked(useExperiences);

afterEach(cleanup);

function setState(state: ExperiencesState) {
  mockUseExperiences.mockReturnValue(state);
}

const liveExperiences: ExperienceDto[] = [
  {
    id: "old",
    jobTitle: "Volunteer Technical Mentor",
    employer: "WeThinkCode_",
    startDate: "2025-09-01T00:00:00",
    endDate: "2025-12-01T00:00:00",
    description: "Mentored a cohort\nReviewed student commits",
    skills: [
      { id: "s1", name: "Git", skillCategory: "CloudAndDevOps" },
      { id: "s2", name: "Code review", skillCategory: "TestingAndReliability" },
    ],
  },
  {
    id: "new",
    jobTitle: "Software Developer",
    employer: "Xiquel",
    startDate: "2026-02-02T00:00:00",
    endDate: null,
    description: "Backend development\r\nBuilt an automated scheduler\r\n",
    skills: [{ id: "s3", name: "C#", skillCategory: "LanguagesAndBackend" }],
  },
];

describe("Experience", () => {
  it("always renders the section heading", () => {
    setState({ status: "loading" });
    render(<Experience />);
    expect(screen.getByText("Experience")).toBeInTheDocument();
  });

  it("shows a skeleton placeholder while the list is in flight", () => {
    setState({ status: "loading" });
    const { container } = render(<Experience />);

    expect(screen.getByLabelText("Loading experience")).toBeInTheDocument();
    expect(container.querySelectorAll(".sk").length).toBeGreaterThan(0);
  });

  it("orders roles newest-first and formats the date range", () => {
    setState({ status: "success", data: liveExperiences });
    render(<Experience />);

    const roles = screen
      .getAllByRole("heading", { level: 4 })
      .map((el) => el.textContent);
    expect(roles).toEqual(["Software Developer", "Volunteer Technical Mentor"]);

    expect(screen.getByText("Xiquel · Feb 2026 – Present")).toBeInTheDocument();
    expect(
      screen.getByText("WeThinkCode_ · Sep 2025 – Dec 2025")
    ).toBeInTheDocument();
  });

  it("splits the description into bullets and drops blank lines", () => {
    setState({ status: "success", data: [liveExperiences[1]] });
    render(<Experience />);

    const bullets = screen.getAllByRole("listitem").map((el) => el.textContent);
    expect(bullets).toEqual([
      "Backend development",
      "Built an automated scheduler",
    ]);
  });

  it("renders each role's skills as tags, name-sorted", () => {
    setState({ status: "success", data: [liveExperiences[0]] });
    const { container } = render(<Experience />);

    const tags = Array.from(container.querySelectorAll(".tag")).map(
      (el) => el.textContent
    );
    expect(tags).toEqual(["Code review", "Git"]);
  });

  it("omits the timeline connector after the last entry", () => {
    setState({ status: "success", data: liveExperiences });
    const { container } = render(<Experience />);
    expect(container.querySelectorAll(".bg-divider")).toHaveLength(
      liveExperiences.length - 1
    );
  });

  it("shows an unavailable message when the API returns nothing", () => {
    setState({ status: "empty" });
    render(<Experience />);
    expect(
      screen.getByText("Experience content isn't available right now.")
    ).toBeInTheDocument();
  });

  it("shows an error message when the list can't be loaded", () => {
    setState({ status: "error" });
    render(<Experience />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn't load experience content. Please refresh the page to try again."
    );
  });
});
