import { type NextRequest, NextResponse } from "next/server";

import {
  GITHUB_AUTH_COOKIE_NAME,
  GITHUB_AUTH_MESSAGE_TYPE,
  GITHUB_OAUTH_TOKEN_URL,
} from "@/lib/datastore/constants";

function escapeScriptValue(value: string): string {
  return value.replaceAll("<", "\\u003c").replaceAll(">", "\\u003e");
}

function renderResultPage(payload: { token?: string; error?: string }, origin: string): string {
  const message = escapeScriptValue(
    JSON.stringify({
      type: GITHUB_AUTH_MESSAGE_TYPE,
      ...payload,
    }),
  );
  const safeOrigin = escapeScriptValue(origin);

  return `<!doctype html>
<html lang="en">
  <body>
    <script>
      (function () {
        const message = ${message};
        if (window.opener) {
          window.opener.postMessage(message, ${JSON.stringify(safeOrigin)});
        }
        window.close();
      })();
    </script>
  </body>
</html>`;
}

function getRequiredEnv(name: "GITHUB_OAUTH_CLIENT_ID" | "GITHUB_OAUTH_CLIENT_SECRET"): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const response = await fetch(GITHUB_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: getRequiredEnv("GITHUB_OAUTH_CLIENT_ID"),
      client_secret: getRequiredEnv("GITHUB_OAUTH_CLIENT_SECRET"),
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error("GitHub token exchange failed.");
  }

  const payload = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!payload.access_token) {
    throw new Error(payload.error_description ?? payload.error ?? "GitHub token exchange failed.");
  }

  return payload.access_token;
}

function buildHtmlResponse(html: string, status = 200): NextResponse {
  return new NextResponse(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const nextRequest = request as NextRequest;
  const cookieState =
    nextRequest.cookies?.get(GITHUB_AUTH_COOKIE_NAME)?.value ??
    request.headers
      .get("cookie")
      ?.split(";")
      .map((value) => value.trim())
      .find((cookie) => cookie.startsWith(`${GITHUB_AUTH_COOKIE_NAME}=`))
      ?.split("=")[1];
  const redirectUri = new URL("/api/auth/github/callback", request.url).toString();

  if (!state || !code || !cookieState || state !== cookieState) {
    const response = buildHtmlResponse(
      renderResultPage({ error: "GitHub auth state validation failed." }, url.origin),
      400,
    );
    response.cookies.delete(GITHUB_AUTH_COOKIE_NAME);
    return response;
  }

  try {
    const token = await exchangeCodeForToken(code, redirectUri);
    const response = buildHtmlResponse(renderResultPage({ token }, url.origin));
    response.cookies.delete(GITHUB_AUTH_COOKIE_NAME);
    return response;
  } catch (error) {
    const response = buildHtmlResponse(
      renderResultPage(
        {
          error: error instanceof Error ? error.message : "GitHub auth failed.",
        },
        url.origin,
      ),
      500,
    );
    response.cookies.delete(GITHUB_AUTH_COOKIE_NAME);
    return response;
  }
}
