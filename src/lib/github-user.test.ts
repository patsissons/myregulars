import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthenticatedUser } from "./github-user";

// Mock the auth module
vi.mock("@/lib/datastore/auth", () => ({
  getGitHubAuthToken: vi.fn(),
}));

import { getGitHubAuthToken } from "@/lib/datastore/auth";

describe("getAuthenticatedUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when no auth token", async () => {
    vi.mocked(getGitHubAuthToken).mockReturnValue(null);
    const result = await getAuthenticatedUser();
    expect(result).toBeNull();
  });

  it("calls GitHub API with auth token", async () => {
    vi.mocked(getGitHubAuthToken).mockReturnValue("test-token");
    const mockUser = { login: "patsissons", id: 123, avatar_url: "https://example.com/avatar.png" };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    } as Response);

    const result = await getAuthenticatedUser();

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.github.com/user",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
    expect(result?.login).toBe("patsissons");
  });

  it("returns null when API response is not ok", async () => {
    vi.mocked(getGitHubAuthToken).mockReturnValue("bad-token");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Bad credentials" }),
    } as Response);

    const result = await getAuthenticatedUser();
    expect(result).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    vi.mocked(getGitHubAuthToken).mockReturnValue("test-token");
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));

    const result = await getAuthenticatedUser();
    expect(result).toBeNull();
  });
});
