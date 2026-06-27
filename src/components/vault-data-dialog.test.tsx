import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useVaultDataDialog } from "./vault-data-dialog";
import type { Vault } from "@/lib/vault-types";

const TS = "2026-06-01T00:00:00.000Z";

const vault: Vault = {
  name: "My Regulars",
  locations: [
    {
      id: "loc1",
      name: "Coffee Shop",
      groups: [
        {
          id: "g1",
          name: "Baristas",
          people: [
            { id: "p1", name: "Alice", detail: "makes lattes", createdAt: TS, updatedAt: TS },
          ],
          createdAt: TS,
          updatedAt: TS,
        },
      ],
      createdAt: TS,
      updatedAt: TS,
    },
  ],
};

vi.mock("@/lib/vault-context", () => ({
  useVault: () => ({ vault }),
}));

beforeEach(() => {
  // Desktop viewport so the Modal (not the mobile Sheet) is rendered.
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
});

function Harness() {
  const { openVaultData, VaultDataDialogComponent } = useVaultDataDialog();
  return (
    <>
      <button onClick={openVaultData}>open data</button>
      {VaultDataDialogComponent}
    </>
  );
}

describe("useVaultDataDialog", () => {
  it("renders nothing before it is opened", () => {
    render(<Harness />);
    expect(screen.queryByText("Vault data")).not.toBeInTheDocument();
  });

  it("renders the raw vault JSON including the vault name and a known person", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "open data" }));

    const pre = document.querySelector("pre");
    expect(pre).not.toBeNull();
    const text = pre?.textContent ?? "";
    expect(text).toContain("My Regulars");
    expect(text).toContain("Alice");
    expect(text).toContain("Coffee Shop");
    // Serialized as the canonical document shape.
    expect(text).toContain('"myregulars"');
  });

  it("copies the JSON to the clipboard via the Copy JSON button", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "open data" }));

    await user.click(screen.getByRole("button", { name: /copy json/i }));

    // userEvent provides a working clipboard; read back what the component wrote.
    const copied = await navigator.clipboard.readText();
    expect(copied).toContain("My Regulars");
    expect(copied).toContain("Alice");
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });
});
