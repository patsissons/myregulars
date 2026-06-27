import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VaultSearch } from "./vault-search";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Empty vault — search behaviour itself is covered by E2E; here we assert the
// shortcut-hint toggle and basic structure.
vi.mock("@/lib/vault-context", () => ({
  useVault: () => ({ vault: null }),
  getAllPeople: () => [],
}));

describe("VaultSearch", () => {
  it("renders a search box", () => {
    render(<VaultSearch vaultId="abc123" />);
    expect(screen.getByRole("searchbox", { name: "Search vault" })).toBeTruthy();
  });

  it("shows the ⌘K hint by default (desktop)", () => {
    render(<VaultSearch vaultId="abc123" />);
    expect(screen.getByText("⌘K")).toBeTruthy();
  });

  // Regression: the mobile vault search reuses this component with the desktop
  // keyboard hint hidden.
  it("hides the ⌘K hint when showShortcut is false (mobile)", () => {
    render(<VaultSearch vaultId="abc123" showShortcut={false} />);
    expect(screen.queryByText("⌘K")).toBeNull();
  });
});
