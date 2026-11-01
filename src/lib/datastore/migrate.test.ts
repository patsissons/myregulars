import { describe, expect, it } from "vitest";

import { legacyVaultId, upgradeDocument } from "@/lib/datastore/migrate";
import { createEmptyDocument } from "@/lib/datastore/schema";
import type { MyRegularsDocumentV1 } from "@/lib/datastore/types";

const v1: MyRegularsDocumentV1 = {
  app: "myregulars",
  schemaVersion: 1,
  updatedAt: "2026-04-23T12:00:00.000Z",
  data: { locations: [] },
};

describe("legacyVaultId", () => {
  it("is derived from the provider and record id", () => {
    expect(legacyVaultId("gist:abc123")).toBe("gist-abc123");
    expect(legacyVaultId("hosted:rec1")).toBe("hosted-rec1");
  });
});

describe("upgradeDocument", () => {
  it("returns v2 documents untouched", () => {
    const document = createEmptyDocument();
    expect(upgradeDocument(document)).toBe(document);
  });

  it("upgrades v1 with a stable id when the uri is known", () => {
    const first = upgradeDocument(v1, { uri: "gist:abc" });
    const second = upgradeDocument(v1, { uri: "gist:abc" });

    expect(first).toEqual({
      app: "myregulars",
      schemaVersion: 2,
      id: "gist-abc",
      updatedAt: v1.updatedAt,
      data: { locations: [] },
    });
    expect(second.id).toBe(first.id);
  });

  it("does not carry replica or sync metadata that v1 cannot have", () => {
    const upgraded = upgradeDocument(v1, { uri: "gist:abc" });
    expect("replicas" in upgraded).toBe(false);
    expect("sync" in upgraded).toBe(false);
  });

  it("fills the name from a named gist file", () => {
    expect(upgradeDocument(v1, { vaultFileName: "myregulars.my-vault.json" }).name).toBe(
      "My Vault",
    );
  });
});
