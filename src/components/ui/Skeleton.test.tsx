import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Skeleton from "./Skeleton";

describe("Skeleton", () => {
  it("lets a width utility class take effect when no width prop is given", () => {
    const { container } = render(<Skeleton height="22px" className="w-[88%]" />);
    const el = container.firstElementChild as HTMLElement;

    expect(el).toHaveClass("sk", "sk-sweep", "rounded-sm", "w-[88%]");
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el).toHaveStyle({ height: "22px" });
    // Regression: a default inline `width: 100%` used to always win over
    // this class, so every skeleton rendered the same width regardless of
    // the className passed in.
    expect(el.style.width).toBe("");
  });

  it("applies an explicit width prop as an inline style", () => {
    const { container } = render(<Skeleton width="240px" height="22px" />);
    const el = container.firstElementChild as HTMLElement;

    expect(el).toHaveStyle({ width: "240px", height: "22px" });
  });

  it("renders the wave variant with a staggering delay", () => {
    const { container } = render(
      <Skeleton variant="wave" rounded="full" delayMs={400} />
    );
    const el = container.firstElementChild as HTMLElement;

    expect(el).toHaveClass("sk", "sk-wave", "rounded-full");
    expect(el).toHaveStyle({ "animation-delay": "400ms" });
  });
});
