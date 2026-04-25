import { beforeEach, describe, expect, it, vi } from "vitest";

import { GistStorageAdapter } from "@/lib/datastore/gist-adapter";
import { AuthRequiredError } from "@/lib/datastore/errors";
import { clearGitHubAuthToken } from "@/lib/datastore/auth";
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

describe("GistStorageAdapter", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    clearGitHubAuthToken();
  });

  it("creates a new secret gist datastore and returns full result", async () => {
    const document = createEmptyDocument(new Date("2026-04-23T12:00:00.000Z"));

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "abc123",
        files: {
          "myregulars.json": {
            content: JSON.stringify(document),
          },
        },
        history: [{ version: "sha-create", committed_at: "2026-04-23T12:00:00.000Z" }],
      }),
    );

    const adapter = new GistStorageAdapter({
      authToken: "token",
      fetchImpl: fetchMock,
    });

    const result = await adapter.create();

    expect(result.uri).toBe("gist:abc123");
    expect(result.data).toEqual(document);
    expect(result.version).toBe("sha-create");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/gists",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("reads the latest datastore document", async () => {
    const document = createEmptyDocument(new Date("2026-04-23T12:00:00.000Z"));

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "abc123",
        files: {
          "myregulars.json": {
            content: JSON.stringify(document),
          },
        },
        history: [{ version: "sha-latest", committed_at: "2026-04-23T12:00:00.000Z" }],
      }),
    );

    const adapter = new GistStorageAdapter({ fetchImpl: fetchMock });
    await adapter.connect("gist:abc123");

    await expect(adapter.read()).resolves.toEqual({
      data: document,
      version: "sha-latest",
    });
  });

  it("reads a specific datastore version", async () => {
    const document = createEmptyDocument(new Date("2026-04-23T12:00:00.000Z"));

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "abc123",
        files: {
          "myregulars.json": {
            content: JSON.stringify(document),
          },
        },
      }),
    );

    const adapter = new GistStorageAdapter({
      authToken: "token",
      fetchImpl: fetchMock,
    });
    await adapter.connect("gist:abc123");

    await expect(adapter.readVersion("sha-older")).resolves.toEqual({
      data: document,
      version: "sha-older",
    });
  });

  it("passes auth token to read requests", async () => {
    const document = createEmptyDocument(new Date("2026-04-23T12:00:00.000Z"));

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "abc123",
        files: {
          "myregulars.json": {
            content: JSON.stringify(document),
          },
        },
        history: [{ version: "sha-latest", committed_at: "2026-04-23T12:00:00.000Z" }],
      }),
    );

    const adapter = new GistStorageAdapter({
      authToken: "my-token",
      fetchImpl: fetchMock,
    });
    await adapter.connect("gist:abc123");
    await adapter.read();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/gists/abc123",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer my-token",
        }),
      }),
    );
  });

  it("lists versions for the gist", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          version: "abcdef123456",
          committed_at: "2026-04-23T12:00:00.000Z",
        },
      ]),
    );

    const adapter = new GistStorageAdapter({ fetchImpl: fetchMock });
    await adapter.connect("gist:abc123");

    await expect(adapter.listVersions()).resolves.toEqual([
      {
        id: "abcdef123456",
        createdAt: "2026-04-23T12:00:00.000Z",
        label: "abcdef1",
      },
    ]);
  });

  it("paginates version listing using Link header", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ version: "sha-page1", committed_at: "2026-04-23T12:00:00.000Z" }]),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              link: '<https://api.github.com/gists/abc123/commits?per_page=100&page=2>; rel="next"',
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse([{ version: "sha-page2", committed_at: "2026-04-23T13:00:00.000Z" }]),
      );

    const adapter = new GistStorageAdapter({ fetchImpl: fetchMock });
    await adapter.connect("gist:abc123");
    const versions = await adapter.listVersions();

    expect(versions).toHaveLength(2);
    expect(versions[0].id).toBe("sha-page1");
    expect(versions[1].id).toBe("sha-page2");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("writes a new gist version", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "abc123",
        files: {
          "myregulars.json": {
            content: JSON.stringify(createEmptyDocument()),
          },
        },
        history: [{ version: "sha-new", committed_at: "2026-04-23T12:00:00.000Z" }],
      }),
    );

    const adapter = new GistStorageAdapter({
      authToken: "token",
      fetchImpl: fetchMock,
    });
    await adapter.connect("gist:abc123");

    await expect(adapter.write(createEmptyDocument())).resolves.toBe("sha-new");
  });

  it("requires auth for create and write operations", async () => {
    const adapter = new GistStorageAdapter({ fetchImpl: fetchMock });
    await adapter.connect("gist:abc123");

    await expect(adapter.create()).rejects.toThrow(AuthRequiredError);
    await expect(adapter.write(createEmptyDocument())).rejects.toThrow(AuthRequiredError);
  });

  it("clears stored token and throws AuthRequiredError on 401", async () => {
    localStorage.setItem("myregulars:github-auth-token", "stale-token");

    fetchMock.mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }));

    const adapter = new GistStorageAdapter({
      authToken: "stale-token",
      fetchImpl: fetchMock,
    });
    await adapter.connect("gist:abc123");

    await expect(adapter.read()).rejects.toThrow(AuthRequiredError);
    expect(localStorage.getItem("myregulars:github-auth-token")).toBeNull();
  });
});
