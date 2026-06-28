import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { VaultCard } from "./vault-card";
import type { KnownVault } from "@/lib/vault-types";

const vault: KnownVault = {
  uri: "gist:abc123",
  provider: "gist",
  name: "My Regulars",
  lastOpened: "2026-06-20T12:00:00.000Z",
  peopleCount: 4,
  locationCount: 2,
};

describe("VaultCard", () => {
  it("renders the vault name and uri", () => {
    render(<VaultCard vault={vault} onClick={() => {}} />);
    expect(screen.getByText("My Regulars")).toBeTruthy();
    expect(screen.getByText("gist:abc123")).toBeTruthy();
  });

  it("shows a provider badge", () => {
    render(<VaultCard vault={vault} onClick={() => {}} />);
    expect(screen.getByText("Gist")).toBeTruthy();

    render(<VaultCard vault={{ ...vault, provider: "hosted" }} onClick={() => {}} />);
    expect(screen.getByText("Hosted")).toBeTruthy();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<VaultCard vault={vault} onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  // Regression: clicking a vault gave no feedback while it loaded.
  it("shows a spinner and disables the card while loading", () => {
    const { container } = render(<VaultCard vault={vault} onClick={() => {}} loading />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("is enabled and shows no spinner when not loading", () => {
    const { container } = render(<VaultCard vault={vault} onClick={() => {}} />);
    expect(screen.getByRole("button")).not.toBeDisabled();
    expect(container.querySelector(".animate-spin")).toBeNull();
  });
});
