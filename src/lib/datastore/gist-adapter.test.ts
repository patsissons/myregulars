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

  it("creates a gist seeded with a provided initial document", async () => {
    const seed = createEmptyDocument(new Date("2026-04-23T12:00:00.000Z"));
    seed.name = "Imported Vault";
    seed.data.locations = [
      {
        id: "loc1",
        name: "Café",
        groups: [],
        createdAt: "2026-04-23T12:00:00.000Z",
        updatedAt: "2026-04-23T12:00:00.000Z",
      },
    ];

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "abc123",
        files: {
          "myregulars.json": {
            content: JSON.stringify(seed),
          },
        },
        history: [{ version: "sha-create", committed_at: "2026-04-23T12:00:00.000Z" }],
      }),
    );

    const adapter = new GistStorageAdapter({
      authToken: "token",
      fetchImpl: fetchMock,
    });

    const result = await adapter.create(seed);

    expect(result.uri).toBe("gist:abc123");
    expect(result.data).toEqual(seed);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string) as {
      files: Record<string, { content: string }>;
    };
    expect(JSON.parse(body.files["myregulars.json"].content)).toEqual(seed);
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

  it("discovers myregulars vaults and uses document name over filename", async () => {
    const docWithName = createEmptyDocument(new Date("2026-04-20T10:00:00.000Z"));
    (docWithName as { name?: string }).name = "My Coffee Shop";
    const docWithoutName = createEmptyDocument(new Date("2026-04-21T10:00:00.000Z"));

    // List gists response
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          id: "gist1",
          files: { "myregulars.json": { filename: "myregulars.json" } },
          updated_at: "2026-04-20T10:00:00.000Z",
        },
        {
          id: "gist2",
          files: { "myregulars.home.json": { filename: "myregulars.home.json" } },
          updated_at: "2026-04-21T10:00:00.000Z",
        },
        {
          id: "gist3",
          files: { "random-notes.md": { filename: "random-notes.md" } },
          updated_at: "2026-04-22T10:00:00.000Z",
        },
      ]),
    );
    // Individual gist fetches — gist1 has document name, gist2 does not
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "gist1",
        files: { "myregulars.json": { content: JSON.stringify(docWithName) } },
        history: [{ version: "sha1", committed_at: "2026-04-20T10:00:00.000Z" }],
      }),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "gist2",
        files: { "myregulars.home.json": { content: JSON.stringify(docWithoutName) } },
        history: [{ version: "sha2", committed_at: "2026-04-21T10:00:00.000Z" }],
      }),
    );

    const adapter = new GistStorageAdapter({
      authToken: "token",
      fetchImpl: fetchMock,
    });

    const vaults = await adapter.discover();

    expect(vaults).toEqual([
      {
        uri: "gist:gist1",
        name: "My Coffee Shop",
        fileName: "myregulars.json",
        updatedAt: "2026-04-20T10:00:00.000Z",
      },
      {
        uri: "gist:gist2",
        name: "Home",
        fileName: "myregulars.home.json",
        updatedAt: "2026-04-21T10:00:00.000Z",
      },
    ]);
    // 1 list call + 2 individual gist fetches
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("paginates discover results using Link header", async () => {
    const doc1 = createEmptyDocument(new Date("2026-04-20T10:00:00.000Z"));
    (doc1 as { name?: string }).name = "Downtown";
    const doc2 = createEmptyDocument(new Date("2026-04-21T10:00:00.000Z"));
    (doc2 as { name?: string }).name = "Office";

    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "gist1",
              files: { "myregulars.json": { filename: "myregulars.json" } },
              updated_at: "2026-04-20T10:00:00.000Z",
            },
          ]),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              link: '<https://api.github.com/gists?per_page=100&page=2>; rel="next"',
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            id: "gist2",
            files: { "myregulars.work.json": { filename: "myregulars.work.json" } },
            updated_at: "2026-04-21T10:00:00.000Z",
          },
        ]),
      )
      // Individual gist fetches
      .mockResolvedValueOnce(
        jsonResponse({
          id: "gist1",
          files: { "myregulars.json": { content: JSON.stringify(doc1) } },
          history: [{ version: "sha1", committed_at: "2026-04-20T10:00:00.000Z" }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "gist2",
          files: { "myregulars.work.json": { content: JSON.stringify(doc2) } },
          history: [{ version: "sha2", committed_at: "2026-04-21T10:00:00.000Z" }],
        }),
      );

    const adapter = new GistStorageAdapter({
      authToken: "token",
      fetchImpl: fetchMock,
    });

    const vaults = await adapter.discover();

    expect(vaults).toHaveLength(2);
    expect(vaults[0].uri).toBe("gist:gist1");
    expect(vaults[0].name).toBe("Downtown");
    expect(vaults[1].uri).toBe("gist:gist2");
    expect(vaults[1].name).toBe("Office");
    // 2 list pages + 2 individual gist fetches
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("requires auth for discover", async () => {
    const adapter = new GistStorageAdapter({ fetchImpl: fetchMock });
    await expect(adapter.discover()).rejects.toThrow(AuthRequiredError);
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
