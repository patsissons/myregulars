import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { ResumeWatchdog } from "./resume-watchdog";

const refresh = vi.fn();
const hardReload = vi.fn();
let mockPathname = "/";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
  usePathname: () => mockPathname,
}));

vi.mock("@/lib/hard-reload", () => ({
  hardReload: () => hardReload(),
}));

function setVisibilityState(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
}

function dispatchVisibilityChange(state: DocumentVisibilityState) {
  setVisibilityState(state);
  document.dispatchEvent(new Event("visibilitychange"));
}

function dispatchPageShow(persisted: boolean) {
  // The jsdom PageTransitionEvent constructor drops the `persisted` option.
  const event = new Event("pageshow") as PageTransitionEvent;
  Object.defineProperty(event, "persisted", { value: persisted });
  window.dispatchEvent(event);
}

describe("ResumeWatchdog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refresh.mockClear();
    hardReload.mockClear();
    mockPathname = "/";
    setVisibilityState("visible");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refreshes the router after resuming from a long idle", () => {
    render(<ResumeWatchdog />);
    dispatchVisibilityChange("hidden");
    vi.advanceTimersByTime(6 * 60_000);
    dispatchVisibilityChange("visible");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not refresh after a short idle", () => {
    render(<ResumeWatchdog />);
    dispatchVisibilityChange("hidden");
    vi.advanceTimersByTime(60_000);
    dispatchVisibilityChange("visible");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("does not refresh when the page was never hidden", () => {
    render(<ResumeWatchdog />);
    dispatchVisibilityChange("visible");
    dispatchPageShow(true);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("handles a bfcache restore via pageshow", () => {
    render(<ResumeWatchdog />);
    window.dispatchEvent(new Event("pagehide"));
    vi.advanceTimersByTime(6 * 60_000);
    dispatchPageShow(true);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("ignores pageshow when the page was not restored from bfcache", () => {
    render(<ResumeWatchdog />);
    window.dispatchEvent(new Event("pagehide"));
    vi.advanceTimersByTime(6 * 60_000);
    dispatchPageShow(false);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refreshes only once when pageshow and visibilitychange both fire", () => {
    render(<ResumeWatchdog />);
    dispatchVisibilityChange("hidden");
    vi.advanceTimersByTime(6 * 60_000);
    dispatchPageShow(true);
    dispatchVisibilityChange("visible");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("hard-reloads when a popstate navigation never commits", () => {
    // The rendered route (usePathname) lags behind the browser URL.
    mockPathname = "/v/abc/l/loc-1/p/p-1";
    render(<ResumeWatchdog />);
    window.dispatchEvent(new PopStateEvent("popstate"));
    vi.advanceTimersByTime(3_000);
    expect(hardReload).toHaveBeenCalledTimes(1);
  });

  it("does not reload when the popstate navigation commits", () => {
    // jsdom's location.pathname is "/", matching the rendered route.
    render(<ResumeWatchdog />);
    window.dispatchEvent(new PopStateEvent("popstate"));
    vi.advanceTimersByTime(3_000);
    expect(hardReload).not.toHaveBeenCalled();
  });
});
