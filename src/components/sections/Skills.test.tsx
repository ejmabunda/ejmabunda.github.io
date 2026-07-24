import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Skills from "./Skills";
import { skills } from "@/content/skills";

describe("Skills", () => {
  it("renders every skill group label and its tags", () => {
    render(<Skills />);
    skills.forEach((group) => {
      expect(screen.getByText(group.label)).toBeInTheDocument();
      group.items.forEach((item) => {
        expect(screen.getByText(item)).toBeInTheDocument();
      });
    });
  });
});
