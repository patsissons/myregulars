import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { ActionSheet } from "./action-sheet";
import { DropdownMenu } from "./dropdown-menu";

function setWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  act(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

afterEach(() => setWidth(1024));

describe("ActionSheet", () => {
  it("renders items as menuitems and closes after choosing one", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onRename = vi.fn();
    render(
      <ActionSheet
        open
        onOpenChange={onOpenChange}
        title="Blue Bottle"
        items={[
          { label: "Rename", onClick: onRename },
          { label: "Delete", onClick: () => {}, destructive: true },
        ]}
      />,
    );
    expect(screen.getByRole("menu")).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeTruthy();
    await user.click(screen.getByRole("menuitem", { name: "Rename" }));
    expect(onRename).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("has a Cancel control that closes it", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ActionSheet open onOpenChange={onOpenChange} items={[{ label: "A", onClick: () => {} }]} />,
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("DropdownMenu on a phone", () => {
  it("opens an action sheet instead of a popover", async () => {
    const user = userEvent.setup();
    setWidth(390);
    const onEdit = vi.fn();
    render(
      <DropdownMenu
        trigger={<button type="button">More</button>}
        items={[{ label: "Edit", onClick: onEdit }]}
      />,
    );
    const trigger = screen.getByRole("button", { name: "More" });
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeTruthy();
    await user.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("DropdownMenu keyboard", () => {
  it("focuses the first item on open and cycles with arrow keys", async () => {
    const user = userEvent.setup();
    setWidth(1280);
    render(
      <DropdownMenu
        trigger={<button type="button">More</button>}
        items={[
          { label: "One", onClick: () => {} },
          { label: "Two", onClick: () => {} },
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "More" }));
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "One" }));
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Two" }));
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "One" }));
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Two" }));
  });
});
