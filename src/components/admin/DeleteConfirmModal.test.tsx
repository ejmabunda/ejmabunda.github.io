import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DeleteConfirmModal from "./DeleteConfirmModal";

afterEach(cleanup);

describe("DeleteConfirmModal", () => {
  it("confirms deletion via the Delete button", () => {
    const onConfirm = vi.fn();
    render(
      <DeleteConfirmModal deleting={false} onCancel={vi.fn()} onConfirm={onConfirm} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("cancels via the Cancel button, the scrim, and Escape", () => {
    const onCancel = vi.fn();
    render(
      <DeleteConfirmModal deleting={false} onCancel={onCancel} onConfirm={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("dialog").parentElement!);
    expect(onCancel).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(3);
  });

  it("does not close when clicking inside the dialog", () => {
    const onCancel = vi.fn();
    render(
      <DeleteConfirmModal deleting={false} onCancel={onCancel} onConfirm={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("dialog"));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("disables both actions and shows progress while deleting", () => {
    render(
      <DeleteConfirmModal deleting={true} onCancel={vi.fn()} onConfirm={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
  });
});
