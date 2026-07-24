import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Experience from "./Experience";
import { experience } from "@/content/experience";

describe("Experience", () => {
  it("renders every role and org/date meta line", () => {
    render(<Experience />);
    experience.forEach((entry) => {
      expect(screen.getByText(entry.role)).toBeInTheDocument();
      expect(
        screen.getByText(`${entry.org} · ${entry.dateRange}`)
      ).toBeInTheDocument();
    });
  });

  it("omits the timeline connector after the last entry", () => {
    const { container } = render(<Experience />);
    const connectors = container.querySelectorAll(".bg-divider");
    expect(connectors).toHaveLength(experience.length - 1);
  });
});
