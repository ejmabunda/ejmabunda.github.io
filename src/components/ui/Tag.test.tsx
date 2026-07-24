import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Tag from "./Tag";

describe("Tag", () => {
  it("applies the tone-specific class", () => {
    render(<Tag tone="accent-2">SQL Server</Tag>);
    expect(screen.getByText("SQL Server")).toHaveClass("tag", "tag-accent-2");
  });
});
