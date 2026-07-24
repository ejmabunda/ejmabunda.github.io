import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Education from "./Education";
import { education } from "@/content/education";

describe("Education", () => {
  it("renders every education entry", () => {
    render(<Education />);
    education.forEach((entry) => {
      expect(screen.getByText(entry.label)).toBeInTheDocument();
      expect(screen.getByText(entry.meta)).toBeInTheDocument();
    });
  });
});
