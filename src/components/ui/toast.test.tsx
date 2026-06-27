import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { ToastProvider, useToast } from "./toast";

function Trigger({ message = "hi" }: { message?: string }) {
  const { showToast } = useToast();
  return (
    <button type="button" onClick={() => showToast(message)}>
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

  it("throws when useToast is used outside a provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow("useToast must be used inside ToastProvider");
    spy.mockRestore();
  });
});
