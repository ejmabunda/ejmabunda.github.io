import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Skeleton from "./Skeleton";

describe("Skeleton", () => {
  it("renders a sweep skeleton by default, sized and hidden from assistive tech", () => {
    const { container } = render(<Skeleton height="22px" className="w-[280px]" />);
    const el = container.firstElementChild as HTMLElement;

    expect(el).toHaveClass("sk", "sk-sweep", "rounded-sm", "w-[280px]");
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el).toHaveStyle({ height: "22px", width: "100%" });
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
