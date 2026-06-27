import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { usePersonFormDialog } from "./person-form-dialog";
import type { Location } from "@/lib/datastore/types";

// Stub the form so the dialog renders in isolation without vault context.
vi.mock("@/components/person-form", () => ({
  PersonForm: () => <div data-testid="person-form">form body</div>,
}));

const NOW = "2024-01-01T00:00:00.000Z";

function makeLocation(): Location {
  return {
    id: "loc1",
    name: "Cafe",
    groups: [],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
}

function Harness() {
  const { openAdd, DialogComponent } = usePersonFormDialog();
  return (
    <>
      <button type="button" onClick={() => openAdd("loc1", makeLocation())}>
        open add
      </button>
      {DialogComponent}
    </>
  );
}

afterEach(() => {
  setViewportWidth(1024);
});

describe("usePersonFormDialog", () => {
  it("keeps the dialog closed until openAdd is called", async () => {
    setViewportWidth(1280);
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByTestId("person-form")).toBeNull();

    await user.click(screen.getByRole("button", { name: "open add" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("person-form")).toBeInTheDocument();
    expect(screen.getByText("Add a person")).toBeInTheDocument();
  });

  it("renders a centered Modal on a wide viewport", async () => {
    setViewportWidth(1280);
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "open add" }));

    const dialog = screen.getByRole("dialog");
    // Modal content is centered (top-1/2) and exposes a Close button.
    expect(dialog.className).toContain("top-1/2");
    expect(screen.getByLabelText("Close")).toBeInTheDocument();
  });

  it("renders a bottom Sheet on a narrow viewport", async () => {
    setViewportWidth(400);
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "open add" }));

    const dialog = screen.getByRole("dialog");
    // Sheet content is pinned to the bottom edge (inline bottom, lifted above the
    // keyboard at runtime) and has no Close button.
    expect(dialog.style.bottom).toBe("0px");
    expect(dialog.className).not.toContain("top-1/2");
    expect(screen.queryByLabelText("Close")).toBeNull();
  });
});
