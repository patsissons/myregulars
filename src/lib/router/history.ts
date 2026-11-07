"use client";

/**
 * The app's own history store.
 *
 * The whole app renders from a single Next.js route, so navigation is just
 * `history.pushState` / `replaceState` plus a store update; Next's router
 * integrates with the native history API and never fetches on traversal
 * because the segment tree never changes. Owning the store (rather than
 * deriving from `usePathname`) lets back/forward commit synchronously, drive
 * view transitions, and restore scroll positions per entry.
 *
 * Each history entry carries `mrKey` (scroll bucket), `mrIdx` (position, for
 * direction), `mrFrom` (href of the entry below it, for hierarchical Back)
 * and `mrSheet` (an open sheet's id, so system Back closes it). Next's own
 * keys on `history.state` are preserved.
 */

import { href, parentRoute, parseRoute, routes, type Route } from "@/lib/router/routes";
import { withViewTransition, type NavDirection } from "@/lib/router/view-transition";

export interface RouterState {
  route: Route;
  /** Stable per history entry; keys scroll positions and screen remounts. */
  key: string;
  index: number;
  /** Id of the sheet whose history entry this is, if any. */
  sheet: string | null;
  /** href of the previous entry, when it was created by this app. */
  from: string | null;
}

interface HistoryMarkers {
  mrKey?: string;
  mrIdx?: number;
  mrSheet?: string | null;
  mrFrom?: string | null;
}

export interface NavigateOptions {
  replace?: boolean;
  transition?: NavDirection;
}

let state: RouterState | null = null;
let initialized = false;
const listeners = new Set<() => void>();
const scrollPositions = new Map<string, { window: number; region: number }>();

function notify(): void {
  for (const listener of listeners) listener();
}

function newKey(): string {
  return Math.random().toString(36).slice(2, 10);
}

function readMarkers(): HistoryMarkers {
  const raw = window.history.state;
  return raw && typeof raw === "object" ? (raw as HistoryMarkers) : {};
}

function withMarkers(existing: unknown, next: RouterState): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" ? (existing as Record<string, unknown>) : {};
  return { ...base, mrKey: next.key, mrIdx: next.index, mrSheet: next.sheet, mrFrom: next.from };
}

function locationRoute(): Route {
  return parseRoute(window.location.pathname, window.location.search);
}

function coarsePointer(): boolean {
  return window.matchMedia("(pointer: coarse)").matches;
}

export function subscribeRouter(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getRouterState(): RouterState | null {
  return state;
}

export function getServerRouterState(): RouterState | null {
  return null;
}

// ─── Scroll restoration ──────────────────────────────────────────────────────

function scrollRegion(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-scroll-region]");
}

function saveScroll(key: string): void {
  scrollPositions.set(key, {
    window: window.scrollY,
    region: scrollRegion()?.scrollTop ?? 0,
  });
}

/** Applies the saved scroll for an entry, or resets to the top for a fresh one. */
export function restoreScroll(key: string): void {
  const saved = scrollPositions.get(key);
  window.scrollTo(0, saved?.window ?? 0);
  const region = scrollRegion();
  if (region) region.scrollTop = saved?.region ?? 0;
}

// ─── Commit ──────────────────────────────────────────────────────────────────

function commit(next: RouterState, direction: NavDirection): void {
  withViewTransition(direction, () => {
    state = next;
    notify();
  });
}

function onPopState(event: PopStateEvent): void {
  if (!state) return;
  const previous = state;
  saveScroll(previous.key);

  const markers = readMarkers();
  const next: RouterState = {
    route: locationRoute(),
    key: markers.mrKey ?? newKey(),
    index: markers.mrIdx ?? 0,
    sheet: markers.mrSheet ?? null,
    from: markers.mrFrom ?? null,
  };

  // iOS Safari animates the swipe itself; animating again reads as a flash.
  // The property is undefined where unsupported, so on touch devices assume
  // the UA handled it.
  const uaAnimated =
    event.hasUAVisualTransition === true ||
    (event.hasUAVisualTransition === undefined && coarsePointer());
  const sameScreen = href(previous.route) === href(next.route);
  const direction: NavDirection =
    sameScreen || uaAnimated ? "none" : next.index < previous.index ? "back" : "forward";

  commit(next, direction);
}

/**
 * Reads the current location into the store and starts listening for
 * traversal. Idempotent; returns a cleanup for the listener.
 */
export function initRouter(): () => void {
  if (typeof window === "undefined") return () => {};
  if (initialized) return () => {};
  initialized = true;

  window.history.scrollRestoration = "manual";

  const markers = readMarkers();
  const initial: RouterState = {
    route: locationRoute(),
    key: markers.mrKey ?? newKey(),
    index: markers.mrIdx ?? 0,
    // A sheet marker left over from before a reload has no sheet to go with it.
    sheet: null,
    from: markers.mrFrom ?? null,
  };
  window.history.replaceState(withMarkers(window.history.state, initial), "", window.location.href);
  state = initial;
  notify();

  window.addEventListener("popstate", onPopState);
  return () => {
    window.removeEventListener("popstate", onPopState);
    initialized = false;
    state = null;
  };
}

/** Test-only. */
export function resetRouterForTests(): void {
  if (typeof window !== "undefined") window.removeEventListener("popstate", onPopState);
  initialized = false;
  state = null;
  scrollPositions.clear();
  notify();
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export function navigate(route: Route, options: NavigateOptions = {}): void {
  if (!state) {
    if (typeof window !== "undefined") window.location.assign(href(route));
    return;
  }

  const current = state;
  const url = href(route);
  saveScroll(current.key);

  // A sheet's history entry is consumed by navigating away: the new screen
  // replaces it so Back from there returns to the screen under the sheet.
  const replace = options.replace || current.sheet !== null;
  const next: RouterState = {
    route,
    key: newKey(),
    index: replace ? current.index : current.index + 1,
    sheet: null,
    from: replace ? current.from : href(current.route),
  };

  const data = withMarkers(null, next);
  if (replace) {
    window.history.replaceState(data, "", url);
  } else {
    window.history.pushState(data, "", url);
  }

  commit(next, options.transition ?? (replace ? "none" : "forward"));
}

/**
 * Hierarchical Back: a real traversal when the previous entry is this
 * screen's parent, otherwise a replace to the parent. Never leaves the app
 * from a deep link, never lands on a stale sibling.
 */
export function goBack(): void {
  if (!state) return;
  const parent = parentRoute(state.route) ?? routes.landing();

  if (state.index > 0 && state.from === href(parent)) {
    window.history.back();
    return;
  }

  navigate(parent, { replace: true, transition: "back" });
}

// ─── Sheets ──────────────────────────────────────────────────────────────────

/** Pushes an entry for an open sheet so the system Back gesture closes it. */
export function pushSheetEntry(id: string): void {
  if (!state || state.sheet === id) return;
  const next: RouterState = {
    ...state,
    key: newKey(),
    index: state.index + 1,
    sheet: id,
    from: href(state.route),
  };
  window.history.pushState(withMarkers(null, next), "", window.location.href);
  state = next;
  notify();
}

/** Pops the sheet's entry if it is on top. Returns false when there was none. */
export function popSheetEntry(id: string): boolean {
  if (!state || state.sheet !== id) return false;
  window.history.back();
  return true;
}
