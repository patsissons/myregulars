import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { DropdownMenu } from "./dropdown-menu";

describe("DropdownMenu", () => {
  it("does not render the menu until the trigger is clicked", () => {
    render(
      <DropdownMenu
        trigger={<button type="button">Open</button>}
        items={[{ label: "Edit", onClick: () => {} }]}
      />,
    );
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens on trigger click and renders items", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu
        trigger={<button type="button">Open</button>}
        items={[
          { label: "Edit", onClick: () => {} },
          { label: "Delete", onClick: () => {}, destructive: true },
        ]}
      />,
    );
    await user.click(screen.getByText("Open"));
    expect(screen.getByRole("menu")).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeTruthy();
  });

  it("fires item onClick and closes the menu", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <DropdownMenu
        trigger={<button type="button">Open</button>}
        items={[{ label: "Edit", onClick }]}
      />,
    );
    await user.click(screen.getByText("Open"));
    await user.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes when Escape is pressed", async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu
        trigger={<button type="button">Open</button>}
        items={[{ label: "Edit", onClick: () => {} }]}
      />,
    );
    await user.click(screen.getByText("Open"));
    expect(screen.getByRole("menu")).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes on an outside pointerdown", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <DropdownMenu
          trigger={<button type="button">Open</button>}
          items={[{ label: "Edit", onClick: () => {} }]}
        />
        <span data-testid="outside">elsewhere</span>
      </div>,
    );
    await user.click(screen.getByText("Open"));
    expect(screen.getByRole("menu")).toBeTruthy();
    fireEvent.pointerDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
