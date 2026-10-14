import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Education from "./Education";
import {
  useQualifications,
  type QualificationsState,
} from "@/hooks/useQualifications";
import type { Qualification } from "@/lib/qualificationApi";

vi.mock("@/hooks/useQualifications", () => ({
  useQualifications: vi.fn(),
}));

const mockUseQualifications = vi.mocked(useQualifications);

afterEach(cleanup);

function setState(state: QualificationsState) {
  mockUseQualifications.mockReturnValue(state);
}

// Mirrors the seeded backend data, in the API's newest-first order.
const liveQualifications: Qualification[] = [
  {
    id: "wtc",
    name: "Occupational Certificate: Software Engineer",
    institution: "WeThinkCode_",
    startDate: "2024-01-01T00:00:00",
    endDate: "2025-01-01T00:00:00",
    nqfLevel: "Diploma",
    skills: [
      { id: "s1", name: "CI/CD pipelines", skillCategory: "CloudAndDevOps" },
    ],
  },
  {
    id: "nsc",
    name: "National Senior Certificate",
    institution: "Ponelopele Oracle Secondary School",
    startDate: "2017-12-01T00:00:00",
    endDate: "2017-12-01T00:00:00",
    nqfLevel: "Grade12",
    skills: [],
  },
];

describe("Education", () => {
  it("always renders the section heading", () => {
    setState({ status: "loading" });
    render(<Education />);
    expect(screen.getByText("Education")).toBeInTheDocument();
  });

  it("shows a skeleton placeholder while the list is in flight", () => {
    setState({ status: "loading" });
    const { container } = render(<Education />);

    expect(screen.getByLabelText("Loading education")).toBeInTheDocument();
    expect(container.querySelectorAll(".sk").length).toBeGreaterThan(0);
  });

  it("renders entries in API order with institution and date range", () => {
    setState({ status: "success", data: liveQualifications });
    const { container } = render(<Education />);

    const names = [...container.querySelectorAll("strong")].map(
      (el) => el.textContent
    );
    expect(names).toEqual([
      "Occupational Certificate: Software Engineer",
      "National Senior Certificate",
    ]);
    expect(
      screen.getByText("WeThinkCode_ · Jan 2024 – Jan 2025")
    ).toBeInTheDocument();
  });

  it("shows a single date when start and end fall in the same month", () => {
    setState({ status: "success", data: [liveQualifications[1]] });
    render(<Education />);

    expect(
      screen.getByText("Ponelopele Oracle Secondary School · Dec 2017")
    ).toBeInTheDocument();
  });

  it("shows Present for an in-progress qualification", () => {
    setState({
      status: "success",
      data: [{ ...liveQualifications[0], endDate: null }],
    });
    render(<Education />);

    expect(
      screen.getByText("WeThinkCode_ · Jan 2024 – Present")
    ).toBeInTheDocument();
  });

  it("reads the month off the string, not through local-time parsing", () => {
    setState({
      status: "success",
      data: [
        {
          ...liveQualifications[0],
          startDate: "2024-03-01T00:00:00",
          endDate: "2024-12-31T23:59:59",
        },
      ],
    });
    render(<Education />);

    expect(
      screen.getByText("WeThinkCode_ · Mar 2024 – Dec 2024")
    ).toBeInTheDocument();
  });

  it("shows an error message when the request fails", () => {
    setState({ status: "error" });
    render(<Education />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      /couldn't load education content/i
    );
  });

  it("shows an unavailable message when there are no entries", () => {
    setState({ status: "empty" });
    render(<Education />);
    expect(
      screen.getByText(/education content isn't available right now/i)
    ).toBeInTheDocument();
  });
});
