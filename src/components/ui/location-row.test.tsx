import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { LocationRow } from "./location-row";

const location = { name: "The Coffee Bar", description: "Cozy spot", peopleCount: 7 };

describe("LocationRow", () => {
  it("renders the location name and people count", () => {
    render(<LocationRow location={location} />);
    expect(screen.getByText("The Coffee Bar")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<LocationRow location={location} onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("applies active styling and aria-current when active", () => {
    const { container } = render(<LocationRow location={location} active />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.background).toContain("var(--mr-accent-soft)");
    expect(el.style.color).toContain("var(--mr-accent)");
    expect(el.getAttribute("aria-current")).toBe("page");
  });

  it("uses default colors and no aria-current when inactive", () => {
    const { container } = render(<LocationRow location={location} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.color).toContain("var(--mr-text)");
    expect(el.getAttribute("aria-current")).toBeNull();
  });
});
