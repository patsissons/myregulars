import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { ReadOnlyBanner } from "./read-only-banner";

describe("ReadOnlyBanner", () => {
  it("renders the read-only message", () => {
    render(<ReadOnlyBanner onClone={() => {}} />);
    expect(screen.getByText(/Read-only vault/i)).toBeTruthy();
  });

  it("renders the clone action button", () => {
    render(<ReadOnlyBanner onClone={() => {}} />);
    expect(screen.getByRole("button", { name: "Clone to your vault" })).toBeTruthy();
  });

  it("calls onClone when the clone button is clicked", async () => {
    const user = userEvent.setup();
    const onClone = vi.fn();
    render(<ReadOnlyBanner onClone={onClone} />);
    await user.click(screen.getByRole("button", { name: "Clone to your vault" }));
    expect(onClone).toHaveBeenCalledOnce();
  });
});
