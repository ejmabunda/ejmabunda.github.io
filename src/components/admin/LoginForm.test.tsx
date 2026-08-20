import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LoginForm from "./LoginForm";
import { InvalidPasswordError, login } from "@/lib/authApi";

vi.mock("@/lib/authApi", () => ({
  login: vi.fn(),
  InvalidPasswordError: class InvalidPasswordError extends Error {},
}));

const loginMock = vi.mocked(login);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("LoginForm", () => {
  it("submits the entered password and reports the returned token", async () => {
    loginMock.mockResolvedValue("eyJ.token");
    const onSuccess = vi.fn();
    render(<LoginForm onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "hunter2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith("eyJ.token"));
    expect(loginMock).toHaveBeenCalledWith("hunter2");
  });

  it("toggles the password field between masked and visible text", () => {
    render(<LoginForm onSuccess={vi.fn()} />);

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "show" }));
    expect(input).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "hide" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("shows a wrong-password message on an invalid credential", async () => {
    loginMock.mockRejectedValue(new InvalidPasswordError());
    render(<LoginForm onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "nope" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Wrong password. Try again.")).toBeInTheDocument();
  });

  it("shows a generic message on an unexpected failure", async () => {
    loginMock.mockRejectedValue(new Error("network down"));
    render(<LoginForm onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "nope" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Something went wrong. Try again.")
    ).toBeInTheDocument();
  });
});
