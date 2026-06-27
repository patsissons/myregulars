import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { PersonForm } from "./person-form";
import type { PersonFormConfig } from "./person-form";
import type { Group, Location, Person } from "@/lib/datastore/types";

const mocks = vi.hoisted(() => ({
  addGroup: vi.fn((): string => "g-new"),
  addPerson: vi.fn(),
  updatePerson: vi.fn(),
  movePerson: vi.fn(),
  deletePerson: vi.fn(),
  showToast: vi.fn(),
  checkDuplicate: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/vault-context", () => ({
  useVault: () => ({
    vault: null,
    isReadOnly: false,
    addGroup: mocks.addGroup,
    addPerson: mocks.addPerson,
    updatePerson: mocks.updatePerson,
    movePerson: mocks.movePerson,
    deletePerson: mocks.deletePerson,
  }),
  getAllPeople: () => [],
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));

vi.mock("@/components/duplicate-confirm-dialog", () => ({
  useDuplicateConfirm: () => ({
    checkDuplicate: mocks.checkDuplicate,
    DuplicateConfirmDialogComponent: null,
  }),
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

function makeGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: "g1",
    name: "Regulars",
    people: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: "loc1",
    name: "Cafe",
    groups: [
      makeGroup({ id: "g1", name: "Regulars", people: [makePerson({ id: "p1", name: "Alice" })] }),
      makeGroup({ id: "g2", name: "Newcomers" }),
    ],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function addConfig(): PersonFormConfig {
  return { mode: "add", location: makeLocation(), locationId: "loc1" };
}

function editConfig(): PersonFormConfig {
  const location = makeLocation();
  return {
    mode: "edit",
    location,
    locationId: "loc1",
    groupId: "g1",
    person: location.groups[0].people[0],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.addGroup.mockImplementation(() => "g-new");
  mocks.checkDuplicate.mockResolvedValue(true);
});

describe("PersonForm — add mode", () => {
  it("disables the Add button until a name is entered, then saves", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PersonForm config={addConfig()} onClose={onClose} />);

    const addButton = screen.getByRole("button", { name: "Add person" });
    expect(addButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText("Name"), "Charlie");
    expect(addButton).toBeEnabled();

    await user.click(addButton);

    await waitFor(() => expect(mocks.addPerson).toHaveBeenCalledTimes(1));
    const [locationId, groupId, data] = mocks.addPerson.mock.calls[0];
    expect(locationId).toBe("loc1");
    expect(groupId).toBe("g1");
    expect(data).toMatchObject({ name: "Charlie" });
    expect(mocks.showToast).toHaveBeenCalledWith("Person added");
    expect(onClose).toHaveBeenCalled();
  });

  it("does not render the pets section in add mode", () => {
    render(<PersonForm config={addConfig()} onClose={vi.fn()} />);
    expect(screen.queryByText("Pets")).toBeNull();
    expect(screen.queryByText("+ Add pet")).toBeNull();
  });

  it("reveals a group-name input when '+ New group' is clicked", async () => {
    const user = userEvent.setup();
    render(<PersonForm config={addConfig()} onClose={vi.fn()} />);

    expect(screen.queryByPlaceholderText("Group name")).toBeNull();
    await user.click(screen.getByText("+ New group"));
    expect(screen.getByPlaceholderText("Group name")).toBeInTheDocument();
  });
});

describe("PersonForm — edit mode", () => {
  it("pre-fills the name and saves via updatePerson", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PersonForm config={editConfig()} onClose={onClose} />);

    const nameInput = screen.getByPlaceholderText("Name");
    expect(nameInput).toHaveValue("Alice");

    await user.clear(nameInput);
    await user.type(nameInput, "Alicia");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mocks.updatePerson).toHaveBeenCalledTimes(1));
    const [locationId, groupId, personId, data] = mocks.updatePerson.mock.calls[0];
    expect(locationId).toBe("loc1");
    expect(groupId).toBe("g1");
    expect(personId).toBe("p1");
    expect(data).toMatchObject({ name: "Alicia" });
    expect(mocks.addPerson).not.toHaveBeenCalled();
    expect(mocks.showToast).toHaveBeenCalledWith("Person updated");
    expect(onClose).toHaveBeenCalled();
  });

  it("renders the pets section only in edit mode", () => {
    render(<PersonForm config={editConfig()} onClose={vi.fn()} />);
    expect(screen.getByText("Pets")).toBeInTheDocument();
    expect(screen.getByText("+ Add pet")).toBeInTheDocument();
  });

  it("runs the delete confirmation flow and calls deletePerson", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PersonForm config={editConfig()} onClose={onClose} />);

    expect(screen.queryByText("Yes, delete")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Delete person" }));
    expect(screen.getByText("Sure?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Yes, delete" }));
    expect(mocks.deletePerson).toHaveBeenCalledWith("loc1", "g1", "p1");
    expect(mocks.showToast).toHaveBeenCalledWith("Person removed");
    expect(onClose).toHaveBeenCalled();
  });
});
