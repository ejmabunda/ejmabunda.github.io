import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Skills from "./Skills";
import { useSkills, type SkillsState } from "@/hooks/useSkills";
import type { Skill } from "@/lib/skillApi";

vi.mock("@/hooks/useSkills", () => ({
  useSkills: vi.fn(),
}));

const mockUseSkills = vi.mocked(useSkills);

afterEach(cleanup);

function setState(state: SkillsState) {
  mockUseSkills.mockReturnValue(state);
}

const liveSkills: Skill[] = [
  { id: "1", name: "GitHub", skillCategory: "Platform" },
  { id: "2", name: "Docker", skillCategory: "CloudAndDevOps" },
  { id: "3", name: "C#", skillCategory: "LanguagesAndBackend" },
  { id: "4", name: ".NET", skillCategory: "LanguagesAndBackend" },
];

describe("Skills", () => {
  it("always renders the section heading", () => {
    setState({ status: "loading" });
    render(<Skills />);
    expect(screen.getByText("Core skills")).toBeInTheDocument();
  });

  it("shows a skeleton placeholder while the list is in flight", () => {
    setState({ status: "loading" });
    const { container } = render(<Skills />);

    expect(screen.getByLabelText("Loading skills")).toBeInTheDocument();
    expect(container.querySelectorAll(".sk").length).toBeGreaterThan(0);
    expect(screen.queryByText("GitHub")).not.toBeInTheDocument();
  });

  it("renders the live list grouped by category and name-sorted", () => {
    setState({ status: "success", data: liveSkills });
    render(<Skills />);

    expect(screen.getByText("Languages & Backend")).toBeInTheDocument();
    expect(screen.getByText("Platform")).toBeInTheDocument();
    expect(screen.getByText("Cloud & DevOps")).toBeInTheDocument();

    // Names within a group are locale-sorted: ".NET" before "C#".
    const langRow = screen.getByText("Languages & Backend").parentElement!;
    const tags = Array.from(
      langRow.querySelectorAll(".tag")
    ).map((el) => el.textContent);
    expect(tags).toEqual([".NET", "C#"]);
  });

  it("omits categories that have no live skills", () => {
    setState({
      status: "success",
      data: [{ id: "1", name: "GitHub", skillCategory: "Platform" }],
    });
    render(<Skills />);

    expect(screen.getByText("Platform")).toBeInTheDocument();
    expect(screen.queryByText("Testing & Reliability")).not.toBeInTheDocument();
  });

  it("shows an unavailable message when the API returns nothing", () => {
    setState({ status: "empty" });
    render(<Skills />);

    expect(
      screen.getByText("Skills content isn't available right now.")
    ).toBeInTheDocument();
    expect(screen.queryByText("C#")).not.toBeInTheDocument();
  });

  it("shows an error message when the list can't be loaded", () => {
    setState({ status: "error" });
    render(<Skills />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn't load skills content. Please refresh the page to try again."
    );
    expect(screen.queryByText("C#")).not.toBeInTheDocument();
  });
});
