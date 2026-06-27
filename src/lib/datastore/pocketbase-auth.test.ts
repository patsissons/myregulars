import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  beginHostedAuth,
  clearHostedAuth,
  getHostedAuthToken,
  getHostedUser,
  isHostedAuthenticated,
  listHostedAuthProviders,
} from "@/lib/datastore/pocketbase-auth";
import { AuthRequiredError } from "@/lib/datastore/errors";

const { fakeClient, authWithOAuth2 } = vi.hoisted(() => {
  const authWithOAuth2 = vi.fn();
  const fakeClient = {
    authStore: {
      token: "",
      record: null as { id: string; email?: string; name?: string } | null,
      isValid: false,
      clear: vi.fn(),
    },
    collection: () => ({ authWithOAuth2 }),
  };
  return { fakeClient, authWithOAuth2 };
});

vi.mock("@/lib/datastore/pocketbase-config", () => ({
  isHostedConfigured: () => true,
  getPocketBaseClient: () => fakeClient,
}));

function signOut() {
  fakeClient.authStore.token = "";
  fakeClient.authStore.record = null;
  fakeClient.authStore.isValid = false;
}

function signIn(token: string, record: { id: string; email?: string; name?: string }) {
  fakeClient.authStore.token = token;
  fakeClient.authStore.record = record;
  fakeClient.authStore.isValid = true;
}

describe("pocketbase auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signOut();
  });

  it("lists the supported social providers including GitHub", () => {
    const ids = listHostedAuthProviders().map((p) => p.id);
    expect(ids).toContain("github");
    expect(ids).toEqual(["github", "google", "apple", "facebook", "twitter"]);
  });

  it("returns no token or user when signed out", () => {
    expect(getHostedAuthToken()).toBeNull();
    expect(isHostedAuthenticated()).toBe(false);
    expect(getHostedUser()).toBeNull();
  });

  it("exposes the token and user when signed in", () => {
    signIn("tok", { id: "user1", email: "a@b.co", name: "Ada" });
    expect(getHostedAuthToken()).toBe("tok");
    expect(isHostedAuthenticated()).toBe(true);
    expect(getHostedUser()).toEqual({ id: "user1", email: "a@b.co", name: "Ada" });
  });

  it("begins social auth and returns the resulting token", async () => {
    authWithOAuth2.mockImplementationOnce(async () => {
      signIn("fresh-token", { id: "user2" });
    });

    const token = await beginHostedAuth("github");

    expect(authWithOAuth2).toHaveBeenCalledWith({ provider: "github" });
    expect(token).toBe("fresh-token");
  });

  it("rejects when auth does not complete", async () => {
    authWithOAuth2.mockResolvedValueOnce(undefined);
    await expect(beginHostedAuth("google")).rejects.toThrow(AuthRequiredError);
  });

  it("clears the session", () => {
    signIn("tok", { id: "user1" });
    clearHostedAuth();
    expect(fakeClient.authStore.clear).toHaveBeenCalled();
  });
});
