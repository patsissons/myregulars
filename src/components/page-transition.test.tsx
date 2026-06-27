import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageTransition } from "./page-transition";

describe("PageTransition", () => {
  it("renders its children", () => {
    render(
      <PageTransition>
        <p>Page content</p>
      </PageTransition>,
    );
    expect(screen.getByText("Page content")).toBeTruthy();
  });

  it("passes className through to the rendered element", () => {
    const { container } = render(
      <PageTransition className="page-class">
        <p>Page content</p>
      </PageTransition>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("page-class");
  });
});
