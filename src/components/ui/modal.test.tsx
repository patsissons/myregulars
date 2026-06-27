import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Modal } from "./modal";

describe("Modal", () => {
  it("renders title and children when open", () => {
    render(
      <Modal open onOpenChange={() => {}} title="Edit Regular">
        <p>Body content</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Edit Regular")).toBeTruthy();
    expect(screen.getByText("Body content")).toBeTruthy();
  });

  it("does not render content when closed", () => {
    render(
      <Modal open={false} onOpenChange={() => {}} title="Hidden">
        <p>Body content</p>
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Body content")).toBeNull();
  });

  it("renders children without a title header", () => {
    render(
      <Modal open onOpenChange={() => {}}>
        <p>No title here</p>
      </Modal>,
    );
    expect(screen.getByText("No title here")).toBeTruthy();
    expect(screen.queryByLabelText("Close")).toBeNull();
  });

  it("calls onOpenChange when the close button is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange} title="Closable">
        <p>Body</p>
      </Modal>,
    );
    await user.click(screen.getByLabelText("Close"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onOpenChange when Escape is pressed", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange} title="Escapable">
        <p>Body</p>
      </Modal>,
    );
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
