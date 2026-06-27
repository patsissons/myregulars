import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { PersonDetailPane } from "./person-detail-pane";
import type { Group, Location, Person } from "@/lib/datastore/types";

const mocks = vi.hoisted(() => ({
  logVisit: vi.fn(),
  showToast: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/lib/vault-context", () => ({
  useVault: () => ({
    vault: null,
    isReadOnly: false,
    logVisit: mocks.logVisit,
  }),
  getAllPeople: () => [],
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

const NOW = "2024-01-01T00:00:00.000Z";

function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    id: "p1",
    name: "Alice",
    detail: "likes tea",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const group: Group = {
  id: "g1",
  name: "Regulars",
  people: [],
  createdAt: NOW,
  updatedAt: NOW,
};

const location: Location = {
  id: "loc1",
  name: "Cafe",
  groups: [group],
  createdAt: NOW,
  updatedAt: NOW,
};

function renderPane(person: Person) {
  return render(
    <PersonDetailPane
      person={person}
      group={group}
      location={location}
      vaultId="v1"
      onClose={vi.fn()}
      onEdit={vi.fn()}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PersonDetailPane", () => {
  it("renders the person name, group and location", () => {
    renderPane(makePerson());
    expect(screen.getByRole("heading", { name: "Alice" })).toBeInTheDocument();
    expect(screen.getByText("Regulars · Cafe")).toBeInTheDocument();
  });

  it("logs a visit and toasts when 'Saw today' is clicked", async () => {
    const user = userEvent.setup();
    renderPane(makePerson());

    await user.click(screen.getByRole("button", { name: "Saw today" }));

    expect(mocks.logVisit).toHaveBeenCalledWith("loc1", "g1", "p1");
    expect(mocks.showToast).toHaveBeenCalledWith("Visit logged");
  });

  it("shows the key detail as notes", () => {
    renderPane(makePerson({ detail: "Orders a flat white" }));
    expect(screen.getByText("Orders a flat white")).toBeInTheDocument();
    expect(screen.queryByText("No notes yet.")).toBeNull();
  });

  it("shows an empty-notes placeholder when there is no detail", () => {
    renderPane(makePerson({ detail: "" }));
    expect(screen.getByText("No notes yet.")).toBeInTheDocument();
  });

  it("renders pets only when present", () => {
    const { unmount } = renderPane(makePerson());
    expect(screen.queryByText("Pets")).toBeNull();
    unmount();

    renderPane(makePerson({ pets: [{ name: "Biscuit", species: "dog" }] }));
    expect(screen.getByText("Pets")).toBeInTheDocument();
    expect(screen.getByText("Biscuit (dog)")).toBeInTheDocument();
  });

  it("renders recent visits, falling back to a placeholder when empty", () => {
    const { unmount } = renderPane(makePerson());
    expect(screen.getByText("No visits logged yet.")).toBeInTheDocument();
    unmount();

    renderPane(
      makePerson({
        visitLog: [{ date: "2024-03-15T00:00:00.000Z", note: "Talked about hiking" }],
      }),
    );
    expect(screen.getByText("2024-03-15")).toBeInTheDocument();
    expect(screen.getByText("Talked about hiking")).toBeInTheDocument();
  });

  it("logs a visit via the Log… modal", async () => {
    const user = userEvent.setup();
    renderPane(makePerson());

    await user.click(screen.getByRole("button", { name: "Log…" }));
    await user.click(screen.getByRole("button", { name: "Log visit" }));

    expect(mocks.logVisit).toHaveBeenCalledWith("loc1", "g1", "p1", undefined);
    expect(mocks.showToast).toHaveBeenCalledWith("Visit logged");
  });
});
