import { describe, expect, it } from "vitest";

import {
  buildShareUrl,
  normalizeDatastoreUri,
  resolveDatastoreConnection,
} from "@/lib/datastore/uri";

describe("datastore URI helpers", () => {
  it("accepts raw gist ids", () => {
    expect(normalizeDatastoreUri("abc123")).toBe("gist:abc123");
  });

  it("accepts canonical gist URIs", () => {
    expect(normalizeDatastoreUri("gist:abc123")).toBe("gist:abc123");
  });

  it("accepts app URLs with gist query params", () => {
    expect(normalizeDatastoreUri("https://myregulars.app/?gist=abc123")).toBe("gist:abc123");
  });

  it("builds a share URL from a base URL", () => {
    expect(buildShareUrl("abc123", "https://myregulars.app/dashboard")).toBe(
      "https://myregulars.app/?gist=abc123",
    );
  });

  it("resolves a full connection object", () => {
    expect(resolveDatastoreConnection("abc123", "https://myregulars.app")).toEqual({
      uri: "gist:abc123",
      gistId: "abc123",
      shareUrl: "https://myregulars.app/?gist=abc123",
    });
  });
});
