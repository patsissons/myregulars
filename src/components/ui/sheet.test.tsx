import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Sheet } from "./sheet";

describe("Sheet", () => {
  it("renders title and children when open", () => {
    render(
      <Sheet open onOpenChange={() => {}} title="Add Venue">
        <p>Sheet body</p>
      </Sheet>,
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Add Venue")).toBeTruthy();
    expect(screen.getByText("Sheet body")).toBeTruthy();
  });

  it("does not render content when closed", () => {
    render(
      <Sheet open={false} onOpenChange={() => {}} title="Hidden">
        <p>Sheet body</p>
      </Sheet>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Sheet body")).toBeNull();
  });

  it("renders children without a title", () => {
    render(
      <Sheet open onOpenChange={() => {}}>
        <p>Untitled body</p>
      </Sheet>,
    );
    expect(screen.getByText("Untitled body")).toBeTruthy();
  });

  it("calls onOpenChange when Escape is pressed", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Sheet open onOpenChange={onOpenChange} title="Escapable">
        <p>Body</p>
      </Sheet>,
    );
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("provides a scroll container wrapping the children", () => {
    render(
      <Sheet open onOpenChange={() => {}} title="Scrolly">
        <p>Inner content</p>
      </Sheet>,
    );
    const inner = screen.getByText("Inner content");
    const scrollContainer = inner.parentElement as HTMLElement;
    expect(scrollContainer.style.overflowY).toBe("auto");
  });
});
