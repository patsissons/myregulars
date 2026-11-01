import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useIsMobile } from "./use-media";

const originalWidth = window.innerWidth;

function setWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
}

afterEach(() => {
  setWidth(originalWidth);
});

describe("useIsMobile", () => {
  it("is true at phone widths and false at desktop widths", () => {
    setWidth(390);
    const { result, rerender } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);

    setWidth(1280);
    rerender();
    // No resize event yet: the snapshot is re-read on render.
    expect(result.current).toBe(false);
  });

  it("updates when the window resizes", () => {
    setWidth(1280);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      setWidth(412);
      window.dispatchEvent(new Event("resize"));
    });
    expect(result.current).toBe(true);
  });

  it("treats the lg breakpoint boundary as desktop", () => {
    setWidth(1024);
    expect(renderHook(() => useIsMobile()).result.current).toBe(false);
    setWidth(1023);
    expect(renderHook(() => useIsMobile()).result.current).toBe(true);
  });
});
