import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getVaultAuthToken, resolveVaultOwnership } from "@/lib/datastore/ownership";
import { getGitHubAuthToken } from "@/lib/datastore/auth";
import { getHostedAuthToken, getHostedUser } from "@/lib/datastore/pocketbase-auth";
import { getAuthenticatedUser } from "@/lib/github-user";

vi.mock("@/lib/datastore/auth", () => ({ getGitHubAuthToken: vi.fn() }));
vi.mock("@/lib/datastore/pocketbase-auth", () => ({
  getHostedAuthToken: vi.fn(),
  getHostedUser: vi.fn(),
}));
vi.mock("@/lib/github-user", () => ({ getAuthenticatedUser: vi.fn() }));

describe("getVaultAuthToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getGitHubAuthToken).mockReturnValue("gh-token");
    vi.mocked(getHostedAuthToken).mockReturnValue("pb-token");
  });

  it("uses the GitHub token for gist uris", () => {
    expect(getVaultAuthToken("gist:abc")).toBe("gh-token");
  });

  it("uses the hosted token for hosted uris", () => {
    expect(getVaultAuthToken("hosted:rec1")).toBe("pb-token");
  });
});

describe("resolveVaultOwnership (hosted)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is writable and reports the signed-in user", async () => {
    vi.mocked(getHostedUser).mockReturnValue({ id: "u1", name: "Ada", email: "a@b.co" });

    await expect(resolveVaultOwnership("hosted:rec1")).resolves.toEqual({
      ownerHandle: "Ada",
      isReadOnly: false,
    });
  });

  it("is read-only when signed out", async () => {
    vi.mocked(getHostedUser).mockReturnValue(null);

    await expect(resolveVaultOwnership("hosted:rec1")).resolves.toEqual({
      ownerHandle: null,
      isReadOnly: true,
    });
  });
});

describe("resolveVaultOwnership (gist)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getGitHubAuthToken).mockReturnValue("gh-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubOwner(login: string) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ owner: { login } }) } as Response),
    );
  }

  it("is writable when the gist owner matches the user", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ login: "owner", id: 1, avatar_url: "" });
    stubOwner("owner");

    await expect(resolveVaultOwnership("gist:abc")).resolves.toEqual({
      ownerHandle: "owner",
      isReadOnly: false,
    });
  });

  it("is read-only when the gist owner differs", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ login: "owner", id: 1, avatar_url: "" });
    stubOwner("someone-else");

    await expect(resolveVaultOwnership("gist:abc")).resolves.toEqual({
      ownerHandle: "someone-else",
      isReadOnly: true,
    });
  });

  it("is read-only without an authenticated user and skips the fetch", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(resolveVaultOwnership("gist:abc")).resolves.toEqual({
      ownerHandle: null,
      isReadOnly: true,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
