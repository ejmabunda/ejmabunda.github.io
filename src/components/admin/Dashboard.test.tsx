import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";

vi.mock("./ProfileEditor", () => ({
  default: () => <div>profile editor</div>,
}));
vi.mock("./SkillsManager", () => ({
  default: () => <div>skills manager</div>,
}));
vi.mock("./ExperiencesManager", () => ({
  default: () => <div>experiences manager</div>,
}));

afterEach(cleanup);

function renderDashboard(onLoggedOut = vi.fn()) {
  return render(
    <Dashboard token="tok" onTokenRefreshed={vi.fn()} onLoggedOut={onLoggedOut} />
  );
}

describe("Dashboard", () => {
  it("starts on the profile tab", () => {
    renderDashboard();
    expect(screen.getByText("profile editor")).toBeInTheDocument();
    expect(screen.queryByText("skills manager")).not.toBeInTheDocument();
  });

  it("switches the mounted manager when a nav item is clicked", () => {
    renderDashboard();

    fireEvent.click(screen.getAllByRole("tab", { name: /Skills/ })[0]);
    expect(screen.getByText("skills manager")).toBeInTheDocument();
    expect(screen.queryByText("profile editor")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("tab", { name: /Experience/ })[0]);
    expect(screen.getByText("experiences manager")).toBeInTheDocument();
  });

  it("calls onLoggedOut from a log-out control", () => {
    const onLoggedOut = vi.fn();
    renderDashboard(onLoggedOut);
    fireEvent.click(screen.getAllByText("log out")[0]);
    expect(onLoggedOut).toHaveBeenCalledTimes(1);
  });
});
