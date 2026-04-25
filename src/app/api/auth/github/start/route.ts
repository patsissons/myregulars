import { NextResponse } from "next/server";

import { GITHUB_AUTH_COOKIE_NAME, GITHUB_OAUTH_SCOPE } from "@/lib/datastore/constants";

function requireClientId(): string {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;

  if (!clientId) {
    throw new Error("GITHUB_OAUTH_CLIENT_ID is not configured.");
  }

  return clientId;
}

export async function GET(request: Request): Promise<Response> {
  const clientId = requireClientId();
  const state = crypto.randomUUID();
  const callbackUrl = new URL("/api/auth/github/callback", request.url);
  const githubUrl = new URL("https://github.com/login/oauth/authorize");
  githubUrl.searchParams.set("client_id", clientId);
  githubUrl.searchParams.set("redirect_uri", callbackUrl.toString());
  githubUrl.searchParams.set("scope", GITHUB_OAUTH_SCOPE);
  githubUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(githubUrl);
  response.cookies.set(GITHUB_AUTH_COOKIE_NAME, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: callbackUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
