import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useVault } from "@/lib/vault-context";
import { resetVaultStore } from "@/lib/vault-store";
import {
  clearOutbox,
  loadDatastore,
  readCachedDatastore,
  readOutbox,
  rememberVaultOwnership,
  saveDatastore,
  writeOutbox,
  type SaveResult,
} from "@/lib/db";
import { getGitHubAuthToken } from "@/lib/datastore/auth";
import { getAuthenticatedUser } from "@/lib/github-user";
import type { DatastoreSnapshot, Location, MyRegularsDocument } from "@/lib/datastore/types";

vi.mock("@/lib/db", () => ({
  createDatastore: vi.fn(),
  loadDatastore: vi.fn(),
  loadDatastoreVersion: vi.fn(),
  saveDatastore: vi.fn(),
  syncDatastoreReplicas: vi.fn(),
  readCachedDatastore: vi.fn(async () => null),
  readOutbox: vi.fn(async () => null),
  writeOutbox: vi.fn(async () => {}),
  clearOutbox: vi.fn(async () => {}),
  rememberVaultOwnership: vi.fn(async () => {}),
}));

vi.mock("@/lib/datastore/auth", () => ({
  getGitHubAuthToken: vi.fn(() => "test-token"),
}));

vi.mock("@/lib/github-user", () => ({
  getAuthenticatedUser: vi.fn(),
}));

const NOW = "2026-06-27T10:00:00.000Z";

function location(id: string, name: string): Location {
  return {
    id,
    name,
    groups: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function doc(locations: Location[], name = "Cached Vault"): MyRegularsDocument {
  return {
    app: "myregulars",
    schemaVersion: 2,
    id: "vault-1",
    name,
    updatedAt: "2026-01-01T00:00:00.000Z",
    data: { locations },
  };
}

function snapshot(
  document: MyRegularsDocument,
  overrides: Partial<DatastoreSnapshot> = {},
): SaveResult {
  return {
    document,
    version: "v1",
    uri: "gist:abc",
    source: "remote",
    mirror: { status: "none" },
    ...overrides,
  };
}

/** A promise whose resolution the test controls. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function stubOwnerFetch(login: string): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ owner: { login } }) } as Response),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  resetVaultStore();
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
  vi.mocked(getGitHubAuthToken).mockReturnValue("test-token");
  vi.mocked(getAuthenticatedUser).mockResolvedValue({ login: "owner", id: 1, avatar_url: "" });
  stubOwnerFetch("owner");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("cache-first open", () => {
  it("renders the cached copy immediately and swaps in the remote copy when it arrives", async () => {
    const cached = snapshot(doc([location("L1", "Cafe")]), {
      source: "cache",
      ownership: { ownerHandle: "owner", isReadOnly: false },
    });
    const remote = deferred<DatastoreSnapshot>();
    vi.mocked(readCachedDatastore).mockResolvedValueOnce(cached);
    vi.mocked(loadDatastore).mockReturnValueOnce(remote.promise);

    const { result } = renderHook(() => useVault());
    let opened: Promise<void> = Promise.resolve();
    act(() => {
      opened = result.current.openVault("gist:abc");
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Cached content is on screen before the network answers.
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRevalidating).toBe(true);
    expect(result.current.source).toBe("cache");
    expect(result.current.vault?.locations.map((l) => l.name)).toEqual(["Cafe"]);
    expect(result.current.isReadOnly).toBe(false);

    await act(async () => {
      remote.resolve(
        snapshot(doc([location("L1", "Cafe"), location("L2", "Bar")]), { version: "v2" }),
      );
      await opened;
    });

    expect(result.current.source).toBe("remote");
    expect(result.current.version).toBe("v2");
    expect(result.current.isRevalidating).toBe(false);
    expect(result.current.vault?.locations.map((l) => l.name)).toEqual(["Cafe", "Bar"]);
    expect(rememberVaultOwnership).toHaveBeenCalledWith("gist:abc", {
      ownerHandle: "owner",
      isReadOnly: false,
    });
  });

  it("treats a cached copy with unknown ownership as read-only until the network answers", async () => {
    const remote = deferred<DatastoreSnapshot>();
    vi.mocked(readCachedDatastore).mockResolvedValueOnce(
      snapshot(doc([location("L1", "Cafe")]), { source: "cache" }),
    );
    vi.mocked(loadDatastore).mockReturnValueOnce(remote.promise);

    const { result } = renderHook(() => useVault());
    act(() => {
      void result.current.openVault("gist:abc");
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.vault).not.toBeNull();
    expect(result.current.isReadOnly).toBe(true);
  });

  it("shows the loading state only when nothing is cached", async () => {
    const remote = deferred<DatastoreSnapshot>();
    vi.mocked(loadDatastore).mockReturnValueOnce(remote.promise);

    const { result } = renderHook(() => useVault());
    act(() => {
      void result.current.openVault("gist:abc");
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.vault).toBeNull();
  });

  it("keeps showing the cached copy when the refresh fails", async () => {
    vi.mocked(readCachedDatastore).mockResolvedValueOnce(
      snapshot(doc([location("L1", "Cafe")]), {
        source: "cache",
        ownership: { ownerHandle: "owner", isReadOnly: false },
      }),
    );
    vi.mocked(loadDatastore).mockRejectedValueOnce(new Error("offline"));

    const { result } = renderHook(() => useVault());
    await act(async () => {
      await result.current.openVault("gist:abc");
    });

    expect(result.current.vault?.locations).toHaveLength(1);
    expect(result.current.error).toBeNull();
    expect(result.current.source).toBe("cache");
    expect(result.current.isRevalidating).toBe(false);
  });

  it("re-opening the vault that is already open revalidates without clearing it", async () => {
    vi.mocked(loadDatastore).mockResolvedValue(snapshot(doc([location("L1", "Cafe")])));
    const { result } = renderHook(() => useVault());
    await act(async () => {
      await result.current.openVault("gist:abc");
    });

    const remote = deferred<DatastoreSnapshot>();
    vi.mocked(loadDatastore).mockReturnValueOnce(remote.promise);
    act(() => {
      void result.current.openVault("gist:abc");
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.vault?.locations).toHaveLength(1);
    expect(result.current.isLoading).toBe(false);
    expect(readCachedDatastore).toHaveBeenCalledTimes(1);

    await act(async () => {
      remote.resolve(snapshot(doc([location("L1", "Cafe"), location("L2", "Bar")])));
      await Promise.resolve();
    });
    expect(result.current.vault?.locations).toHaveLength(2);
  });

  it("does not overwrite local edits made while the refresh was in flight", async () => {
    vi.mocked(readCachedDatastore).mockResolvedValueOnce(
      snapshot(doc([location("L1", "Cafe")]), {
        source: "cache",
        ownership: { ownerHandle: "owner", isReadOnly: false },
      }),
    );
    const remote = deferred<DatastoreSnapshot>();
    vi.mocked(loadDatastore).mockReturnValueOnce(remote.promise);

    const { result } = renderHook(() => useVault());
    act(() => {
      void result.current.openVault("gist:abc");
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    act(() => {
      result.current.addLocation("Diner");
    });

    await act(async () => {
      remote.resolve(snapshot(doc([location("L1", "Cafe"), location("L9", "Elsewhere")])));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.vault?.locations.map((l) => l.name)).toEqual(["Cafe", "Diner"]);
    expect(result.current.dirty).toBe(true);
  });
});

describe("outbox", () => {
  it("mirrors each edit into the outbox and clears it once saved", async () => {
    vi.mocked(loadDatastore).mockResolvedValue(snapshot(doc([location("L1", "Cafe")])));
    vi.mocked(saveDatastore).mockResolvedValue(snapshot(doc([]), { version: "v2" }));

    const { result } = renderHook(() => useVault());
    await act(async () => {
      await result.current.openVault("gist:abc");
    });
    act(() => {
      result.current.addLocation("Diner");
    });

    expect(result.current.dirty).toBe(true);
    expect(writeOutbox).toHaveBeenCalledTimes(1);
    const entry = vi.mocked(writeOutbox).mock.calls[0][0];
    expect(entry.uri).toBe("gist:abc");
    expect(entry.expectedVersion).toBe("v1");
    expect(entry.document.data.locations.map((l) => l.name)).toEqual(["Cafe", "Diner"]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(result.current.dirty).toBe(false);
    expect(clearOutbox).toHaveBeenCalledWith("gist:abc");
  });

  it("restores unsaved edits from a previous session and saves them", async () => {
    const pending = doc([location("L1", "Cafe"), location("L2", "Unsaved")]);
    vi.mocked(readCachedDatastore).mockResolvedValueOnce(
      snapshot(doc([location("L1", "Cafe")]), {
        source: "cache",
        ownership: { ownerHandle: "owner", isReadOnly: false },
      }),
    );
    vi.mocked(readOutbox).mockResolvedValueOnce({
      uri: "gist:abc",
      document: pending,
      expectedVersion: "v1",
      updatedAt: NOW,
    });
    vi.mocked(loadDatastore).mockResolvedValue(snapshot(doc([location("L1", "Cafe")])));
    vi.mocked(saveDatastore).mockResolvedValue(snapshot(pending, { version: "v2" }));

    const { result } = renderHook(() => useVault());
    await act(async () => {
      await result.current.openVault("gist:abc");
    });

    // Local edits win over both the cache and the (unchanged) remote copy.
    expect(result.current.vault?.locations.map((l) => l.name)).toEqual(["Cafe", "Unsaved"]);
    expect(result.current.dirty).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    const saved = vi.mocked(saveDatastore).mock.calls[0][0];
    expect(saved.expectedVersion).toBe("v1");
    expect(saved.document.data.locations.map((l) => l.name)).toEqual(["Cafe", "Unsaved"]);
    expect(result.current.dirty).toBe(false);
    expect(result.current.version).toBe("v2");
  });
});

describe("flushPendingSave", () => {
  it("saves immediately with keepalive instead of waiting out the debounce", async () => {
    vi.mocked(loadDatastore).mockResolvedValue(snapshot(doc([location("L1", "Cafe")])));
    vi.mocked(saveDatastore).mockResolvedValue(snapshot(doc([]), { version: "v2" }));

    const { result } = renderHook(() => useVault());
    await act(async () => {
      await result.current.openVault("gist:abc");
    });
    act(() => {
      result.current.addLocation("Diner");
    });
    expect(saveDatastore).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.flushPendingSave();
    });

    expect(saveDatastore).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveDatastore).mock.calls[0][0].keepalive).toBe(true);

    // The debounce was cancelled: nothing saves twice.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(saveDatastore).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when nothing is pending", async () => {
    const { result } = renderHook(() => useVault());
    await act(async () => {
      await result.current.flushPendingSave();
    });
    expect(saveDatastore).not.toHaveBeenCalled();
  });

  it("runs before switching to another vault", async () => {
    vi.mocked(loadDatastore).mockResolvedValue(snapshot(doc([location("L1", "Cafe")])));
    vi.mocked(saveDatastore).mockResolvedValue(snapshot(doc([]), { version: "v2" }));

    const { result } = renderHook(() => useVault());
    await act(async () => {
      await result.current.openVault("gist:abc");
    });
    act(() => {
      result.current.addLocation("Diner");
    });

    vi.mocked(loadDatastore).mockResolvedValue(
      snapshot(doc([], "Other"), { uri: "gist:other", version: "o1" }),
    );
    await act(async () => {
      await result.current.openVault("gist:other");
    });

    expect(saveDatastore).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveDatastore).mock.calls[0][0].uri).toBe("gist:abc");
    expect(result.current.uri).toBe("gist:other");
    expect(result.current.vault?.name).toBe("Other");
  });
});

describe("save serialization", () => {
  it("does not start a second save while one is in flight; the follow-up carries the newest edits", async () => {
    vi.mocked(loadDatastore).mockResolvedValue(snapshot(doc([location("L1", "Cafe")])));
    const first = deferred<SaveResult>();
    vi.mocked(saveDatastore)
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(snapshot(doc([]), { version: "v3" }));

    const { result } = renderHook(() => useVault());
    await act(async () => {
      await result.current.openVault("gist:abc");
    });

    act(() => {
      result.current.addLocation("One");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(saveDatastore).toHaveBeenCalledTimes(1);

    // Edit while the first save is still pending, then let its debounce fire.
    act(() => {
      result.current.addLocation("Two");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(saveDatastore).toHaveBeenCalledTimes(1);
    expect(result.current.dirty).toBe(true);

    await act(async () => {
      first.resolve(snapshot(doc([]), { version: "v2" }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveDatastore).toHaveBeenCalledTimes(2);
    const second = vi.mocked(saveDatastore).mock.calls[1][0];
    expect(second.expectedVersion).toBe("v2");
    expect(second.document.data.locations.map((l) => l.name)).toEqual(["Cafe", "One", "Two"]);
  });
});
