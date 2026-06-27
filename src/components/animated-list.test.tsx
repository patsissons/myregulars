import { beforeAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnimatedItem, AnimatedList } from "./animated-list";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }),
  });
});

describe("AnimatedList", () => {
  it("renders its children", () => {
    render(
      <AnimatedList>
        <span>Item A</span>
        <span>Item B</span>
      </AnimatedList>,
    );
    expect(screen.getByText("Item A")).toBeTruthy();
    expect(screen.getByText("Item B")).toBeTruthy();
  });

  it("passes className through to the rendered element", () => {
    const { container } = render(
      <AnimatedList className="list-class">
        <span>Item</span>
      </AnimatedList>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("list-class");
  });

  it("passes inline style through", () => {
    const { container } = render(
      <AnimatedList style={{ color: "rgb(1, 2, 3)" }}>
        <span>Item</span>
      </AnimatedList>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.color).toBe("rgb(1, 2, 3)");
  });
});

describe("AnimatedItem", () => {
  it("renders its children", () => {
    render(
      <AnimatedItem>
        <span>Child</span>
      </AnimatedItem>,
    );
    expect(screen.getByText("Child")).toBeTruthy();
  });

  it("passes className through", () => {
    const { container } = render(
      <AnimatedItem className="item-class">
        <span>Child</span>
      </AnimatedItem>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("item-class");
  });
});
