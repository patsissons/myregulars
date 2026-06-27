import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKeyboardInset } from "./use-keyboard-inset";

type Listener = () => void;

function installVisualViewport(height: number, offsetTop = 0) {
  const listeners = new Map<string, Set<Listener>>();
  const vv = {
    height,
    offsetTop,
    addEventListener: (type: string, cb: Listener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(cb);
    },
    removeEventListener: (type: string, cb: Listener) => {
      listeners.get(type)?.delete(cb);
    },
    dispatch: (type: string) => listeners.get(type)?.forEach((cb) => cb()),
    set(h: number, top = 0) {
      this.height = h;
      this.offsetTop = top;
    },
  };
  Object.defineProperty(window, "visualViewport", { configurable: true, value: vv });
  return vv;
}

function removeVisualViewport() {
  Object.defineProperty(window, "visualViewport", { configurable: true, value: undefined });
}

beforeEach(() => {
  Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: 800 });
});

afterEach(() => {
  removeVisualViewport();
});

describe("useKeyboardInset", () => {
  it("returns a zero inset when inactive", () => {
    installVisualViewport(500);
    const { result } = renderHook(() => useKeyboardInset(false));
    expect(result.current).toEqual({ inset: 0, viewportHeight: 0 });
  });

  it("reports the keyboard inset and visible height when active", () => {
    installVisualViewport(500);
    const { result } = renderHook(() => useKeyboardInset(true));
    expect(result.current.inset).toBe(300); // 800 - 500 - 0
    expect(result.current.viewportHeight).toBe(500);
  });

  it("reports no inset when the visual viewport fills the window", () => {
    installVisualViewport(800);
    const { result } = renderHook(() => useKeyboardInset(true));
    expect(result.current.inset).toBe(0);
    expect(result.current.viewportHeight).toBe(800);
  });

  it("accounts for the visual viewport offsetTop", () => {
    installVisualViewport(500, 100);
    const { result } = renderHook(() => useKeyboardInset(true));
    expect(result.current.inset).toBe(200); // 800 - 500 - 100
  });

  it("updates when the visual viewport resizes (keyboard opens)", () => {
    const vv = installVisualViewport(800);
    const { result } = renderHook(() => useKeyboardInset(true));
    expect(result.current.inset).toBe(0);

    act(() => {
      vv.set(500);
      vv.dispatch("resize");
    });
    expect(result.current.inset).toBe(300);
    expect(result.current.viewportHeight).toBe(500);
  });

  it("falls back to a zero inset and window height without VisualViewport", () => {
    removeVisualViewport();
    const { result } = renderHook(() => useKeyboardInset(true));
    expect(result.current).toEqual({ inset: 0, viewportHeight: 800 });
  });
});
