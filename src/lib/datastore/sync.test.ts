import { describe, expect, it } from "vitest";

import { contentHash } from "@/lib/datastore/content-hash";
import { createEmptyDocument } from "@/lib/datastore/schema";
import {
  adoptContent,
  computeSyncStatus,
  replicaStateOf,
  replicaUri,
  siblingProvider,
  siblingUriFromDocument,
  withReplicaLink,
  withSyncBase,
  withoutReplicaLink,
  type ReplicaState,
} from "@/lib/datastore/sync";

const gist = (hash: string, base?: string): ReplicaState => ({ provider: "gist", hash, base });
const hosted = (hash: string, base?: string): ReplicaState => ({ provider: "hosted", hash, base });

describe("computeSyncStatus", () => {
  it("reports in sync when the hashes match, whatever the bases say", () => {
    expect(computeSyncStatus(gist("A", "old"), hosted("A", "older"), "x")).toEqual({
      kind: "inSync",
      hash: "A",
    });
  });

  describe("fast-forward", () => {
    it("onto the side still sitting on the other side's base", () => {
      // gist moved from A to B; hosted still at A, which gist recorded as its base.
      expect(computeSyncStatus(gist("B", "A"), hosted("A", "A"))).toEqual({
        kind: "fastForward",
        from: "gist",
        to: "hosted",
        hash: "B",
      });
    });

    it("works symmetrically (primary behind)", () => {
      expect(computeSyncStatus(gist("A", "A"), hosted("B", "A"))).toEqual({
        kind: "fastForward",
        from: "hosted",
        to: "gist",
        hash: "B",
      });
    });

    it("uses the device's agreed hash when neither base helps", () => {
      // Fresh registry agreed = A; gist moved on, hosted base unknown.
      expect(computeSyncStatus(gist("B"), hosted("A"), "A")).toEqual({
        kind: "fastForward",
        from: "gist",
        to: "hosted",
        hash: "B",
      });
    });

    it("trusts a mirror target's own base equal to its hash (it was agreed when written)", () => {
      // hosted was last written as a mirror (base = its own hash = A); gist then moved to B.
      expect(computeSyncStatus(gist("B", "old"), hosted("A", "A"))).toEqual({
        kind: "fastForward",
        from: "gist",
        to: "hosted",
        hash: "B",
      });
    });
  });

  it("reports divergence when both sides moved off every known ancestor", () => {
    expect(computeSyncStatus(gist("B", "A"), hosted("C", "A"), "A")).toEqual({ kind: "diverged" });
  });

  it("reports divergence when nothing is known", () => {
    expect(computeSyncStatus(gist("B"), hosted("C"))).toEqual({ kind: "diverged" });
  });

  // The important safety property: a copy whose base equals the *other* copy's
  // current hash must not be mistaken for an ancestor of its own new content.
  it("never fast-forwards over a copy with new content just because the other side is on its base", () => {
    // gist edited to B (base A); hosted independently edited to C (base A).
    const status = computeSyncStatus(gist("B", "A"), hosted("C", "A"));
    expect(status.kind).toBe("diverged");
  });
});

describe("document helpers", () => {
  const base = createEmptyDocument(new Date("2026-04-23T12:00:00.000Z"), {
    id: "v1",
    name: "Home",
  });

  it("siblingProvider / replicaUri", () => {
    expect(siblingProvider("gist")).toBe("hosted");
    expect(siblingProvider("hosted")).toBe("gist");
    expect(replicaUri("gist", "abc")).toBe("gist:abc");
    expect(replicaUri("hosted", "rec")).toBe("hosted:rec");
  });

  it("withReplicaLink adds and withoutReplicaLink removes links", () => {
    const linked = withReplicaLink(base, "hosted", "rec1");
    expect(linked.replicas).toEqual({ hosted: { id: "rec1" } });
    expect(siblingUriFromDocument(linked, "gist:abc")).toBe("hosted:rec1");
    expect(siblingUriFromDocument(linked, "hosted:rec1")).toBeNull();

    const synced = withSyncBase(linked, "h1", new Date("2026-04-23T12:00:00.000Z"));
    expect(synced.sync).toEqual({ base: "h1", at: "2026-04-23T12:00:00.000Z" });

    const unlinked = withoutReplicaLink(synced, "hosted");
    expect(unlinked.replicas).toBeUndefined();
    // No copies left means no sync bookkeeping either.
    expect(unlinked.sync).toBeUndefined();
  });

  it("withoutReplicaLink is a no-op for an unlinked provider", () => {
    expect(withoutReplicaLink(base, "gist")).toBe(base);
  });

  it("replicaStateOf reads the hash and base", () => {
    const synced = withSyncBase(base, "h1");
    expect(replicaStateOf("gist", synced)).toEqual({
      provider: "gist",
      hash: contentHash(synced),
      base: "h1",
    });
  });

  it("adoptContent copies name and data but keeps the target's identity", () => {
    const target = { ...createEmptyDocument(new Date(), { id: "t", name: "Old" }) };
    const source = withReplicaLink({ ...base, name: "New", data: { locations: [] } }, "gist", "x");
    const adopted = adoptContent(target, source);
    expect(adopted.id).toBe("t");
    expect(adopted.name).toBe("New");
    expect(adopted.replicas).toBeUndefined();
    expect(contentHash(adopted)).toBe(contentHash(source));
  });

  it("adoptContent clears the name when the source has none", () => {
    const target = createEmptyDocument(new Date(), { id: "t", name: "Old" });
    expect(adoptContent(target, createEmptyDocument()).name).toBeUndefined();
  });
});
