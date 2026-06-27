"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";

export interface KeyboardInset {
  /** Pixels the on-screen keyboard overlaps from the bottom of the layout viewport. */
  inset: number;
  /** Currently-visible viewport height in px (the area above the keyboard). */
  viewportHeight: number;
}

const ZERO: KeyboardInset = { inset: 0, viewportHeight: 0 };

function compute(): KeyboardInset {
  if (typeof window === "undefined") return ZERO;
  const vv = window.visualViewport;
  if (!vv) return { inset: 0, viewportHeight: window.innerHeight };
  return {
    inset: Math.max(0, window.innerHeight - vv.height - vv.offsetTop),
    viewportHeight: vv.height,
  };
}

/**
 * Tracks the on-screen keyboard inset via the VisualViewport API. iOS overlays
 * the keyboard and only shrinks the *visual* viewport, leaving `position: fixed`
 * UI anchored to the (unchanged) layout viewport — i.e. behind the keyboard.
 * Callers use `inset` to lift fixed UI above the keyboard and `viewportHeight`
 * to cap its height to the visible area. Only listens while `active`. Falls back
 * to a zero inset when VisualViewport is unavailable (SSR, jsdom, old browsers).
 */
export function useKeyboardInset(active: boolean): KeyboardInset {
  // Cache the snapshot so getSnapshot returns a stable reference between events
  // (required by useSyncExternalStore to avoid an infinite render loop).
  const cache = useRef<KeyboardInset>(ZERO);

  const subscribe = useCallback(
    (onChange: () => void) => {
      const vv = typeof window === "undefined" ? null : window.visualViewport;
      if (!active || !vv) return () => {};
      vv.addEventListener("resize", onChange);
      vv.addEventListener("scroll", onChange);
      return () => {
        vv.removeEventListener("resize", onChange);
        vv.removeEventListener("scroll", onChange);
      };
    },
    [active],
  );

  const getSnapshot = useCallback(() => {
    const next = active ? compute() : ZERO;
    if (
      next.inset !== cache.current.inset ||
      next.viewportHeight !== cache.current.viewportHeight
    ) {
      cache.current = next;
    }
    return cache.current;
  }, [active]);

  const getServerSnapshot = useCallback(() => ZERO, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
