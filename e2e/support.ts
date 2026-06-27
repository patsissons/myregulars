import type { Page } from "@playwright/test";

// ─── Hermetic test harness ───
// The app authenticates with a GitHub token in localStorage and reads/writes
// vault data via the GitHub Gists API. These helpers seed localStorage and
// intercept every api.github.com request so E2E specs run with no credentials
// and no network, in a fully reproducible way.

export const GIST_ID = "abc123def456abc123def456";
export const VAULT_URI = `gist:${GIST_ID}`;
export const OWNER_LOGIN = "testuser";
export const VAULT_FILE = "myregulars.test-vault.json";
export const VERSION = "1abcdef1abcdef1abcdef1abcdef1abcdef1abcd";

const NOW = "2026-06-01T12:00:00.000Z";

/** A valid MyRegularsDocument with two places and three people. */
export function buildDocument() {
  const person = (id: string, name: string, detail: string, lastSeen: string) => ({
    id,
    name,
    detail,
    lastSeen,
    createdAt: NOW,
    updatedAt: NOW,
  });

  return {
    app: "myregulars",
    schemaVersion: 1,
    name: "Test Vault",
    updatedAt: NOW,
    data: {
      locations: [
        {
          id: "loc-cafe",
          name: "Blue Bottle",
          description: "Corner cafe",
          createdAt: NOW,
          updatedAt: NOW,
          groups: [
            {
              id: "grp-regulars",
              name: "Regulars",
              createdAt: NOW,
              updatedAt: NOW,
              people: [
                person(
                  "p-alice",
                  "Alice Baker",
                  "Flat white, no sugar",
                  "2026-06-20T09:00:00.000Z",
                ),
                person(
                  "p-carlos",
                  "Carlos Diaz",
                  "Cortado, reads paperbacks",
                  "2026-06-18T09:00:00.000Z",
                ),
              ],
            },
          ],
        },
        {
          id: "loc-tavern",
          name: "The Tavern",
          description: "Pub on 4th",
          createdAt: NOW,
          updatedAt: NOW,
          groups: [
            {
              id: "grp-locals",
              name: "Locals",
              createdAt: NOW,
              updatedAt: NOW,
              people: [
                person("p-deb", "Deb Owens", "IPA, dart league", "2026-06-15T09:00:00.000Z"),
              ],
            },
          ],
        },
      ],
    },
  };
}

function gistResponse() {
  return {
    id: GIST_ID,
    owner: { login: OWNER_LOGIN },
    updated_at: "2026-06-20T09:00:00.000Z",
    files: {
      [VAULT_FILE]: {
        filename: VAULT_FILE,
        content: JSON.stringify(buildDocument()),
      },
    },
    history: [{ version: VERSION, committed_at: "2026-06-20T09:00:00.000Z" }],
  };
}

interface SetupOptions {
  /** Extra delay (ms) applied to the single-gist read, to exercise loading UI. */
  gistReadDelayMs?: number;
  /**
   * Authenticated user's login. When it differs from the gist owner
   * (OWNER_LOGIN), the vault loads read-only. Defaults to the owner.
   */
  authLogin?: string;
}

export async function setupVaultApp(page: Page, options: SetupOptions = {}): Promise<void> {
  // Seed auth token + a known vault before any app script runs.
  await page.addInitScript((uri: string) => {
    localStorage.setItem("myregulars:github-auth-token", "test-token");
    localStorage.setItem(
      "myregulars:known-vaults",
      JSON.stringify([
        {
          uri,
          name: "Test Vault",
          lastOpened: "2026-06-20T09:00:00.000Z",
          peopleCount: 3,
          locationCount: 2,
        },
      ]),
    );
  }, VAULT_URI);

  const { gistReadDelayMs = 0, authLogin = OWNER_LOGIN } = options;

  await page.route("https://api.github.com/**", async (route) => {
    const url = new URL(route.request().url());
    const { pathname } = url;
    const method = route.request().method();

    // Authenticated user lookup.
    if (pathname === "/user") {
      return route.fulfill({ json: { login: authLogin, id: 1, avatar_url: "" } });
    }

    // Discovery list — keep empty so only the seeded known vault shows.
    if (pathname === "/gists" && method === "GET") {
      return route.fulfill({ json: [] });
    }

    // Version history list.
    if (pathname === `/gists/${GIST_ID}/commits`) {
      return route.fulfill({
        json: [{ version: VERSION, committed_at: "2026-06-20T09:00:00.000Z" }],
      });
    }

    // Single gist read (GET) or write (PATCH); also covers /gists/:id/:version.
    if (pathname.startsWith(`/gists/${GIST_ID}`)) {
      if (gistReadDelayMs > 0 && method === "GET") {
        await new Promise((resolve) => setTimeout(resolve, gistReadDelayMs));
      }
      return route.fulfill({ json: gistResponse() });
    }

    return route.fulfill({ status: 404, json: {} });
  });
}
