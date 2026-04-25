import { describe, expect, it, vi } from "vitest";

import { GITHUB_AUTH_COOKIE_NAME } from "@/lib/datastore/constants";
import { GET } from "@/app/api/auth/github/start/route";

describe("GET /api/auth/github/start", () => {
  it("redirects to GitHub OAuth and sets the state cookie", async () => {
    vi.stubEnv("GITHUB_OAUTH_CLIENT_ID", "client-id");
    vi.spyOn(crypto, "randomUUID").mockReturnValue("state-123");

    const response = await GET(new Request("https://myregulars.app/api/auth/github/start"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("https://github.com/login/oauth/authorize");
    expect(response.headers.get("set-cookie")).toContain(`${GITHUB_AUTH_COOKIE_NAME}=state-123`);
  });
});
