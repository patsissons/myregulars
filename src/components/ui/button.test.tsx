import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
  });

  it("defaults to type=button so it never submits a surrounding form by accident", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button").getAttribute("type")).toBe("button");
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not call onClick when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Save
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies variant classes from the token palette", () => {
    render(<Button variant="primary">Go</Button>);
    expect(screen.getByRole("button").className).toContain("bg-mr-accent");
  });

  it("gives transparent variants a visible hover tint", () => {
    render(<Button variant="secondary">Go</Button>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("border-mr-edge-strong");
    expect(button.className).toContain("hover:bg-black/[0.05]");
  });

  it("applies size classes and a 44px touch minimum", () => {
    render(<Button size="lg">Go</Button>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("h-10");
    expect(button.className).toContain("coarse:min-h-11");
  });

  it("passes arbitrary button attributes through", () => {
    render(
      <Button aria-pressed="true" data-testid="x" form="f1">
        Go
      </Button>,
    );
    const button = screen.getByTestId("x");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.getAttribute("form")).toBe("f1");
  });

  it("forwards its ref", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Go</Button>);
    expect(ref.current?.tagName).toBe("BUTTON");
  });

  it("renders the child element with asChild", () => {
    render(
      <Button asChild variant="primary">
        <a href="#vaults">Vaults</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Vaults" });
    expect(link.getAttribute("href")).toBe("#vaults");
    expect(link.className).toContain("bg-mr-accent");
    expect(link.getAttribute("type")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
