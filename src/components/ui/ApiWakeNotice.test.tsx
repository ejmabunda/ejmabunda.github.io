import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ApiWakeNotice from "./ApiWakeNotice";
import { useApiWaking } from "@/hooks/useApiWaking";

vi.mock("@/hooks/useApiWaking", () => ({ useApiWaking: vi.fn() }));

const mockUseApiWaking = vi.mocked(useApiWaking);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ApiWakeNotice", () => {
  it("renders no message while the API is responsive", () => {
    mockUseApiWaking.mockReturnValue(false);
    render(<ApiWakeNotice />);

    expect(
      screen.queryByText(/waking the server up/i)
    ).not.toBeInTheDocument();
  });

  it("shows the notice inside a polite live region once the API is waking", () => {
    mockUseApiWaking.mockReturnValue(true);
    render(<ApiWakeNotice />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent(/waking the server up/i);
  });

  it("can be dismissed", () => {
    mockUseApiWaking.mockReturnValue(true);
    render(<ApiWakeNotice />);

    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    expect(
      screen.queryByText(/waking the server up/i)
    ).not.toBeInTheDocument();
  });
});
