import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  connectDatastore,
  createDatastore,
  listDatastoreVersions,
  loadDatastore,
  loadDatastoreVersion,
  saveDatastore,
} from "@/lib/db";
import { clearGitHubAuthToken, setGitHubAuthToken } from "@/lib/datastore/auth";
import { DatastoreConflictError } from "@/lib/datastore/errors";
import { createEmptyDocument } from "@/lib/datastore/schema";

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
    ...init,
  });
}

describe("db facade", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    clearGitHubAuthToken();
  });

  it("connects a datastore reference", async () => {
    await expect(connectDatastore("https://myregulars.app/?gist=abc123")).resolves.toEqual({
      uri: "gist:abc123",
      provider: "gist",
      id: "abc123",
      gistId: "abc123",
      shareUrl: "http://localhost:3000/?gist=abc123",
    });
  });

  it("creates a datastore with a single fetch call", async () => {
    setGitHubAuthToken("token");
    const document = createEmptyDocument(new Date("2026-04-23T12:00:00.000Z"));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse({
          id: "abc123",
          files: {
            "myregulars.json": {
              content: JSON.stringify(document),
            },
          },
          history: [{ version: "sha-create", committed_at: "2026-04-23T12:00:00.000Z" }],
        }),
      ),
    );

    const snapshot = await createDatastore();

    expect(snapshot.uri).toBe("gist:abc123");
    expect(snapshot.version).toBe("sha-create");
    expect(snapshot.document).toEqual(document);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("loads from remote and falls back to cache when remote read fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          id: "abc123",
          files: {
            "myregulars.json": {
              content: JSON.stringify(createEmptyDocument()),
            },
          },
          history: [{ version: "sha-latest", committed_at: "2026-04-23T12:00:00.000Z" }],
        }),
      )
      .mockRejectedValueOnce(new Error("offline"));

    vi.stubGlobal("fetch", fetchMock);

    const remoteSnapshot = await loadDatastore("gist:abc123");
    const cachedSnapshot = await loadDatastore("gist:abc123");

    expect(remoteSnapshot.source).toBe("remote");
    expect(cachedSnapshot.source).toBe("cache");
  });

  it("loads a specific version", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse({
          id: "abc123",
          files: {
            "myregulars.json": {
              content: JSON.stringify(createEmptyDocument()),
            },
          },
        }),
      ),
    );

    await expect(loadDatastoreVersion("gist:abc123", "sha-older")).resolves.toMatchObject({
      version: "sha-older",
      uri: "gist:abc123",
    });
  });

  it("saves after verifying the expected version", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            id: "abc123",
            files: {
              "myregulars.json": {
                content: JSON.stringify(createEmptyDocument()),
              },
            },
            history: [{ version: "sha-current", committed_at: "2026-04-23T12:00:00.000Z" }],
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            id: "abc123",
            files: {
              "myregulars.json": {
                content: JSON.stringify(createEmptyDocument()),
              },
            },
            history: [{ version: "sha-new", committed_at: "2026-04-23T12:00:00.000Z" }],
          }),
        ),
    );

    const snapshot = await saveDatastore({
      uri: "gist:abc123",
      expectedVersion: "sha-current",
      document: createEmptyDocument(),
      authToken: "token",
    });

    expect(snapshot.version).toBe("sha-new");
  });

  it("rejects conflicting saves", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse({
          id: "abc123",
          files: {
            "myregulars.json": {
              content: JSON.stringify(createEmptyDocument()),
            },
          },
          history: [{ version: "sha-current", committed_at: "2026-04-23T12:00:00.000Z" }],
        }),
      ),
    );

    await expect(
      saveDatastore({
        uri: "gist:abc123",
        expectedVersion: "sha-old",
        document: createEmptyDocument(),
        authToken: "token",
      }),
    ).rejects.toThrow(DatastoreConflictError);
  });

  it("lists datastore versions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse([
          {
            version: "abcdef123456",
            committed_at: "2026-04-23T12:00:00.000Z",
          },
        ]),
      ),
    );

    await expect(listDatastoreVersions("gist:abc123")).resolves.toEqual([
      {
        id: "abcdef123456",
        createdAt: "2026-04-23T12:00:00.000Z",
        label: "abcdef1",
      },
    ]);
  });
});
