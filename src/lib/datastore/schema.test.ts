import { describe, expect, it } from "vitest";

import { DatastoreValidationError } from "@/lib/datastore/errors";
import {
  createEmptyDocument,
  locationSchema,
  parseDocument,
  parseDocumentString,
  personSchema,
  serializeDocument,
} from "@/lib/datastore/schema";

const validLocation = {
  id: "location-1",
  name: "Daily Grind",
  groups: [],
  createdAt: "2026-04-23T12:00:00.000Z",
  updatedAt: "2026-04-23T12:00:00.000Z",
};

const validPerson = {
  id: "person-1",
  name: "Alice",
  detail: "Always orders oat milk latte",
  createdAt: "2026-04-23T12:00:00.000Z",
  updatedAt: "2026-04-23T12:00:00.000Z",
};

describe("schema", () => {
  it("serializes and parses a valid document", () => {
    const document = createEmptyDocument(new Date("2026-04-23T12:00:00.000Z"));
    const serialized = serializeDocument(document);

    expect(parseDocumentString(serialized)).toEqual(document);
  });

  it("accepts documents with valid locations", () => {
    const document = parseDocument({
      app: "myregulars",
      schemaVersion: 2,
      id: "vault-1",
      updatedAt: "2026-04-23T12:00:00.000Z",
      data: {
        locations: [validLocation],
      },
    });

    expect(document.data.locations).toHaveLength(1);
  });

  it("rejects documents that omit locations", () => {
    expect(() =>
      parseDocument({
        app: "myregulars",
        schemaVersion: 2,
        id: "vault-1",
        updatedAt: "2026-04-23T12:00:00.000Z",
        data: {},
      }),
    ).toThrow(DatastoreValidationError);
  });

  it("rejects unsupported schema versions", () => {
    expect(() =>
      parseDocument({
        app: "myregulars",
        schemaVersion: 3,
        id: "vault-1",
        updatedAt: "2026-04-23T12:00:00.000Z",
        data: {
          locations: [],
        },
      }),
    ).toThrow(DatastoreValidationError);
  });

  it("rejects v2 documents without an id", () => {
    expect(() =>
      parseDocument({
        app: "myregulars",
        schemaVersion: 2,
        updatedAt: "2026-04-23T12:00:00.000Z",
        data: { locations: [] },
      }),
    ).toThrow(DatastoreValidationError);
  });

  describe("legacy (v1) documents", () => {
    const legacy = {
      app: "myregulars",
      schemaVersion: 1,
      updatedAt: "2026-04-23T12:00:00.000Z",
      data: { locations: [validLocation] },
    };

    it("are upgraded to v2 with an id derived from the source uri", () => {
      const document = parseDocument(legacy, { uri: "gist:abc123" });

      expect(document.schemaVersion).toBe(2);
      expect(document.id).toBe("gist-abc123");
      expect(document.data.locations).toHaveLength(1);
      expect(document.updatedAt).toBe(legacy.updatedAt);
    });

    it("derive a hosted id the same way", () => {
      expect(parseDocument(legacy, { uri: "hosted:rec1" }).id).toBe("hosted-rec1");
    });

    it("get a random id when the source is unknown (e.g. pasted JSON)", () => {
      const a = parseDocument(legacy);
      const b = parseDocument(legacy);
      expect(a.id).toBeTruthy();
      expect(a.id).not.toBe(b.id);
    });

    it("take a name from the gist file name when the document has none", () => {
      const document = parseDocument(legacy, {
        uri: "gist:abc",
        vaultFileName: "myregulars.morning-cafe.json",
      });
      expect(document.name).toBe("Morning Cafe");
    });

    it("keep their own name over the file name", () => {
      const document = parseDocument(
        { ...legacy, name: "Mine" },
        { uri: "gist:abc", vaultFileName: "myregulars.other.json" },
      );
      expect(document.name).toBe("Mine");
    });

    it("stay nameless for the legacy file name", () => {
      const document = parseDocument(legacy, { uri: "gist:abc", vaultFileName: "myregulars.json" });
      expect(document.name).toBeUndefined();
    });

    it("are serialized back out as v2", () => {
      const roundTrip = JSON.parse(serializeDocument(parseDocument(legacy, { uri: "gist:abc" })));
      expect(roundTrip.schemaVersion).toBe(2);
      expect(roundTrip.id).toBe("gist-abc");
    });
  });

  it("keeps replica links and sync metadata on v2 documents", () => {
    const document = parseDocument({
      app: "myregulars",
      schemaVersion: 2,
      id: "vault-1",
      updatedAt: "2026-04-23T12:00:00.000Z",
      replicas: { hosted: { id: "rec1" } },
      sync: { base: "abc", at: "2026-04-23T12:00:00.000Z" },
      data: { locations: [] },
    });

    expect(document.replicas).toEqual({ hosted: { id: "rec1" } });
    expect(document.sync).toEqual({ base: "abc", at: "2026-04-23T12:00:00.000Z" });
    expect(JSON.parse(serializeDocument(document)).replicas).toEqual({ hosted: { id: "rec1" } });
  });

  it("createEmptyDocument assigns a fresh id and optional name", () => {
    const a = createEmptyDocument(new Date("2026-04-23T12:00:00.000Z"), { name: "Home" });
    const b = createEmptyDocument();
    expect(a.schemaVersion).toBe(2);
    expect(a.name).toBe("Home");
    expect(a.id).not.toBe(b.id);
    expect(b.name).toBeUndefined();
  });

  it("rejects invalid JSON strings", () => {
    expect(() => parseDocumentString("{not json}")).toThrow(DatastoreValidationError);
  });

  describe("locationSchema", () => {
    it("parses a valid location", () => {
      const result = locationSchema.safeParse(validLocation);
      expect(result.success).toBe(true);
    });

    it("rejects location without id", () => {
      const result = locationSchema.safeParse({ ...validLocation, id: undefined });
      expect(result.success).toBe(false);
    });

    it("accepts location with optional description", () => {
      const result = locationSchema.safeParse({
        ...validLocation,
        description: "Tues/Thurs mornings",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("personSchema", () => {
    it("parses a valid person", () => {
      const result = personSchema.safeParse(validPerson);
      expect(result.success).toBe(true);
    });

    it("accepts person with optional fields", () => {
      const result = personSchema.safeParse({
        ...validPerson,
        photoUrl: "https://example.com/photo.jpg",
        lastSeen: "2026-04-23T12:00:00.000Z",
        visitLog: [{ date: "2026-04-23T12:00:00.000Z", note: "Was here" }],
        pets: [{ name: "Biscuit", species: "dog" }],
        relationships: [{ personId: "person-2", kind: "friend of" }],
      });
      expect(result.success).toBe(true);
    });

    it("rejects person without required fields", () => {
      const result = personSchema.safeParse({ id: "person-1" });
      expect(result.success).toBe(false);
    });
  });
});
