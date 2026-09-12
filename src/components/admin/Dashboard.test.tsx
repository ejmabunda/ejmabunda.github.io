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
vi.mock("./ProjectsManager", () => ({
  default: () => <div>projects manager</div>,
}));
vi.mock("./QualificationsManager", () => ({
  default: () => <div>qualifications manager</div>,
}));
vi.mock("./CertificationsManager", () => ({
  default: () => <div>certifications manager</div>,
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

    fireEvent.click(screen.getAllByRole("tab", { name: /Projects/ })[0]);
    expect(screen.getByText("projects manager")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("tab", { name: /Qualifications/ })[0]);
    expect(screen.getByText("qualifications manager")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("tab", { name: /Certifications/ })[0]);
    expect(screen.getByText("certifications manager")).toBeInTheDocument();
  });

  it("calls onLoggedOut from a sign-out control", () => {
    const onLoggedOut = vi.fn();
    renderDashboard(onLoggedOut);
    fireEvent.click(screen.getAllByText("Sign out")[0]);
    expect(onLoggedOut).toHaveBeenCalledTimes(1);
  });

  it("groups tabs into CONTENT and CREDENTIALS rail sections", () => {
    renderDashboard();
    expect(screen.getByText("CONTENT")).toBeInTheDocument();
    expect(screen.getByText("CREDENTIALS")).toBeInTheDocument();
  });
});
