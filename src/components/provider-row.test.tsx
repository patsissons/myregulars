import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { ProviderRow } from "./provider-row";

const baseProps = {
  name: "GitHub Gists",
  description: "Store vaults as Gists",
  icon: <span data-testid="provider-icon">icon</span>,
};

describe("ProviderRow", () => {
  it("renders name, description and icon", () => {
    render(<ProviderRow {...baseProps} enabled />);
    expect(screen.getByText("GitHub Gists")).toBeTruthy();
    expect(screen.getByText("Store vaults as Gists")).toBeTruthy();
    expect(screen.getByTestId("provider-icon")).toBeTruthy();
  });

  it("calls onClick when enabled and clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ProviderRow {...baseProps} enabled onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled and does not call onClick when not enabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ProviderRow {...baseProps} enabled={false} onClick={onClick} />);
    const button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is disabled and shows a spinner while loading", () => {
    const { container } = render(
      <ProviderRow {...baseProps} enabled isLoading onClick={vi.fn()} />,
    );
    const button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("does not call onClick when loading even though enabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ProviderRow {...baseProps} enabled isLoading onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders an error message when provided", () => {
    render(<ProviderRow {...baseProps} enabled error="Something failed" />);
    expect(screen.getByText("Something failed")).toBeTruthy();
  });

  it("does not render an error message by default", () => {
    render(<ProviderRow {...baseProps} enabled />);
    expect(screen.queryByText("Something failed")).toBeNull();
  });

  it("rotates the chevron down when expanded and right when collapsed", () => {
    const { container, rerender } = render(<ProviderRow {...baseProps} enabled expanded={false} />);
    const chevron = container.querySelector(".lucide-chevron-right") as SVGElement;
    expect(chevron.style.transform).toBe("rotate(0deg)");

    rerender(<ProviderRow {...baseProps} enabled expanded={true} />);
    expect(chevron.style.transform).toBe("rotate(90deg)");
  });
});
