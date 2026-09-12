import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SkillPicker from "./SkillPicker";

afterEach(cleanup);

const groups = [
  {
    name: "LanguagesAndBackend" as const,
    label: "Languages & Backend",
    items: [
      { id: "s1", name: "C#", skillCategory: "LanguagesAndBackend" as const },
      { id: "s2", name: "TypeScript", skillCategory: "LanguagesAndBackend" as const },
    ],
  },
];

describe("SkillPicker", () => {
  it("shows the linked count and toggles a pill on click", () => {
    const onChange = vi.fn();
    render(
      <SkillPicker groups={groups} pickedSkillIds={["s1"]} onChange={onChange} />
    );

    expect(screen.getByText("1 linked")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "TypeScript" }));
    expect(onChange).toHaveBeenCalledWith(["s1", "s2"]);
  });

  it("removes an id when its pill is toggled off", () => {
    const onChange = vi.fn();
    render(
      <SkillPicker
        groups={groups}
        pickedSkillIds={["s1", "s2"]}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "C#" }));
    expect(onChange).toHaveBeenCalledWith(["s2"]);
  });

  it("shows a prompt to add skills first when there are no groups", () => {
    render(<SkillPicker groups={[]} pickedSkillIds={[]} onChange={vi.fn()} />);
    expect(screen.getByText(/add skills under the skills tab/i)).toBeInTheDocument();
  });
});
