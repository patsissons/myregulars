import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { LocationDetailContent } from "./location-detail-content";
import type { Group, Location, Person } from "@/lib/datastore/types";

const mocks = vi.hoisted(() => ({
  deleteLocation: vi.fn(),
  deleteGroup: vi.fn(),
  push: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("@/lib/vault-context", () => ({
  useVault: () => ({
    isReadOnly: false,
    deleteLocation: mocks.deleteLocation,
    deleteGroup: mocks.deleteGroup,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));

const TS = "2026-06-01T00:00:00.000Z";

function person(id: string, name: string, detail: string): Person {
  return { id, name, detail, createdAt: TS, updatedAt: TS };
}

function group(id: string, name: string, people: Person[]): Group {
  return { id, name, people, createdAt: TS, updatedAt: TS };
}

function buildLocation(): Location {
  return {
    id: "loc1",
    name: "Coffee Shop",
    description: "Downtown",
    groups: [
      group("g1", "Baristas", [
        person("p1", "Alice", "makes lattes"),
        person("p2", "Bob", "pulls espresso"),
      ]),
      group("g2", "Regulars", [person("p3", "Carol", "always tea")]),
    ],
    createdAt: TS,
    updatedAt: TS,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LocationDetailContent", () => {
  it("renders all people across groups initially", () => {
    render(<LocationDetailContent location={buildLocation()} vaultId="vault1" />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Carol")).toBeInTheDocument();
  });

  it("filters the visible people by the search query", async () => {
    const user = userEvent.setup();
    render(<LocationDetailContent location={buildLocation()} vaultId="vault1" />);

    await user.type(screen.getByPlaceholderText("Search people"), "Alice");

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
    expect(screen.queryByText("Carol")).not.toBeInTheDocument();
  });

  it("shows an empty state when the search matches nobody", async () => {
    const user = userEvent.setup();
    render(<LocationDetailContent location={buildLocation()} vaultId="vault1" />);

    await user.type(screen.getByPlaceholderText("Search people"), "zzz-no-match");

    expect(screen.getByText("No matches")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("filters people when a group chip is selected", async () => {
    const user = userEvent.setup();
    render(<LocationDetailContent location={buildLocation()} vaultId="vault1" />);

    await user.click(screen.getByRole("button", { name: "Regulars" }));

    expect(screen.getByText("Carol")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(screen.queryByText("Bob")).not.toBeInTheDocument();
  });

  it("calls onAddPerson when the Add person button is clicked", async () => {
    const user = userEvent.setup();
    const onAddPerson = vi.fn();
    render(
      <LocationDetailContent
        location={buildLocation()}
        vaultId="vault1"
        onAddPerson={onAddPerson}
      />,
    );

    await user.click(screen.getByRole("button", { name: /add person/i }));
    expect(onAddPerson).toHaveBeenCalledOnce();
  });

  it("deletes the place and navigates after confirming", async () => {
    const user = userEvent.setup();
    render(<LocationDetailContent location={buildLocation()} vaultId="vault1" />);

    await user.click(screen.getByRole("button", { name: "Delete place" }));

    // Confirmation modal is now open with a danger Delete button.
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(mocks.deleteLocation).toHaveBeenCalledWith("loc1");
    expect(mocks.push).toHaveBeenCalledWith("/v/vault1");
  });

  it("does not delete the place when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    render(<LocationDetailContent location={buildLocation()} vaultId="vault1" />);

    await user.click(screen.getByRole("button", { name: "Delete place" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mocks.deleteLocation).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("toasts instead of deleting a non-empty group", async () => {
    const user = userEvent.setup();
    render(<LocationDetailContent location={buildLocation()} vaultId="vault1" />);

    await user.click(screen.getByRole("button", { name: "Delete group Baristas" }));

    expect(mocks.showToast).toHaveBeenCalled();
    expect(mocks.deleteGroup).not.toHaveBeenCalled();
  });
});
