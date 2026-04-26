import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Chip } from "./chip";

describe("Chip", () => {
  it("renders children", () => {
    render(<Chip>Morning Crew</Chip>);
    expect(screen.getByText("Morning Crew")).toBeTruthy();
  });

  it("renders as a span when no onClick", () => {
    const { container } = render(<Chip>Label</Chip>);
    expect(container.firstChild?.nodeName).toBe("SPAN");
  });

  it("renders as a button when onClick provided", () => {
    render(<Chip onClick={() => {}}>Label</Chip>);
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Chip onClick={onClick}>Label</Chip>);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("applies active styles when active=true", () => {
    const { container } = render(<Chip active>Label</Chip>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.background).toContain("var(--mr-text)");
    expect(el.style.color).toContain("var(--mr-bg)");
  });

  it("applies dashed variant styles", () => {
    const { container } = render(<Chip variant="dashed">Label</Chip>);
    const el = container.firstChild as HTMLElement;
    expect(el.style.background).toBe("transparent");
  });
});
