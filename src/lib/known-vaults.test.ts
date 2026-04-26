import { beforeEach, describe, expect, it } from "vitest";
import { addKnownVault, getKnownVaults, removeKnownVault, updateKnownVault } from "./known-vaults";
import type { KnownVault } from "./vault-types";

const vault1: KnownVault = {
  uri: "gist:abc123",
  name: "My Vault",
  lastOpened: "2026-04-25T10:00:00.000Z",
  peopleCount: 5,
  locationCount: 2,
};

const vault2: KnownVault = {
  uri: "gist:def456",
  name: "Work Vault",
  lastOpened: "2026-04-24T10:00:00.000Z",
  peopleCount: 3,
  locationCount: 1,
};

beforeEach(() => {
  localStorage.clear();
});

describe("getKnownVaults", () => {
  it("returns empty array when no vaults stored", () => {
    expect(getKnownVaults()).toEqual([]);
  });

  it("returns stored vaults", () => {
    addKnownVault(vault1);
    const vaults = getKnownVaults();
    expect(vaults).toHaveLength(1);
    expect(vaults[0]?.uri).toBe("gist:abc123");
  });
});

describe("addKnownVault", () => {
  it("adds a vault to the list", () => {
    addKnownVault(vault1);
    expect(getKnownVaults()).toHaveLength(1);
  });

  it("replaces existing vault with same URI", () => {
    addKnownVault(vault1);
    addKnownVault({ ...vault1, name: "Updated Name" });
    const vaults = getKnownVaults();
    expect(vaults).toHaveLength(1);
    expect(vaults[0]?.name).toBe("Updated Name");
  });

  it("prepends new vaults to the front", () => {
    addKnownVault(vault1);
    addKnownVault(vault2);
    expect(getKnownVaults()[0]?.uri).toBe("gist:def456");
  });
});

describe("removeKnownVault", () => {
  it("removes a vault by URI", () => {
    addKnownVault(vault1);
    addKnownVault(vault2);
    removeKnownVault("gist:abc123");
    const vaults = getKnownVaults();
    expect(vaults).toHaveLength(1);
    expect(vaults[0]?.uri).toBe("gist:def456");
  });

  it("does nothing for non-existent URI", () => {
    addKnownVault(vault1);
    removeKnownVault("gist:nonexistent");
    expect(getKnownVaults()).toHaveLength(1);
  });
});

describe("updateKnownVault", () => {
  it("updates vault fields", () => {
    addKnownVault(vault1);
    updateKnownVault("gist:abc123", { name: "New Name", peopleCount: 10 });
    const vaults = getKnownVaults();
    expect(vaults[0]?.name).toBe("New Name");
    expect(vaults[0]?.peopleCount).toBe(10);
    expect(vaults[0]?.locationCount).toBe(2); // unchanged
  });

  it("does nothing for non-existent URI", () => {
    addKnownVault(vault1);
    updateKnownVault("gist:nonexistent", { name: "Ghost" });
    expect(getKnownVaults()[0]?.name).toBe("My Vault");
  });
});
