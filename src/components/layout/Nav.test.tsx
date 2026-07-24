import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Nav from "./Nav";
import { site } from "@/content/site";

describe("Nav", () => {
  it("renders the brand, nav links, and a mailto get-in-touch button", () => {
    render(<Nav />);
    expect(screen.getByText(site.brand)).toBeInTheDocument();

    site.navLinks.forEach((link) => {
      expect(screen.getByRole("link", { name: link.label })).toHaveAttribute(
        "href",
        link.href
      );
    });

    expect(screen.getByRole("link", { name: "get in touch" })).toHaveAttribute(
      "href",
      `mailto:${site.email}`
    );
  });
});
