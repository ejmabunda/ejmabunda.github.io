import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Skills from "./Skills";
import { skills as fallbackSkills } from "@/content/skills";
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

  it("falls back to the bundled list when the API returns nothing", () => {
    setState({ status: "empty" });
    render(<Skills />);

    fallbackSkills.forEach((group) => {
      expect(screen.getByText(group.label)).toBeInTheDocument();
    });
  });

  it("falls back to the bundled list on error rather than dropping the section", () => {
    setState({ status: "error" });
    render(<Skills />);

    expect(screen.getByText(fallbackSkills[0].items[0])).toBeInTheDocument();
  });
});
