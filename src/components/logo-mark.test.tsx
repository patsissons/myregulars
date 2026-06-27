import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { LogoMark } from "./logo-mark";

describe("LogoMark", () => {
  it("renders an svg", () => {
    const { container } = render(<LogoMark />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("uses the default size of 44", () => {
    const { container } = render(<LogoMark />);
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.getAttribute("width")).toBe("44");
    expect(svg.getAttribute("height")).toBe("44");
  });

  it("respects a custom size prop", () => {
    const { container } = render(<LogoMark size={88} />);
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.getAttribute("width")).toBe("88");
    expect(svg.getAttribute("height")).toBe("88");
  });
});
