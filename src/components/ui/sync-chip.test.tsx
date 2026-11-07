import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { SyncChip, deriveSyncStatus, type SyncInputs } from "./sync-chip";

const retrySave = vi.fn(() => Promise.resolve());
const vaultState = {
  isHistoricalVersion: false,
  isSyncing: false,
  dirty: false,
  error: null as string | null,
  source: "remote" as "cache" | "remote" | null,
};
vi.mock("@/lib/vault-context", () => ({
  useVault: () => ({ ...vaultState, retrySave }),
}));

const base: SyncInputs = {
  isHistoricalVersion: false,
  isSyncing: false,
  dirty: false,
  error: null,
  source: "remote",
  online: true,
};

describe("deriveSyncStatus", () => {
  it.each<[Partial<SyncInputs>, string]>([
    [{}, "saved"],
    [{ isSyncing: true }, "saving"],
    [{ dirty: true }, "saving"],
    [{ dirty: true, error: "Failed" }, "failed"],
    [{ online: false }, "offline"],
    [{ online: false, dirty: true, error: "x" }, "failed"],
    [{ source: "cache" }, "cached"],
    [{ source: "cache", dirty: true }, "saving"],
    [{ isHistoricalVersion: true, dirty: true, error: "x" }, "viewing"],
  ])("%j → %s", (overrides, expected) => {
    expect(deriveSyncStatus({ ...base, ...overrides })).toBe(expected);
  });
});

describe("SyncChip", () => {
  it("renders the derived status as a live region", () => {
    render(<SyncChip />);
    const chip = screen.getByRole("status");
    expect(chip.getAttribute("data-status")).toBe("saved");
    expect(screen.getByText("Saved")).toBeTruthy();
  });

  it("becomes a Retry button when a save failed", async () => {
    const user = userEvent.setup();
    vaultState.dirty = true;
    vaultState.error = "Failed to save changes.";
    render(<SyncChip />);
    const button = screen.getByRole("button", { name: "Not saved · Retry" });
    await user.click(button);
    expect(retrySave).toHaveBeenCalledOnce();
    vaultState.dirty = false;
    vaultState.error = null;
  });

  it("honours a status override", () => {
    render(<SyncChip status="diverged" />);
    expect(screen.getByRole("status").getAttribute("data-status")).toBe("diverged");
    expect(screen.getByText("Copies differ")).toBeTruthy();
  });

  it("keeps the label as the accessible name when compact", () => {
    render(<SyncChip compact />);
    expect(screen.getByRole("status", { name: "Saved" })).toBeTruthy();
    expect(screen.queryByText("Saved")).toBeNull();
  });
});
