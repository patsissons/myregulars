import { describe, expect, it } from "vitest";

import {
  createEmptyDocument,
  parseDocument,
  parseDocumentString,
  serializeDocument,
} from "@/lib/datastore/schema";
import { DatastoreValidationError } from "@/lib/datastore/errors";

describe("schema", () => {
  it("serializes and parses a valid document", () => {
    const document = createEmptyDocument(new Date("2026-04-23T12:00:00.000Z"));
    const serialized = serializeDocument(document);

    expect(parseDocumentString(serialized)).toEqual(document);
  });

  it("accepts documents with only data.venues", () => {
    const document = parseDocument({
      app: "myregulars",
      schemaVersion: 1,
      updatedAt: "2026-04-23T12:00:00.000Z",
      data: {
        venues: [{ id: "venue-1", name: "Daily Grind" }],
      },
    });

    expect(document.data.venues).toHaveLength(1);
  });

  it("rejects documents that omit venues", () => {
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
          venues: [],
        },
      }),
    ).toThrow(DatastoreValidationError);
  });

  it("rejects invalid JSON strings", () => {
    expect(() => parseDocumentString("{not json}")).toThrow(DatastoreValidationError);
  });
});
