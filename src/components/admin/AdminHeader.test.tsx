import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminHeader from "./AdminHeader";

afterEach(cleanup);

describe("AdminHeader", () => {
  it("renders the title, endpoint and primary action", () => {
    render(
      <AdminHeader
        title="Skills"
        endpoint="/api/Skill"
        primaryAction={<button type="button">+ Add skill</button>}
        waking={false}
        onLoggedOut={vi.fn()}
      />
    );

    expect(screen.getByText("Skills")).toBeInTheDocument();
    expect(screen.getByText("/api/Skill")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "+ Add skill" })
    ).toBeInTheDocument();
  });

  it("shows the wake banner only while the API is waking", () => {
    const { rerender } = render(
      <AdminHeader
        title="Skills"
        endpoint="/api/Skill"
        waking={false}
        onLoggedOut={vi.fn()}
      />
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    rerender(
      <AdminHeader
        title="Skills"
        endpoint="/api/Skill"
        waking={true}
        onLoggedOut={vi.fn()}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent(/waking the api/i);
  });

  it("reveals sign-out behind the mobile 'more' button", () => {
    const onLoggedOut = vi.fn();
    render(
      <AdminHeader
        title="Skills"
        endpoint="/api/Skill"
        waking={false}
        onLoggedOut={onLoggedOut}
      />
    );

    expect(screen.queryByText("Sign out")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByText("Sign out")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(onLoggedOut).toHaveBeenCalledTimes(1);
  });
});
