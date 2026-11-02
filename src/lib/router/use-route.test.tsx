import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { getRouterState, initRouter, navigate, resetRouterForTests } from "./history";
import { routes } from "./routes";
import { useHistorySheet, useRouterState } from "./use-route";

beforeEach(() => {
  resetRouterForTests();
  window.history.replaceState(null, "", "/vaults");
  const originalBack = window.history.back.bind(window.history);
  vi.spyOn(window.history, "back").mockImplementation(() => {
    originalBack();
  });
});

afterEach(() => {
  resetRouterForTests();
  vi.restoreAllMocks();
});

describe("useRouterState", () => {
  it("is null before init and tracks navigation after", () => {
    const { result } = renderHook(() => useRouterState());
    expect(result.current).toBeNull();

    act(() => {
      initRouter();
    });
    expect(result.current?.route).toEqual(routes.vaults());

    act(() => {
      navigate(routes.connect());
    });
    expect(result.current?.route).toEqual(routes.connect());
  });
});

describe("useHistorySheet", () => {
  it("pushes an entry when opened and pops it when closed from the UI", async () => {
    initRouter();
    const onClose = vi.fn();
    const { rerender } = renderHook(
      ({ open }: { open: boolean }) => useHistorySheet("sheet", open, onClose),
      { initialProps: { open: false } },
    );
    expect(getRouterState()?.sheet).toBeNull();

    rerender({ open: true });
    expect(getRouterState()?.sheet).toBe("sheet");
    expect(onClose).not.toHaveBeenCalled();

    rerender({ open: false });
    await vi.waitFor(() => expect(getRouterState()?.sheet).toBeNull());
    expect(window.history.back).toHaveBeenCalledTimes(1);
  });

  it("closes the sheet when the system Back gesture pops its entry", async () => {
    initRouter();
    const onClose = vi.fn();
    const { rerender } = renderHook(
      ({ open }: { open: boolean }) => useHistorySheet("sheet", open, onClose),
      { initialProps: { open: false } },
    );
    rerender({ open: true });
    expect(getRouterState()?.sheet).toBe("sheet");

    await act(async () => {
      window.history.back();
      await vi.waitFor(() => expect(getRouterState()?.sheet).toBeNull());
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(getRouterState()?.route).toEqual(routes.vaults());
  });

  it("does nothing when the router is not running (tests, SSR)", () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(
      ({ open }: { open: boolean }) => useHistorySheet("sheet", open, onClose),
      { initialProps: { open: false } },
    );
    rerender({ open: true });
    rerender({ open: false });
    expect(onClose).not.toHaveBeenCalled();
    expect(window.history.back).not.toHaveBeenCalled();
  });
});
