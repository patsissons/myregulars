import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { StorageSheet } from "./storage-sheet";
import type { ReplicaStatusResult } from "@/lib/db";
import type { DatastoreUri } from "@/lib/datastore/types";

const mocks = vi.hoisted(() => ({
  getReplicaStatus: vi.fn<() => Promise<ReplicaStatusResult>>(),
  copyDatastore: vi.fn(() => Promise.resolve({})),
  syncDatastoreReplicas: vi.fn(() => Promise.resolve({ applied: true })),
  resolveReplicaConflict: vi.fn(() => Promise.resolve({})),
  deleteDatastore: vi.fn(() => Promise.resolve()),
  setPrimaryReplica: vi.fn(),
  navigate: vi.fn(),
  openVault: vi.fn(() => Promise.resolve()),
  ensureSignedIn: vi.fn(() => Promise.resolve(true)),
  vault: { isReadOnly: false, dirty: false, vault: { name: "Home", locations: [] } },
  auth: {
    gist: { status: "signedIn", username: "pat" },
    hosted: { status: "signedIn", username: "pat@example.com" },
  } as Record<string, { status: string; username: string | null }>,
}));

vi.mock("@/lib/db", () => ({
  getReplicaStatus: mocks.getReplicaStatus,
  copyDatastore: mocks.copyDatastore,
  syncDatastoreReplicas: mocks.syncDatastoreReplicas,
  resolveReplicaConflict: mocks.resolveReplicaConflict,
  deleteDatastore: mocks.deleteDatastore,
  setPrimaryReplica: mocks.setPrimaryReplica,
}));
vi.mock("@/lib/router/history", () => ({
  navigate: mocks.navigate,
  subscribeRouter: () => () => {},
  getRouterState: () => null,
  getServerRouterState: () => null,
  pushSheetEntry: () => {},
  popSheetEntry: () => false,
}));
vi.mock("@/lib/vault-context", () => ({
  useVault: () => ({
    ...mocks.vault,
    openVault: mocks.openVault,
    cloneVault: vi.fn(),
    flushPendingSave: vi.fn(() => Promise.resolve()),
  }),
}));
vi.mock("@/lib/provider-auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/provider-auth")>("@/lib/provider-auth");
  return {
    PROVIDER_LABELS: actual.PROVIDER_LABELS,
    useProviderAuth: (provider: string) => ({
      provider,
      signOut: () => {},
      ...mocks.auth[provider],
    }),
    useEnsureSignedIn: () => ({ ensureSignedIn: mocks.ensureSignedIn, SignInSheet: null }),
  };
});

const GIST = "gist:abc123def456abc123def456" as const;
const HOSTED = "hosted:rec1234567890ab" as const;
const copy = (uri: DatastoreUri) => ({
  uri,
  updatedAt: "2026-06-01T00:00:00.000Z",
  peopleCount: 3,
  locationCount: 2,
});

function status(partial: Partial<ReplicaStatusResult>): ReplicaStatusResult {
  return {
    uri: GIST,
    siblingUri: null,
    status: null,
    entry: null,
    copies: { gist: copy(GIST) },
    ...partial,
  };
}

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
  for (const fn of Object.values(mocks))
    if (typeof fn === "function" && "mockClear" in fn) fn.mockClear();
  mocks.vault.isReadOnly = false;
  mocks.auth.hosted = { status: "signedIn", username: "pat@example.com" };
});

describe("StorageSheet", () => {
  it("offers Copy here for the provider without a copy and copies on click", async () => {
    const user = userEvent.setup();
    mocks.getReplicaStatus.mockResolvedValue(status({}));
    render(<StorageSheet open onOpenChange={() => {}} uri={GIST} />);

    const hosted = await screen.findByRole("region", { name: "Hosted copy" });
    expect(hosted.getAttribute("data-status")).toBe("missing");
    await user.click(screen.getByRole("button", { name: "Copy here" }));
    await waitFor(() => expect(mocks.copyDatastore).toHaveBeenCalledWith(GIST, "hosted"));
    expect(mocks.ensureSignedIn).toHaveBeenCalledWith("hosted");
    expect(mocks.openVault).toHaveBeenCalledWith(GIST);
  });

  it("asks to connect first when the other provider is signed out", async () => {
    mocks.auth.hosted = { status: "signedOut", username: null };
    mocks.getReplicaStatus.mockResolvedValue(status({}));
    render(<StorageSheet open onOpenChange={() => {}} uri={GIST} />);
    expect(await screen.findByRole("button", { name: "Connect Hosted" })).toBeInTheDocument();
  });

  it("hides an unconfigured provider", async () => {
    mocks.auth.hosted = { status: "unconfigured", username: null };
    mocks.getReplicaStatus.mockResolvedValue(status({}));
    render(<StorageSheet open onOpenChange={() => {}} uri={GIST} />);
    await screen.findByRole("region", { name: "GitHub Gist copy" });
    expect(screen.queryByRole("region", { name: "Hosted copy" })).toBeNull();
  });

  it("shows in-sync copies with Remove enabled and Open on the other copy", async () => {
    const user = userEvent.setup();
    mocks.getReplicaStatus.mockResolvedValue(
      status({
        siblingUri: HOSTED,
        status: { kind: "inSync", hash: "h" },
        copies: { gist: copy(GIST), hosted: copy(HOSTED) },
      }),
    );
    render(<StorageSheet open onOpenChange={() => {}} uri={GIST} />);
    const hosted = await screen.findByRole("region", { name: "Hosted copy" });
    expect(hosted.getAttribute("data-status")).toBe("inSync");
    const removes = screen.getAllByRole("button", { name: "Remove this copy" });
    expect(removes).toHaveLength(2);
    expect(removes[0]).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Open this copy" }));
    expect(mocks.setPrimaryReplica).toHaveBeenCalledWith(HOSTED);
    expect(mocks.navigate).toHaveBeenCalledWith({ kind: "vault", uri: HOSTED }, { replace: true });
  });

  it("disables Remove and offers Resolve when the copies diverged", async () => {
    const user = userEvent.setup();
    mocks.getReplicaStatus.mockResolvedValue(
      status({
        siblingUri: HOSTED,
        status: { kind: "diverged" },
        copies: { gist: copy(GIST), hosted: copy(HOSTED) },
      }),
    );
    render(<StorageSheet open onOpenChange={() => {}} uri={GIST} />);
    await screen.findByRole("region", { name: "Hosted copy" });
    for (const b of screen.getAllByRole("button", { name: "Remove this copy" }))
      expect(b).toBeDisabled();

    await user.click(screen.getAllByRole("button", { name: "Resolve" })[0]);
    expect(await screen.findByText("Copies differ")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Keep this" })[1]);
    await waitFor(() => expect(mocks.resolveReplicaConflict).toHaveBeenCalledWith(GIST, "hosted"));
  });

  it("fast-forwards a copy that is behind", async () => {
    const user = userEvent.setup();
    mocks.getReplicaStatus.mockResolvedValue(
      status({
        siblingUri: HOSTED,
        status: { kind: "fastForward", from: "gist", to: "hosted", hash: "h" },
        copies: { gist: copy(GIST), hosted: copy(HOSTED) },
      }),
    );
    render(<StorageSheet open onOpenChange={() => {}} uri={GIST} />);
    const hosted = await screen.findByRole("region", { name: "Hosted copy" });
    expect(hosted.getAttribute("data-status")).toBe("behind");
    await user.click(screen.getByRole("button", { name: "Update this copy" }));
    await waitFor(() => expect(mocks.syncDatastoreReplicas).toHaveBeenCalledWith(GIST));
  });

  it("requires the vault name before deleting the last copy, then leaves to the list", async () => {
    const user = userEvent.setup();
    mocks.getReplicaStatus.mockResolvedValue(status({}));
    const onOpenChange = vi.fn();
    render(<StorageSheet open onOpenChange={onOpenChange} uri={GIST} />);
    await user.click(await screen.findByRole("button", { name: "Delete vault" }));
    const confirm = screen.getByRole("button", { name: "Delete vault" });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText("Type the vault name to confirm"), "Home");
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    await waitFor(() => expect(mocks.deleteDatastore).toHaveBeenCalledWith(GIST));
    expect(mocks.navigate).toHaveBeenCalledWith({ kind: "vaults" }, { replace: true });
  });

  it("offers independent copies to read-only viewers", async () => {
    const user = userEvent.setup();
    mocks.vault.isReadOnly = true;
    mocks.copyDatastore.mockResolvedValueOnce({ target: { uri: HOSTED } });
    mocks.getReplicaStatus.mockResolvedValue(status({}));
    render(<StorageSheet open onOpenChange={() => {}} uri={GIST} />);
    await user.click(await screen.findByRole("button", { name: "Copy to my Hosted" }));
    await waitFor(() =>
      expect(mocks.copyDatastore).toHaveBeenCalledWith(GIST, "hosted", { link: false }),
    );
    expect(mocks.navigate).toHaveBeenCalledWith({ kind: "vault", uri: HOSTED });
  });
});
