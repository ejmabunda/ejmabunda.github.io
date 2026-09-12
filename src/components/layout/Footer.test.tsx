import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Footer from "./Footer";
import { site } from "@/content/site";

afterEach(cleanup);

describe("Footer", () => {
  it("renders the current year copyright and contact info", () => {
    render(<Footer />);
    expect(
      screen.getByText(new RegExp(`© ${new Date().getFullYear()}`))
    ).toBeInTheDocument();
    expect(screen.getByText(new RegExp(site.email))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(site.location))).toBeInTheDocument();
  });

  it("links to the admin console", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute(
      "href",
      "/admin"
    );
  });
});
