import { beforeEach, describe, expect, it } from "vitest";

import {
  findRegistryEntryByUri,
  getRegistry,
  getRegistryEntry,
  linkReplica,
  migrateLegacyKnownVaults,
  removeRegistryEntry,
  siblingUriOf,
  unlinkReplica,
  updateRegistryEntry,
  upsertRegistryEntry,
  type VaultRegistryEntry,
} from "@/lib/datastore/registry";

const entry: VaultRegistryEntry = {
  id: "v1",
  name: "Home",
  replicas: { gist: { uri: "gist:abc" } },
  primary: "gist",
  lastOpened: "2026-04-25T10:00:00.000Z",
  peopleCount: 3,
  locationCount: 1,
};

beforeEach(() => {
  localStorage.clear();
});

describe("registry storage", () => {
  it("starts empty", () => {
    expect(getRegistry()).toEqual([]);
  });

  it("upserts by id and moves the entry to the front", () => {
    upsertRegistryEntry(entry);
    upsertRegistryEntry({ ...entry, id: "v2", name: "Work" });
    upsertRegistryEntry({ ...entry, name: "Home!" });

    expect(getRegistry().map((e) => [e.id, e.name])).toEqual([
      ["v1", "Home!"],
      ["v2", "Work"],
    ]);
  });

  it("finds entries by any replica uri", () => {
    upsertRegistryEntry({
      ...entry,
      replicas: { gist: { uri: "gist:abc" }, hosted: { uri: "hosted:rec" } },
    });
    expect(findRegistryEntryByUri("hosted:rec")?.id).toBe("v1");
    expect(findRegistryEntryByUri("gist:abc")?.id).toBe("v1");
    expect(findRegistryEntryByUri("gist:nope")).toBeNull();
  });

  it("updates and removes", () => {
    upsertRegistryEntry(entry);
    expect(updateRegistryEntry("v1", { agreed: "h" })?.agreed).toBe("h");
    expect(getRegistryEntry("v1")?.agreed).toBe("h");
    expect(updateRegistryEntry("missing", { agreed: "h" })).toBeNull();

    removeRegistryEntry("v1");
    expect(getRegistry()).toEqual([]);
  });
});

describe("replica linking", () => {
  const defaults = { name: "Home", lastOpened: "x", peopleCount: 0, locationCount: 0 };

  it("linkReplica creates an entry on first sight and merges later", () => {
    linkReplica("v1", "gist:abc", defaults);
    linkReplica("v1", "hosted:rec", defaults);

    const stored = getRegistryEntry("v1")!;
    expect(stored.replicas).toEqual({ gist: { uri: "gist:abc" }, hosted: { uri: "hosted:rec" } });
    expect(stored.primary).toBe("gist");
    expect(siblingUriOf(stored, "gist:abc")).toBe("hosted:rec");
    expect(siblingUriOf(stored, "hosted:rec")).toBe("gist:abc");
  });

  it("unlinkReplica keeps the entry while another copy remains and re-points primary", () => {
    linkReplica("v1", "gist:abc", defaults);
    linkReplica("v1", "hosted:rec", defaults);
    updateRegistryEntry("v1", { agreed: "h", pendingMirror: "hosted" });

    const remaining = unlinkReplica("v1", "gist");
    expect(remaining?.replicas).toEqual({ hosted: { uri: "hosted:rec" } });
    expect(remaining?.primary).toBe("hosted");
    expect(remaining?.agreed).toBeUndefined();
    expect(remaining?.pendingMirror).toBeUndefined();
  });

  it("unlinkReplica removes the entry with its last copy", () => {
    linkReplica("v1", "gist:abc", defaults);
    expect(unlinkReplica("v1", "gist")).toBeNull();
    expect(getRegistryEntry("v1")).toBeNull();
  });
});

describe("legacy migration", () => {
  it("builds one entry per legacy uri with a legacy id", () => {
    const migrated = migrateLegacyKnownVaults([
      {
        uri: "gist:abc",
        provider: "gist",
        name: "A",
        lastOpened: "x",
        peopleCount: 1,
        locationCount: 1,
      },
      { uri: "hosted:rec", name: "B", lastOpened: "y", peopleCount: 2, locationCount: 2 },
      { uri: "gist:abc", name: "dupe", lastOpened: "z", peopleCount: 0, locationCount: 0 },
    ]);

    expect(migrated).toEqual([
      {
        id: "gist-abc",
        name: "A",
        replicas: { gist: { uri: "gist:abc" } },
        primary: "gist",
        lastOpened: "x",
        peopleCount: 1,
        locationCount: 1,
      },
      {
        id: "hosted-rec",
        name: "B",
        replicas: { hosted: { uri: "hosted:rec" } },
        primary: "hosted",
        lastOpened: "y",
        peopleCount: 2,
        locationCount: 2,
      },
    ]);
  });

  it("seeds the registry from the legacy key on first read and leaves the legacy key alone", () => {
    localStorage.setItem(
      "myregulars:known-vaults",
      JSON.stringify([
        { uri: "gist:abc", name: "A", lastOpened: "x", peopleCount: 1, locationCount: 1 },
      ]),
    );

    expect(getRegistry().map((e) => e.id)).toEqual(["gist-abc"]);
    expect(localStorage.getItem("myregulars:known-vaults@2")).toContain("gist-abc");
    expect(localStorage.getItem("myregulars:known-vaults")).toContain("gist:abc");
  });

  it("does not re-migrate once the registry exists", () => {
    localStorage.setItem("myregulars:known-vaults@2", "[]");
    localStorage.setItem(
      "myregulars:known-vaults",
      JSON.stringify([
        { uri: "gist:abc", name: "A", lastOpened: "x", peopleCount: 1, locationCount: 1 },
      ]),
    );
    expect(getRegistry()).toEqual([]);
  });
});
