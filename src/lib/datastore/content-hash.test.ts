import { describe, expect, it } from "vitest";

import { canonicalize, contentHash, hashString } from "@/lib/datastore/content-hash";
import { createEmptyDocument } from "@/lib/datastore/schema";
import type { MyRegularsDocument } from "@/lib/datastore/types";

function doc(extra: Partial<MyRegularsDocument> = {}): MyRegularsDocument {
  return {
    ...createEmptyDocument(new Date("2026-04-23T12:00:00.000Z"), { id: "v1", name: "Home" }),
    ...extra,
  };
}

describe("canonicalize", () => {
  it("sorts object keys recursively", () => {
    expect(canonicalize({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it("drops undefined members but keeps nulls and empty values", () => {
    expect(canonicalize({ a: undefined, b: null, c: "", d: [] })).toBe('{"b":null,"c":"","d":[]}');
  });

  it("preserves array order", () => {
    expect(canonicalize([3, 1, 2])).toBe("[3,1,2]");
  });
});

describe("hashString", () => {
  it("is deterministic and 16 hex characters", () => {
    expect(hashString("hello")).toMatch(/^[0-9a-f]{16}$/);
    expect(hashString("hello")).toBe(hashString("hello"));
  });

  it("differs for different input", () => {
    expect(hashString("hello")).not.toBe(hashString("hellp"));
  });
});

describe("contentHash", () => {
  it("is stable across key order and ignores metadata", () => {
    const a = doc({ updatedAt: "2026-01-01T00:00:00.000Z" });
    const b = doc({
      id: "other-id",
      updatedAt: "2027-01-01T00:00:00.000Z",
      replicas: { hosted: { id: "rec" } },
      sync: { base: "x", at: "2027-01-01T00:00:00.000Z" },
    });

    expect(contentHash(a)).toBe(contentHash(b));
  });

  it("changes when the name changes", () => {
    expect(contentHash(doc({ name: "Home" }))).not.toBe(contentHash(doc({ name: "Work" })));
  });

  it("treats a missing name and an empty name alike", () => {
    expect(contentHash(doc({ name: undefined }))).toBe(contentHash(doc({ name: "" })));
  });

  it("changes when the data changes", () => {
    const changed = doc({
      data: {
        locations: [
          {
            id: "L1",
            name: "Cafe",
            groups: [],
            createdAt: "2026-04-23T12:00:00.000Z",
            updatedAt: "2026-04-23T12:00:00.000Z",
          },
        ],
      },
    });
    expect(contentHash(doc())).not.toBe(contentHash(changed));
  });
});
