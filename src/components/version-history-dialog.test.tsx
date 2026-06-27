import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useVersionHistoryDialog } from "./version-history-dialog";
import type { VersionInfo } from "@/lib/datastore/types";

const mocks = vi.hoisted(() => ({
  listDatastoreVersions: vi.fn(),
  historicalVersionId: null as string | null,
}));

vi.mock("@/lib/db", () => ({
  listDatastoreVersions: mocks.listDatastoreVersions,
}));

vi.mock("@/lib/vault-context", () => ({
  useVault: () => ({ uri: "gist:abc123", historicalVersionId: mocks.historicalVersionId }),
}));

const NOW = new Date().toISOString();

beforeEach(() => {
  vi.clearAllMocks();
  mocks.historicalVersionId = null;
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
});

function Harness() {
  const { openVersionHistory, VersionHistoryDialogComponent } = useVersionHistoryDialog("vault1");
  return (
    <>
      <button onClick={openVersionHistory}>open history</button>
      {VersionHistoryDialogComponent}
    </>
  );
}

describe("useVersionHistoryDialog", () => {
  it("renders the list of versions returned by the loader", async () => {
    const versions: VersionInfo[] = [
      { id: "v1", createdAt: NOW, label: "abc1234" },
      { id: "v2", createdAt: NOW, label: "def5678" },
    ];
    mocks.listDatastoreVersions.mockResolvedValue(versions);

    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "open history" }));

    expect(await screen.findByText("abc1234")).toBeInTheDocument();
    expect(screen.getByText("def5678")).toBeInTheDocument();
    // First entry is flagged as the latest.
    expect(screen.getByText("Latest")).toBeInTheDocument();
    expect(mocks.listDatastoreVersions).toHaveBeenCalledWith("gist:abc123");
  });

  it("offers a View affordance for non-latest versions", async () => {
    const versions: VersionInfo[] = [
      { id: "v1", createdAt: NOW, label: "abc1234" },
      { id: "v2", createdAt: NOW, label: "def5678" },
    ];
    mocks.listDatastoreVersions.mockResolvedValue(versions);

    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "open history" }));

    const viewLink = await screen.findByRole("link", { name: "View" });
    expect(viewLink).toHaveAttribute("href", "/v/vault1?version=v2");
  });

  it("shows an empty state when there are no versions", async () => {
    mocks.listDatastoreVersions.mockResolvedValue([]);

    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "open history" }));

    expect(await screen.findByText("No version history available.")).toBeInTheDocument();
  });

  it("shows an error state when the loader rejects", async () => {
    mocks.listDatastoreVersions.mockRejectedValue(new Error("boom"));

    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "open history" }));

    expect(await screen.findByText("boom")).toBeInTheDocument();
  });
});
