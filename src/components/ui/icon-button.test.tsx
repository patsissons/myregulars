import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Star } from "lucide-react";
import { IconButton } from "./icon-button";

describe("IconButton", () => {
  it("renders a button with the accessible label", () => {
    render(<IconButton icon={Star} label="Favorite" />);
    expect(screen.getByRole("button", { name: "Favorite" })).toBeTruthy();
  });

  it("renders an svg icon", () => {
    const { container } = render(<IconButton icon={Star} label="Favorite" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("defaults to type button", () => {
    render(<IconButton icon={Star} label="Favorite" />);
    expect(screen.getByRole("button").getAttribute("type")).toBe("button");
  });

  it("respects a custom type", () => {
    render(<IconButton icon={Star} label="Submit" type="submit" />);
    expect(screen.getByRole("button").getAttribute("type")).toBe("submit");
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<IconButton icon={Star} label="Favorite" onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("merges a custom className", () => {
    render(<IconButton icon={Star} label="Favorite" className="extra-class" />);
    expect(screen.getByRole("button").className).toContain("extra-class");
  });
});
