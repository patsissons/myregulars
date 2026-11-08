import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { ResponsiveDialog } from "./responsive-dialog";

const pushSheetEntry = vi.fn();
const popSheetEntry = vi.fn();
vi.mock("@/lib/router/history", () => ({
  pushSheetEntry: (id: string) => pushSheetEntry(id),
  popSheetEntry: (id: string) => popSheetEntry(id),
  subscribeRouter: () => () => {},
  getRouterState: () => null,
  getServerRouterState: () => null,
}));

function setWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  act(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

afterEach(() => {
  setWidth(1024);
  pushSheetEntry.mockClear();
  popSheetEntry.mockClear();
});

describe("ResponsiveDialog", () => {
  it("renders a modal with a close button on desktop", () => {
    setWidth(1280);
    render(
      <ResponsiveDialog open onOpenChange={() => {}} title="Rename">
        <p>Body</p>
      </ResponsiveDialog>,
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByLabelText("Close")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });

  it("renders a sheet with Cancel · Title · Action on mobile", async () => {
    const user = userEvent.setup();
    setWidth(390);
    const onOpenChange = vi.fn();
    const onSave = vi.fn();
    render(
      <ResponsiveDialog
        open
        onOpenChange={onOpenChange}
        title="Rename"
        action={{ label: "Save", onClick: onSave }}
      >
        <p>Body</p>
      </ResponsiveDialog>,
    );
    expect(screen.getByText("Rename")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps the mobile header to three grid cells so the action stays on the title row", () => {
    setWidth(390);
    render(
      <ResponsiveDialog
        open
        onOpenChange={() => {}}
        title="Edit person"
        action={{ label: "Save", onClick: () => {} }}
      >
        <p>Body</p>
      </ResponsiveDialog>,
    );
    // The empty Radix description must not occupy a column of the
    // Cancel · Title · Action grid, or the action wraps to a second row.
    const header = screen.getByRole("button", { name: "Save" }).parentElement?.parentElement;
    expect(header?.className).toContain("grid-cols-[1fr_auto_1fr]");
    const visible = Array.from(header?.children ?? []).filter(
      (el) => !el.classList.contains("hidden"),
    );
    expect(visible).toHaveLength(3);
  });

  it("submits a form by id from the header action", async () => {
    const user = userEvent.setup();
    setWidth(390);
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <ResponsiveDialog
        open
        onOpenChange={() => {}}
        title="Add"
        action={{ label: "Add", form: "add-form" }}
      >
        <form id="add-form" onSubmit={onSubmit}>
          <input aria-label="Name" />
        </form>
      </ResponsiveDialog>,
    );
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("pushes and pops a history entry when given a historyId", () => {
    const { rerender } = render(
      <ResponsiveDialog open={false} onOpenChange={() => {}} title="X" historyId="x">
        <p>Body</p>
      </ResponsiveDialog>,
    );
    expect(pushSheetEntry).not.toHaveBeenCalled();
    rerender(
      <ResponsiveDialog open onOpenChange={() => {}} title="X" historyId="x">
        <p>Body</p>
      </ResponsiveDialog>,
    );
    expect(pushSheetEntry).toHaveBeenCalledWith("x");
    rerender(
      <ResponsiveDialog open={false} onOpenChange={() => {}} title="X" historyId="x">
        <p>Body</p>
      </ResponsiveDialog>,
    );
    expect(popSheetEntry).toHaveBeenCalledWith("x");
  });

  it("renders the footer on desktop only", () => {
    setWidth(1280);
    const { unmount } = render(
      <ResponsiveDialog open onOpenChange={() => {}} title="X" footer={<button>Save</button>}>
        <p>Body</p>
      </ResponsiveDialog>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
    unmount();
    setWidth(390);
    render(
      <ResponsiveDialog open onOpenChange={() => {}} title="X" footer={<button>Save</button>}>
        <p>Body</p>
      </ResponsiveDialog>,
    );
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  });

  it("stays out of history without a historyId", () => {
    render(
      <ResponsiveDialog open onOpenChange={() => {}} title="X">
        <p>Body</p>
      </ResponsiveDialog>,
    );
    expect(pushSheetEntry).not.toHaveBeenCalled();
  });
});
