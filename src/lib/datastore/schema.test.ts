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
      schemaVersion: 1,
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
        schemaVersion: 1,
        updatedAt: "2026-04-23T12:00:00.000Z",
        data: {},
      }),
    ).toThrow(DatastoreValidationError);
  });

  it("rejects unsupported schema versions", () => {
    expect(() =>
      parseDocument({
        app: "myregulars",
        schemaVersion: 2,
        updatedAt: "2026-04-23T12:00:00.000Z",
        data: {
          locations: [],
        },
      }),
    ).toThrow(DatastoreValidationError);
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
