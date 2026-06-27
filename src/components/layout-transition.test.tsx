import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LayoutTransition } from "./layout-transition";

vi.mock("next/navigation", () => ({
  usePathname: () => "/v/abc/l/loc1",
}));

describe("LayoutTransition", () => {
  it("renders its children", () => {
    render(
      <LayoutTransition>
        <p>route content</p>
      </LayoutTransition>,
    );
    expect(screen.getByText("route content")).toBeTruthy();
  });

  it("forwards the className to the wrapper", () => {
    const { container } = render(
      <LayoutTransition className="flex-1">
        <p>content</p>
      </LayoutTransition>,
    );
    expect((container.firstChild as HTMLElement).className).toContain("flex-1");
  });
});
