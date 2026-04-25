import {
  GITHUB_AUTH_MESSAGE_TYPE,
  GITHUB_AUTH_TOKEN_KEY,
  GITHUB_OAUTH_START_PATH,
} from "@/lib/datastore/constants";
import { AuthRequiredError } from "@/lib/datastore/errors";

let cachedToken: string | null = null;

function readStoredToken(): string | null {
  try {
    return globalThis.localStorage?.getItem(GITHUB_AUTH_TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

function writeStoredToken(token: string): void {
  try {
    globalThis.localStorage?.setItem(GITHUB_AUTH_TOKEN_KEY, token);
  } catch {
    // localStorage may be unavailable (SSR, private browsing)
  }
}

function removeStoredToken(): void {
  try {
    globalThis.localStorage?.removeItem(GITHUB_AUTH_TOKEN_KEY);
  } catch {
    // localStorage may be unavailable
  }
}

function buildPopupFeatures(width = 600, height = 720): string {
  const left = Math.max((window.screen.width - width) / 2, 0);
  const top = Math.max((window.screen.height - height) / 2, 0);

  return [
    `width=${width}`,
    `height=${height}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
    "popup=yes",
  ].join(",");
}

function normalizeStartUrl(path: string): string {
  if (typeof window === "undefined") {
    return path;
  }

  return new URL(path, window.location.origin).toString();
}

export function getGitHubAuthToken(): string | null {
  if (cachedToken) {
    return cachedToken;
  }

  const stored = readStoredToken();

  if (stored) {
    cachedToken = stored;
  }

  return cachedToken;
}

export function clearGitHubAuthToken(): void {
  cachedToken = null;
  removeStoredToken();
}

export function setGitHubAuthToken(token: string): void {
  cachedToken = token;
  writeStoredToken(token);
}

export async function beginGitHubAuth(startPath = GITHUB_OAUTH_START_PATH): Promise<string> {
  if (typeof window === "undefined") {
    throw new AuthRequiredError("GitHub auth can only start in the browser.");
  }

  return new Promise((resolve, reject) => {
    const popup = window.open(
      normalizeStartUrl(startPath),
      "myregulars-github-auth",
      buildPopupFeatures(),
    );

    if (!popup) {
      reject(new AuthRequiredError("GitHub auth popup was blocked."));
      return;
    }

    const cleanup = () => {
      window.clearInterval(closePoll);
      window.removeEventListener("message", handleMessage);
    };

    const finishWithError = (error: unknown) => {
      cleanup();
      reject(error instanceof Error ? error : new AuthRequiredError());
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      const payload = event.data as { type?: string; token?: string; error?: string } | undefined;

      if (!payload || payload.type !== GITHUB_AUTH_MESSAGE_TYPE) {
        return;
      }

      cleanup();

      if (payload.error || !payload.token) {
        reject(new AuthRequiredError(payload.error ?? "GitHub auth failed."));
        return;
      }

      setGitHubAuthToken(payload.token);
      popup.close();
      resolve(payload.token);
    };

    const closePoll = window.setInterval(() => {
      if (popup.closed) {
        finishWithError(new AuthRequiredError("GitHub auth was cancelled."));
      }
    }, 250);

    window.addEventListener("message", handleMessage);
  });
}
