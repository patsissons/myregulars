import { describe, expect, it } from "vitest";

import {
  buildShareUrl,
  buildVaultShareUrl,
  getProviderFromUri,
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

  it("accepts canonical hosted URIs", () => {
    expect(normalizeDatastoreUri("hosted:rec123")).toBe("hosted:rec123");
  });

  it("accepts app URLs with a vault query param carrying a hosted uri", () => {
    expect(normalizeDatastoreUri("https://myregulars.app/?vault=hosted:rec123")).toBe(
      "hosted:rec123",
    );
  });

  it("derives the provider from a uri", () => {
    expect(getProviderFromUri("gist:abc123")).toBe("gist");
    expect(getProviderFromUri("hosted:rec123")).toBe("hosted");
  });

  it("builds a share URL from a base URL", () => {
    expect(buildShareUrl("abc123", "https://myregulars.app/dashboard")).toBe(
      "https://myregulars.app/?gist=abc123",
    );
  });

  it("builds a hosted share URL with a vault query param", () => {
    expect(buildVaultShareUrl("hosted:rec123", "https://myregulars.app")).toBe(
      "https://myregulars.app/?vault=hosted%3Arec123",
    );
  });

  it("resolves a full gist connection object", () => {
    expect(resolveDatastoreConnection("abc123", "https://myregulars.app")).toEqual({
      uri: "gist:abc123",
      provider: "gist",
      id: "abc123",
      gistId: "abc123",
      shareUrl: "https://myregulars.app/?gist=abc123",
    });
  });

  it("resolves a full hosted connection object", () => {
    expect(resolveDatastoreConnection("hosted:rec123", "https://myregulars.app")).toEqual({
      uri: "hosted:rec123",
      provider: "hosted",
      id: "rec123",
      shareUrl: "https://myregulars.app/?vault=hosted%3Arec123",
    });
  });
});
