import { afterEach, describe, expect, it, vi } from "vitest";

import { GITHUB_AUTH_MESSAGE_TYPE } from "@/lib/datastore/constants";
import { GET } from "@/app/api/auth/github/callback/route";

function createCallbackRequest(url: string, cookieState?: string): Request {
  return {
    url,
    headers: {
      get(name: string) {
        return name.toLowerCase() === "cookie" && cookieState
          ? `myregulars-github-oauth-state=${cookieState}`
          : null;
      },
    } as Headers,
    cookies: {
      get(name: string) {
        if (name !== "myregulars-github-oauth-state" || !cookieState) {
          return undefined;
        }

        return {
          name,
          value: cookieState,
        };
      },
    },
  } as unknown as Request;
}

describe("GET /api/auth/github/callback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("rejects missing or mismatched state", async () => {
    const response = await GET(
      createCallbackRequest(
        "https://myregulars.app/api/auth/github/callback?code=abc&state=wrong",
        "expected",
      ),
    );

    const body = await response.text();

    expect(response.status).toBe(400);
    expect(body).toContain(GITHUB_AUTH_MESSAGE_TYPE);
    expect(body).toContain("GitHub auth state validation failed.");
  });

  it("returns token-posting HTML on success", async () => {
    vi.stubEnv("GITHUB_OAUTH_CLIENT_ID", "client-id");
    vi.stubEnv("GITHUB_OAUTH_CLIENT_SECRET", "client-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token-123" }), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      ),
    );

    const response = await GET(
      createCallbackRequest(
        "https://myregulars.app/api/auth/github/callback?code=abc&state=expected",
        "expected",
      ),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain(GITHUB_AUTH_MESSAGE_TYPE);
    expect(body).toContain("token-123");
  });
});
