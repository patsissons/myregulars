import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  beginGitHubAuth,
  clearGitHubAuthToken,
  getGitHubAuthToken,
  setGitHubAuthToken,
} from "@/lib/datastore/auth";
import { GITHUB_AUTH_MESSAGE_TYPE, GITHUB_AUTH_TOKEN_KEY } from "@/lib/datastore/constants";
import { AuthRequiredError } from "@/lib/datastore/errors";

describe("auth token persistence", () => {
  beforeEach(() => {
    clearGitHubAuthToken();
  });

  it("persists a token to localStorage on set", () => {
    setGitHubAuthToken("persisted-token");

    expect(localStorage.getItem(GITHUB_AUTH_TOKEN_KEY)).toBe("persisted-token");
    expect(getGitHubAuthToken()).toBe("persisted-token");
  });

  it("restores a token from localStorage when memory cache is empty", () => {
    localStorage.setItem(GITHUB_AUTH_TOKEN_KEY, "stored-token");
    clearGitHubAuthToken();
    // clearGitHubAuthToken removes from both memory and localStorage,
    // so set it directly in localStorage to simulate a fresh page load
    localStorage.setItem(GITHUB_AUTH_TOKEN_KEY, "stored-token");

    expect(getGitHubAuthToken()).toBe("stored-token");
  });

  it("clears the token from both memory and localStorage", () => {
    setGitHubAuthToken("doomed-token");
    clearGitHubAuthToken();

    expect(getGitHubAuthToken()).toBeNull();
    expect(localStorage.getItem(GITHUB_AUTH_TOKEN_KEY)).toBeNull();
  });
});

describe("beginGitHubAuth", () => {
  const openMock = vi.fn<typeof window.open>();

  beforeEach(() => {
    clearGitHubAuthToken();
    openMock.mockReset();
    vi.stubGlobal("open", openMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves when the callback posts a token message", async () => {
    openMock.mockReturnValue({
      closed: false,
      close: vi.fn(),
    } as unknown as Window);

    const authPromise = beginGitHubAuth("/api/auth/github/start");

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        data: {
          type: GITHUB_AUTH_MESSAGE_TYPE,
          token: "token-123",
        },
      }),
    );

    await expect(authPromise).resolves.toBe("token-123");
    expect(getGitHubAuthToken()).toBe("token-123");
    expect(localStorage.getItem(GITHUB_AUTH_TOKEN_KEY)).toBe("token-123");
  });

  it("rejects when the popup is blocked", async () => {
    openMock.mockReturnValue(null);

    await expect(beginGitHubAuth()).rejects.toThrow(AuthRequiredError);
  });
});
