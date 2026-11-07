import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getRouterState,
  goBack,
  initRouter,
  navigate,
  popSheetEntry,
  pushSheetEntry,
  resetRouterForTests,
  subscribeRouter,
} from "./history";
import { href, routes } from "./routes";

const GIST = "gist:abc123def456abc123def456" as const;

/** Drives the jsdom history like a browser: `back()` fires popstate synchronously here. */
function pressBack() {
  window.history.back();
}

beforeEach(() => {
  resetRouterForTests();
  window.history.replaceState(null, "", "/");
  // happy-dom's history.back() fires popstate asynchronously; make it sync.
  const originalBack = window.history.back.bind(window.history);
  vi.spyOn(window.history, "back").mockImplementation(() => {
    originalBack();
  });
});

afterEach(() => {
  resetRouterForTests();
  vi.restoreAllMocks();
});

describe("initRouter", () => {
  it("reads the current location and stamps the entry", () => {
    window.history.replaceState(null, "", `/v/abc123def456abc123def456/l/L1`);
    initRouter();

    const state = getRouterState();
    expect(state?.route).toEqual(routes.location(GIST, "L1"));
    expect(state?.index).toBe(0);
    expect(state?.sheet).toBeNull();
    expect(window.history.state).toMatchObject({ mrIdx: 0, mrSheet: null });
    expect(window.history.scrollRestoration).toBe("manual");
  });

  it("drops a stale sheet marker left from before a reload", () => {
    window.history.replaceState({ mrKey: "k", mrIdx: 3, mrSheet: "person-form" }, "", "/vaults");
    initRouter();
    expect(getRouterState()?.sheet).toBeNull();
    expect(getRouterState()?.index).toBe(3);
  });

  it("notifies subscribers", () => {
    const listener = vi.fn();
    subscribeRouter(listener);
    initRouter();
    expect(listener).toHaveBeenCalled();
  });
});

describe("navigate", () => {
  it("pushes a new entry and updates the url", () => {
    initRouter();
    navigate(routes.vaults());

    expect(window.location.pathname).toBe("/vaults");
    expect(getRouterState()?.route).toEqual(routes.vaults());
    expect(getRouterState()?.index).toBe(1);
    expect(getRouterState()?.from).toBe("/");
    expect(window.history.state).toMatchObject({ mrIdx: 1, mrFrom: "/" });
  });

  it("replaces when asked, keeping the index", () => {
    initRouter();
    navigate(routes.vaults());
    navigate(routes.connect(), { replace: true });

    expect(window.location.pathname).toBe("/connect");
    expect(getRouterState()?.index).toBe(1);
    expect(getRouterState()?.from).toBe("/");
  });

  it("preserves foreign keys on history.state (Next's router markers)", () => {
    window.history.replaceState({ __NA: true, tree: ["x"] }, "", "/");
    initRouter();
    expect(window.history.state).toMatchObject({ __NA: true, tree: ["x"], mrIdx: 0 });
  });
});

describe("popstate", () => {
  it("follows real traversal in both directions", async () => {
    initRouter();
    navigate(routes.vaults());
    navigate(routes.vault(GIST));

    pressBack();
    await vi.waitFor(() => expect(getRouterState()?.route).toEqual(routes.vaults()));
    expect(getRouterState()?.index).toBe(1);

    window.history.forward();
    await vi.waitFor(() => expect(getRouterState()?.route).toEqual(routes.vault(GIST)));
    expect(getRouterState()?.index).toBe(2);
  });
});

describe("goBack (hierarchical)", () => {
  it("traverses when the previous entry is the parent", async () => {
    initRouter();
    navigate(routes.vault(GIST));
    navigate(routes.location(GIST, "L1"));
    expect(window.history.length).toBeGreaterThanOrEqual(3);

    goBack();

    await vi.waitFor(() => expect(getRouterState()?.route).toEqual(routes.vault(GIST)));
    expect(window.history.back).toHaveBeenCalledTimes(1);
  });

  it("replaces with the parent on a deep link (nothing in-app to go back to)", () => {
    window.history.replaceState(null, "", `/v/abc123def456abc123def456/l/L1/p/P1`);
    initRouter();

    goBack();

    expect(window.history.back).not.toHaveBeenCalled();
    expect(getRouterState()?.route).toEqual(routes.location(GIST, "L1"));
    expect(window.location.pathname).toBe(`/v/abc123def456abc123def456/l/L1`);
    expect(getRouterState()?.index).toBe(0);
  });

  it("replaces with the parent when the previous entry is a sibling, not the parent", () => {
    initRouter();
    navigate(routes.person(GIST, "L1", "P1"));
    navigate(routes.person(GIST, "L1", "P2"));

    goBack();

    expect(window.history.back).not.toHaveBeenCalled();
    expect(getRouterState()?.route).toEqual(routes.location(GIST, "L1"));
  });

  it("goes to the landing screen from the top level", () => {
    initRouter();
    navigate(routes.connect(), { replace: true });
    goBack();
    expect(getRouterState()?.route).toEqual(routes.landing());
  });
});

describe("sheet entries", () => {
  it("push/pop keep the route and mark the entry", async () => {
    initRouter();
    navigate(routes.location(GIST, "L1"));

    pushSheetEntry("person-form");
    expect(getRouterState()?.sheet).toBe("person-form");
    expect(getRouterState()?.route).toEqual(routes.location(GIST, "L1"));
    expect(getRouterState()?.index).toBe(2);
    expect(window.location.pathname).toBe(`/v/abc123def456abc123def456/l/L1`);

    expect(popSheetEntry("person-form")).toBe(true);
    await vi.waitFor(() => expect(getRouterState()?.sheet).toBeNull());
    expect(getRouterState()?.route).toEqual(routes.location(GIST, "L1"));
  });

  it("system back from a sheet entry clears the marker and stays on the screen", async () => {
    initRouter();
    navigate(routes.location(GIST, "L1"));
    pushSheetEntry("person-form");

    pressBack();

    await vi.waitFor(() => expect(getRouterState()?.sheet).toBeNull());
    expect(getRouterState()?.route).toEqual(routes.location(GIST, "L1"));
  });

  it("navigating away from an open sheet consumes its entry", () => {
    initRouter();
    navigate(routes.location(GIST, "L1"));
    pushSheetEntry("person-form");

    navigate(routes.person(GIST, "L1", "P1"));

    const state = getRouterState();
    expect(state?.sheet).toBeNull();
    expect(state?.index).toBe(2);
    expect(state?.from).toBe(href(routes.location(GIST, "L1")));
  });

  it("popSheetEntry is a no-op when no sheet entry is on top", () => {
    initRouter();
    expect(popSheetEntry("person-form")).toBe(false);
    expect(window.history.back).not.toHaveBeenCalled();
  });
});
