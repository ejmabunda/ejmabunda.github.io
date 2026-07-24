import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Button from "./Button";

describe("Button", () => {
  it("renders as a link with the given href and variant class", () => {
    render(
      <Button variant="primary" href="https://example.com">
        Click me
      </Button>
    );
    const link = screen.getByRole("link", { name: "Click me" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveClass("btn", "btn-primary");
  });

  it("adds target and rel when external", () => {
    render(
      <Button variant="secondary" href="https://example.com" external>
        Open
      </Button>
    );
    const link = screen.getByRole("link", { name: "Open" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("omits target/rel when not external", () => {
    render(
      <Button variant="secondary" href="/somewhere">
        Internal
      </Button>
    );
    const link = screen.getByRole("link", { name: "Internal" });
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("rel");
  });
});
