import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
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

  it("applies primary variant background", () => {
    render(<Button variant="primary">Go</Button>);
    const button = screen.getByRole("button");
    expect(button.style.background).toContain("var(--mr-accent)");
  });

  it("applies secondary variant border (transparent background)", () => {
    render(<Button variant="secondary">Go</Button>);
    const button = screen.getByRole("button");
    expect(button.style.background).toBe("transparent");
    expect(button.getAttribute("style")).toContain("var(--mr-edge-strong)");
  });

  // Regression: transparent variants previously only had hover:brightness, which
  // is invisible on a transparent background. They need an important background
  // tint that overrides the inline `background: transparent`.
  it("includes an important background-tint hover for transparent variants", () => {
    render(<Button variant="secondary">Go</Button>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("hover:bg-black/[0.05]!");
    expect(button.className).toContain("dark:hover:bg-white/[0.07]!");
  });

  it("keeps a brightness hover for the filled primary variant", () => {
    render(<Button variant="primary">Go</Button>);
    expect(screen.getByRole("button").className).toContain("hover:brightness-95");
  });

  it("applies size classes", () => {
    render(<Button size="lg">Go</Button>);
    expect(screen.getByRole("button").className).toContain("h-10");
  });
});
