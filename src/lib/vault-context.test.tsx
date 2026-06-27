import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";

import {
  VaultProvider,
  useVault,
  getAllPeople,
  findPerson,
  getPeopleCount,
} from "@/lib/vault-context";
import { createDatastore, loadDatastore, loadDatastoreVersion, saveDatastore } from "@/lib/db";
import { getGitHubAuthToken } from "@/lib/datastore/auth";
import { getAuthenticatedUser } from "@/lib/github-user";
import type {
  DatastoreSnapshot,
  Group,
  Location,
  MyRegularsDocument,
  Person,
} from "@/lib/datastore/types";
import type { Vault } from "@/lib/vault-types";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/db", () => ({
  createDatastore: vi.fn(),
  loadDatastore: vi.fn(),
  loadDatastoreVersion: vi.fn(),
  saveDatastore: vi.fn(),
}));

vi.mock("@/lib/datastore/auth", () => ({
  getGitHubAuthToken: vi.fn(() => "test-token"),
}));

vi.mock("@/lib/github-user", () => ({
  getAuthenticatedUser: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

const NOW = "2026-06-27T10:00:00.000Z";
const TODAY = "2026-06-27T00:00:00.000Z";

function makePerson(id: string, name: string, extra: Partial<Person> = {}): Person {
  return {
    id,
    name,
    detail: `${name} detail`,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...extra,
  };
}

function makeGroup(id: string, name: string, people: Person[] = []): Group {
  return {
    id,
    name,
    people,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function makeLocation(id: string, name: string, groups: Group[] = []): Location {
  return {
    id,
    name,
    groups,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function makeDocument(locations: Location[], name?: string): MyRegularsDocument {
  return {
    app: "myregulars",
    schemaVersion: 1,
    name,
    updatedAt: "2026-01-01T00:00:00.000Z",
    data: { locations },
  };
}

function makeSnapshot(
  document: MyRegularsDocument,
  overrides: Partial<DatastoreSnapshot> = {},
): DatastoreSnapshot {
  return {
    document,
    version: "v1",
    uri: "gist:abc",
    source: "remote",
    vaultFileName: "myregulars.test.json",
    ...overrides,
  };
}

// A fully populated document used by most provider tests.
//   Cafe (L1)
//     staff (G1):    Alice (P1)
//     regulars (G2): Bob (P2)
//   Bar (L2)
//     patio (G3):    <empty>
function fixtureDocument(): MyRegularsDocument {
  return makeDocument(
    [
      makeLocation("L1", "Cafe", [
        makeGroup("G1", "staff", [makePerson("P1", "Alice")]),
        makeGroup("G2", "regulars", [makePerson("P2", "Bob")]),
      ]),
      makeLocation("L2", "Bar", [makeGroup("G3", "patio", [])]),
    ],
    "My Vault",
  );
}

function stubOwnerFetch(login: string): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ owner: { login } }),
    } as Response),
  );
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <VaultProvider>{children}</VaultProvider>
);

function renderVault() {
  return renderHook(() => useVault(), { wrapper });
}

type VaultHook = ReturnType<typeof renderVault>["result"];

// Render the provider and load the fixture vault. Owner matches the
// authenticated user, so the resulting vault is writable.
async function renderLoaded(document: MyRegularsDocument = fixtureDocument()): Promise<VaultHook> {
  vi.mocked(getAuthenticatedUser).mockResolvedValue({
    login: "owner",
    id: 1,
    avatar_url: "",
  });
  stubOwnerFetch("owner");
  vi.mocked(loadDatastore).mockResolvedValue(makeSnapshot(document));

  const { result } = renderVault();
  await act(async () => {
    await result.current.loadVault("abc");
  });
  return result;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
  // default token unless a test overrides it
  vi.mocked(getGitHubAuthToken).mockReturnValue("test-token");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

describe("getPeopleCount", () => {
  it("returns 0 for null", () => {
    expect(getPeopleCount(null)).toBe(0);
  });

  it("returns 0 for an empty vault", () => {
    expect(getPeopleCount({ name: "x", locations: [] })).toBe(0);
  });

  it("counts people across locations and groups", () => {
    const vault: Vault = { name: "x", locations: fixtureDocument().data.locations };
    expect(getPeopleCount(vault)).toBe(2);
  });
});

describe("getAllPeople", () => {
  it("returns [] for null", () => {
    expect(getAllPeople(null)).toEqual([]);
  });

  it("returns [] for a vault with no people", () => {
    const vault: Vault = { name: "x", locations: [makeLocation("L", "Loc")] };
    expect(getAllPeople(vault)).toEqual([]);
  });

  it("returns PersonWithContext entries in location/group/person order", () => {
    const vault: Vault = { name: "x", locations: fixtureDocument().data.locations };
    const result = getAllPeople(vault);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.person.id)).toEqual(["P1", "P2"]);

    const [first] = result;
    expect(first.person.name).toBe("Alice");
    expect(first.group.id).toBe("G1");
    expect(first.location.id).toBe("L1");
    // shape is exactly { person, group, location }
    expect(Object.keys(first).sort()).toEqual(["group", "location", "person"]);
  });

  it("flattens multiple people within a single group preserving order", () => {
    const vault: Vault = {
      name: "x",
      locations: [
        makeLocation("L", "Loc", [
          makeGroup("G", "g", [makePerson("a", "A"), makePerson("b", "B"), makePerson("c", "C")]),
        ]),
      ],
    };
    expect(getAllPeople(vault).map((r) => r.person.id)).toEqual(["a", "b", "c"]);
  });
});

describe("findPerson", () => {
  const vault: Vault = { name: "x", locations: fixtureDocument().data.locations };

  it("returns null for null vault", () => {
    expect(findPerson(null, "L1", "P1")).toBeNull();
  });

  it("finds a person by location and person id with full context", () => {
    const found = findPerson(vault, "L1", "P2");
    expect(found).not.toBeNull();
    expect(found?.person.name).toBe("Bob");
    expect(found?.group.id).toBe("G2");
    expect(found?.location.id).toBe("L1");
  });

  it("returns null when the location id does not match", () => {
    // P1 exists, but under L1 — searching L2 must not find it
    expect(findPerson(vault, "L2", "P1")).toBeNull();
  });

  it("returns null when the person id does not exist", () => {
    expect(findPerson(vault, "L1", "missing")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Hook guard
// ---------------------------------------------------------------------------

describe("useVault", () => {
  it("throws when used outside of a provider", () => {
    expect(() => renderHook(() => useVault())).toThrow(
      "useVault must be used inside VaultProvider",
    );
  });
});

// ---------------------------------------------------------------------------
// loadVault / read-only resolution
// ---------------------------------------------------------------------------

describe("loadVault", () => {
  it("loads a vault, prefers the document name, and is writable when the owner matches", async () => {
    const result = await renderLoaded();

    expect(result.current.vault?.name).toBe("My Vault");
    expect(result.current.vault?.locations).toHaveLength(2);
    expect(result.current.uri).toBe("gist:abc");
    expect(result.current.version).toBe("v1");
    expect(result.current.ownerHandle).toBe("owner");
    expect(result.current.isReadOnly).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("marks the vault read-only when the gist owner is a different user", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      login: "owner",
      id: 1,
      avatar_url: "",
    });
    stubOwnerFetch("someone-else");
    vi.mocked(loadDatastore).mockResolvedValue(makeSnapshot(fixtureDocument()));

    const { result } = renderVault();
    await act(async () => {
      await result.current.loadVault("abc");
    });

    expect(result.current.ownerHandle).toBe("someone-else");
    expect(result.current.isReadOnly).toBe(true);
  });

  it("stays read-only when there is no authenticated user", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    vi.stubGlobal("fetch", vi.fn());
    vi.mocked(loadDatastore).mockResolvedValue(makeSnapshot(fixtureDocument()));

    const { result } = renderVault();
    await act(async () => {
      await result.current.loadVault("abc");
    });

    expect(result.current.isReadOnly).toBe(true);
    expect(result.current.ownerHandle).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falls back to the document name then the file name", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    vi.stubGlobal("fetch", vi.fn());
    // No name on the document -> derived from vaultFileName "myregulars.test.json" -> "Test"
    vi.mocked(loadDatastore).mockResolvedValue(makeSnapshot(makeDocument([])));

    const { result } = renderVault();
    await act(async () => {
      await result.current.loadVault("abc");
    });

    expect(result.current.vault?.name).toBe("Test");
  });

  it("records the vault in known-vaults on load", async () => {
    await renderLoaded();
    const raw = localStorage.getItem("myregulars:known-vaults");
    expect(raw).toBeTruthy();
    const known = JSON.parse(raw ?? "[]") as Array<{ uri: string; peopleCount: number }>;
    expect(known[0].uri).toBe("gist:abc");
    expect(known[0].peopleCount).toBe(2);
  });

  it("sets an error message when loading fails", async () => {
    vi.mocked(loadDatastore).mockRejectedValue(new Error("boom"));

    const { result } = renderVault();
    await act(async () => {
      await result.current.loadVault("abc");
    });

    expect(result.current.vault).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe("boom");
  });
});

// ---------------------------------------------------------------------------
// createVault / importVault
// ---------------------------------------------------------------------------

describe("createVault", () => {
  it("creates an empty writable vault and returns its uri", async () => {
    vi.mocked(createDatastore).mockResolvedValue(
      makeSnapshot(makeDocument([]), { uri: "gist:new", version: "c1" }),
    );

    const { result } = renderVault();
    let uri = "";
    await act(async () => {
      uri = await result.current.createVault("Fresh");
    });

    expect(uri).toBe("gist:new");
    expect(result.current.vault).toEqual({ name: "Fresh", locations: [] });
    expect(result.current.uri).toBe("gist:new");
    expect(result.current.version).toBe("c1");
    expect(result.current.isReadOnly).toBe(false);
  });
});

describe("importVault", () => {
  it("seeds a new vault from an existing document", async () => {
    const seeded = fixtureDocument();
    vi.mocked(createDatastore).mockResolvedValue(
      makeSnapshot(seeded, { uri: "gist:imp", version: "i1" }),
    );

    const { result } = renderVault();
    let uri = "";
    await act(async () => {
      uri = await result.current.importVault("Imported", seeded);
    });

    expect(uri).toBe("gist:imp");
    expect(result.current.vault?.name).toBe("Imported");
    expect(result.current.vault?.locations).toHaveLength(2);

    // createDatastore was called with a renamed seed document
    const [, seedArg] = vi.mocked(createDatastore).mock.calls[0];
    expect(seedArg?.name).toBe("Imported");
  });
});

// ---------------------------------------------------------------------------
// Location mutations
// ---------------------------------------------------------------------------

describe("location mutations", () => {
  it("addLocation appends a new location", async () => {
    const result = await renderLoaded();
    act(() => {
      result.current.addLocation("Diner", "open late");
    });

    const locations = result.current.vault?.locations ?? [];
    expect(locations).toHaveLength(3);
    const added = locations[2];
    expect(added.name).toBe("Diner");
    expect(added.description).toBe("open late");
    expect(added.groups).toEqual([]);
  });

  it("updateLocation merges updates and bumps updatedAt", async () => {
    const result = await renderLoaded();
    act(() => {
      result.current.updateLocation("L1", { name: "Cafe Renamed", description: "cozy" });
    });

    const loc = result.current.vault?.locations.find((l) => l.id === "L1");
    expect(loc?.name).toBe("Cafe Renamed");
    expect(loc?.description).toBe("cozy");
    expect(loc?.updatedAt).toBe(NOW);
  });

  it("deleteLocation removes the location", async () => {
    const result = await renderLoaded();
    act(() => {
      result.current.deleteLocation("L2");
    });

    const ids = result.current.vault?.locations.map((l) => l.id);
    expect(ids).toEqual(["L1"]);
  });
});

// ---------------------------------------------------------------------------
// Group mutations
// ---------------------------------------------------------------------------

describe("group mutations", () => {
  it("addGroup creates a new group and returns its id", async () => {
    const result = await renderLoaded();
    let newId = "";
    act(() => {
      newId = result.current.addGroup("L1", "VIPs");
    });

    const loc = result.current.vault?.locations.find((l) => l.id === "L1");
    expect(loc?.groups).toHaveLength(3);
    expect(loc?.groups.find((g) => g.id === newId)?.name).toBe("VIPs");
  });

  it("addGroup deduplicates by case-insensitive name and does not add a new group", async () => {
    const result = await renderLoaded();
    let returnedId = "";
    act(() => {
      returnedId = result.current.addGroup("L1", "  STAFF  ");
    });

    const loc = result.current.vault?.locations.find((l) => l.id === "L1");
    expect(loc?.groups).toHaveLength(2); // unchanged
    expect(returnedId).toBe("G1");
  });

  it("deleteGroup removes the group", async () => {
    const result = await renderLoaded();
    act(() => {
      result.current.deleteGroup("L1", "G2");
    });

    const loc = result.current.vault?.locations.find((l) => l.id === "L1");
    expect(loc?.groups.map((g) => g.id)).toEqual(["G1"]);
  });
});

// ---------------------------------------------------------------------------
// Person mutations
// ---------------------------------------------------------------------------

describe("person mutations", () => {
  it("addPerson appends a person to a group", async () => {
    const result = await renderLoaded();
    act(() => {
      result.current.addPerson("L2", "G3", { name: "Carol", detail: "barfly" });
    });

    const group = result.current.vault?.locations
      .find((l) => l.id === "L2")
      ?.groups.find((g) => g.id === "G3");
    expect(group?.people).toHaveLength(1);
    expect(group?.people[0].name).toBe("Carol");
    expect(group?.people[0].detail).toBe("barfly");
    expect(group?.people[0].id).toBeTruthy();
  });

  it("updatePerson merges updates and bumps updatedAt", async () => {
    const result = await renderLoaded();
    act(() => {
      result.current.updatePerson("L1", "G1", "P1", { detail: "head barista" });
    });

    const person = findPerson(result.current.vault, "L1", "P1")?.person;
    expect(person?.detail).toBe("head barista");
    expect(person?.name).toBe("Alice");
    expect(person?.updatedAt).toBe(NOW);
  });

  it("deletePerson removes the person from the group", async () => {
    const result = await renderLoaded();
    act(() => {
      result.current.deletePerson("L1", "G1", "P1");
    });

    const group = result.current.vault?.locations
      .find((l) => l.id === "L1")
      ?.groups.find((g) => g.id === "G1");
    expect(group?.people).toEqual([]);
  });

  it("movePerson moves a person between groups in the same location", async () => {
    const result = await renderLoaded();
    act(() => {
      result.current.movePerson("L1", "G1", "G2", "P1");
    });

    const loc = result.current.vault?.locations.find((l) => l.id === "L1");
    const from = loc?.groups.find((g) => g.id === "G1");
    const to = loc?.groups.find((g) => g.id === "G2");

    expect(from?.people).toEqual([]);
    expect(to?.people.map((p) => p.id)).toEqual(["P2", "P1"]);
  });

  it("movePerson is a no-op when the person is not in the source group", async () => {
    const result = await renderLoaded();
    act(() => {
      result.current.movePerson("L1", "G1", "G2", "missing");
    });

    const loc = result.current.vault?.locations.find((l) => l.id === "L1");
    expect(loc?.groups.find((g) => g.id === "G1")?.people.map((p) => p.id)).toEqual(["P1"]);
    expect(loc?.groups.find((g) => g.id === "G2")?.people.map((p) => p.id)).toEqual(["P2"]);
  });
});

// ---------------------------------------------------------------------------
// logVisit
// ---------------------------------------------------------------------------

describe("logVisit", () => {
  it("sets lastSeen and prepends a visit log entry", async () => {
    const result = await renderLoaded();
    act(() => {
      result.current.logVisit("L1", "G1", "P1", "had a coffee");
    });

    const person = findPerson(result.current.vault, "L1", "P1")?.person;
    expect(person?.lastSeen).toBe(TODAY);
    expect(person?.visitLog).toEqual([{ date: TODAY, note: "had a coffee" }]);
    expect(person?.updatedAt).toBe(NOW);
  });

  it("prepends to an existing visit log without a note", async () => {
    const doc = makeDocument([
      makeLocation("L1", "Cafe", [
        makeGroup("G1", "staff", [
          makePerson("P1", "Alice", {
            visitLog: [{ date: "2026-06-20T00:00:00.000Z", note: "old" }],
          }),
        ]),
      ]),
    ]);
    const result = await renderLoaded(doc);
    act(() => {
      result.current.logVisit("L1", "G1", "P1");
    });

    const person = findPerson(result.current.vault, "L1", "P1")?.person;
    expect(person?.visitLog).toEqual([
      { date: TODAY },
      { date: "2026-06-20T00:00:00.000Z", note: "old" },
    ]);
  });
});

// ---------------------------------------------------------------------------
// updateVaultName
// ---------------------------------------------------------------------------

describe("updateVaultName", () => {
  it("renames the vault and updates known-vaults metadata", async () => {
    const result = await renderLoaded();
    act(() => {
      result.current.updateVaultName("Renamed Vault");
    });

    expect(result.current.vault?.name).toBe("Renamed Vault");
    const known = JSON.parse(localStorage.getItem("myregulars:known-vaults") ?? "[]") as Array<{
      name: string;
    }>;
    expect(known[0].name).toBe("Renamed Vault");
  });
});

// ---------------------------------------------------------------------------
// Debounced sync
// ---------------------------------------------------------------------------

describe("debounced sync", () => {
  it("schedules a save after a mutation and persists via saveDatastore", async () => {
    const result = await renderLoaded();
    vi.mocked(saveDatastore).mockResolvedValue(makeSnapshot(fixtureDocument(), { version: "v2" }));

    act(() => {
      result.current.addLocation("Diner");
    });

    // not saved until the debounce elapses
    expect(saveDatastore).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(saveDatastore).toHaveBeenCalledTimes(1);
    const [arg] = vi.mocked(saveDatastore).mock.calls[0];
    expect(arg.uri).toBe("gist:abc");
    expect(arg.expectedVersion).toBe("v1");
    expect(arg.authToken).toBe("test-token");
    expect(result.current.isSyncing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("debounces rapid mutations into a single save", async () => {
    const result = await renderLoaded();
    vi.mocked(saveDatastore).mockResolvedValue(makeSnapshot(fixtureDocument(), { version: "v2" }));

    act(() => {
      result.current.addLocation("One");
    });
    act(() => {
      vi.advanceTimersByTime(500);
      result.current.addLocation("Two");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(saveDatastore).toHaveBeenCalledTimes(1);
    expect(result.current.vault?.locations).toHaveLength(4);
  });

  it("surfaces an error when the save fails", async () => {
    const result = await renderLoaded();
    vi.mocked(saveDatastore).mockRejectedValue(new Error("network down"));

    act(() => {
      result.current.addLocation("Diner");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(result.current.isSyncing).toBe(false);
    expect(result.current.error).toBe("Failed to save changes.");
  });

  it("does not save when there is no auth token", async () => {
    const result = await renderLoaded();
    vi.mocked(getGitHubAuthToken).mockReturnValue(null);

    act(() => {
      result.current.addLocation("Diner");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(saveDatastore).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Versioning: loadVaultVersion / revertToVersion / cloneVault
// ---------------------------------------------------------------------------

describe("loadVaultVersion", () => {
  it("loads a historical version read-only and tracks the latest version", async () => {
    vi.mocked(loadDatastore).mockResolvedValue(
      makeSnapshot(fixtureDocument(), { version: "latest" }),
    );
    vi.mocked(loadDatastoreVersion).mockResolvedValue(
      makeSnapshot(makeDocument([makeLocation("OLD", "Old Cafe")], "Old Name"), {
        version: "old-sha",
      }),
    );

    const { result } = renderVault();
    await act(async () => {
      await result.current.loadVaultVersion("abc", "old-sha");
    });

    expect(result.current.vault?.name).toBe("Old Name");
    expect(result.current.vault?.locations.map((l) => l.id)).toEqual(["OLD"]);
    expect(result.current.isReadOnly).toBe(true);
    expect(result.current.isHistoricalVersion).toBe(true);
    expect(result.current.historicalVersionId).toBe("old-sha");
    expect(result.current.version).toBe("latest");
    expect(result.current.latestVersion).toBe("latest");
  });

  it("sets an error message when version loading fails", async () => {
    vi.mocked(loadDatastore).mockRejectedValue(new Error("no version"));

    const { result } = renderVault();
    await act(async () => {
      await result.current.loadVaultVersion("abc", "old-sha");
    });

    expect(result.current.error).toBe("no version");
    expect(result.current.isHistoricalVersion).toBe(false);
  });
});

describe("revertToVersion", () => {
  it("saves the current vault as the latest and clears historical state", async () => {
    // First load a historical version so the provider has vault/uri/version set
    vi.mocked(loadDatastore).mockResolvedValue(
      makeSnapshot(fixtureDocument(), { version: "latest" }),
    );
    vi.mocked(loadDatastoreVersion).mockResolvedValue(
      makeSnapshot(makeDocument([makeLocation("OLD", "Old Cafe")]), { version: "old-sha" }),
    );
    vi.mocked(saveDatastore).mockResolvedValue(
      makeSnapshot(fixtureDocument(), { version: "reverted" }),
    );

    const { result } = renderVault();
    await act(async () => {
      await result.current.loadVaultVersion("abc", "old-sha");
    });
    await act(async () => {
      await result.current.revertToVersion();
    });

    expect(saveDatastore).toHaveBeenCalledTimes(1);
    const [arg] = vi.mocked(saveDatastore).mock.calls[0];
    expect(arg.expectedVersion).toBe("latest");
    expect(result.current.version).toBe("reverted");
    expect(result.current.isReadOnly).toBe(false);
    expect(result.current.isHistoricalVersion).toBe(false);
    expect(result.current.historicalVersionId).toBeNull();
  });
});

describe("cloneVault", () => {
  it("clones the current vault into a new gist and switches to it", async () => {
    const result = await renderLoaded();
    vi.mocked(createDatastore).mockResolvedValue(
      makeSnapshot(makeDocument([]), { uri: "gist:clone", version: "clone-1" }),
    );
    vi.mocked(saveDatastore).mockResolvedValue(
      makeSnapshot(fixtureDocument(), { uri: "gist:clone", version: "clone-2" }),
    );

    let uri = "";
    await act(async () => {
      uri = await result.current.cloneVault("Copy");
    });

    expect(uri).toBe("gist:clone");
    expect(result.current.vault?.name).toBe("Copy");
    expect(result.current.vault?.locations).toHaveLength(2);
    expect(result.current.uri).toBe("gist:clone");
    expect(result.current.version).toBe("clone-2");
    expect(result.current.isReadOnly).toBe(false);
  });

  it("throws when there is no loaded vault to clone", async () => {
    const { result } = renderVault();
    await expect(
      act(async () => {
        await result.current.cloneVault("Copy");
      }),
    ).rejects.toThrow("No vault loaded to clone.");
  });
});
