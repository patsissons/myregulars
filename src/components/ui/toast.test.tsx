import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { ToastProvider, useOptionalToast, useToast, type ToastVariant } from "./toast";

function Trigger({ message = "hi", variant }: { message?: string; variant?: ToastVariant }) {
  const { showToast } = useToast();
  return (
    <button type="button" onClick={() => showToast(message, variant ? { variant } : undefined)}>
      show
    </button>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ToastProvider / useToast", () => {
  it("renders nothing until showToast is called", () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows a toast message when showToast is called", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger message="Saved!" />
      </ToastProvider>,
    );
    await user.click(screen.getByText("show"));
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByText("Saved!")).toBeTruthy();
  });

  it("auto-dismisses after the timeout", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger message="Bye" />
      </ToastProvider>,
    );
    act(() => {
      screen.getByText("show").click();
    });
    expect(screen.getByText("Bye")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText("Bye")).toBeNull();
  });

  it("defaults to the success variant", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger message="Saved!" />
      </ToastProvider>,
    );
    await user.click(screen.getByText("show"));
    expect(screen.getByRole("status").getAttribute("data-variant")).toBe("success");
  });

  it("renders an assertive error variant that stays longer", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger message="Nope" variant="error" />
      </ToastProvider>,
    );
    act(() => {
      screen.getByText("show").click();
    });
    const status = screen.getByRole("status");
    expect(status.getAttribute("data-variant")).toBe("error");
    expect(status.getAttribute("aria-live")).toBe("assertive");

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText("Nope")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByText("Nope")).toBeNull();
  });

  it("useOptionalToast returns null outside a provider", () => {
    const { result } = renderHook(() => useOptionalToast());
    expect(result.current).toBeNull();
  });

  it("throws when useToast is used outside a provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow("useToast must be used inside ToastProvider");
    spy.mockRestore();
  });
});
