import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

import { ToastProvider } from "@/components/ui/toast";
import { VaultStoreEffects } from "./vault-store-effects";

const mocks = vi.hoisted(() => {
  const listeners = new Set<(event: unknown) => void>();
  return {
    listeners,
    flushPendingSave: vi.fn(async () => {}),
  };
});

vi.mock("@/lib/vault-store", () => ({
  subscribeVaultEvents: (listener: (event: unknown) => void) => {
    mocks.listeners.add(listener);
    return () => mocks.listeners.delete(listener);
  },
  vaultActions: { flushPendingSave: mocks.flushPendingSave },
}));

function emit(event: unknown) {
  for (const listener of mocks.listeners) listener(event);
}

beforeEach(() => {
  mocks.listeners.clear();
  mocks.flushPendingSave.mockClear();
});

afterEach(() => {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
});

describe("VaultStoreEffects", () => {
  it("renders store toast events through the ToastProvider", () => {
    render(
      <ToastProvider>
        <VaultStoreEffects />
      </ToastProvider>,
    );

    act(() => {
      emit({ type: "toast", message: "Couldn't save changes.", variant: "error" });
    });

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Couldn't save changes.");
    expect(status.getAttribute("data-variant")).toBe("error");
  });

  it("is harmless without a ToastProvider", () => {
    render(<VaultStoreEffects />);
    expect(() => act(() => emit({ type: "toast", message: "x" }))).not.toThrow();
  });

  it("flushes pending saves on pagehide and when the tab is hidden", () => {
    render(<VaultStoreEffects />);

    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(mocks.flushPendingSave).toHaveBeenCalledTimes(1);

    act(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(mocks.flushPendingSave).toHaveBeenCalledTimes(2);

    act(() => {
      Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(mocks.flushPendingSave).toHaveBeenCalledTimes(2);
  });

  it("stops listening when unmounted", () => {
    const { unmount } = render(<VaultStoreEffects />);
    unmount();
    expect(mocks.listeners.size).toBe(0);

    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(mocks.flushPendingSave).not.toHaveBeenCalled();
  });
});
