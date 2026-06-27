import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Eyebrow } from "./eyebrow";

describe("Eyebrow", () => {
  it("renders children", () => {
    render(<Eyebrow>Section</Eyebrow>);
    expect(screen.getByText("Section")).toBeTruthy();
  });

  it("renders as a span", () => {
    const { container } = render(<Eyebrow>Label</Eyebrow>);
    expect(container.firstChild?.nodeName).toBe("SPAN");
  });

  it("applies base uppercase styling classes", () => {
    const { container } = render(<Eyebrow>Label</Eyebrow>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("uppercase");
    expect(el.className).toContain("text-mr-faint");
  });

  it("merges a custom className", () => {
    const { container } = render(<Eyebrow className="extra-class">Label</Eyebrow>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("extra-class");
  });
});
