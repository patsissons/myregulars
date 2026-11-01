"use client";

import { useSyncExternalStore } from "react";

/** Below this width the app uses its stacked mobile layout (Tailwind `lg`). */
export const MOBILE_MAX_WIDTH = 1023;

function subscribe(callback: () => void): () => void {
  window.addEventListener("resize", callback);
  window.addEventListener("orientationchange", callback);
  return () => {
    window.removeEventListener("resize", callback);
    window.removeEventListener("orientationchange", callback);
  };
}

function getIsMobile(): boolean {
  return window.innerWidth <= MOBILE_MAX_WIDTH;
}

function getServerIsMobile(): boolean {
  return false;
}

/**
 * Whether the viewport is in the mobile range. One subscription shared by
 * every caller, with a stable server snapshot so hydration never mismatches.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getIsMobile, getServerIsMobile);
}
