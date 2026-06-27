import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { PersonRow } from "./person-row";

beforeAll(() => {
  // PersonRow reads prefers-reduced-motion; provide a stub for the test env.
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    });
  }
});

const person = {
  id: "p1",
  name: "Alice Baker",
  detail: "Flat white, no sugar",
  lastSeen: "2026-06-20T12:00:00.000Z",
};

describe("PersonRow", () => {
  it("renders the person name and detail", () => {
    render(<PersonRow person={person} />);
    expect(screen.getByText("Alice Baker")).toBeTruthy();
    expect(screen.getByText("Flat white, no sugar")).toBeTruthy();
  });

  it("calls onClick when the row is clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<PersonRow person={person} onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  // Regression: the row had only active:opacity (touch) feedback and no hover.
  it("has a hover affordance", () => {
    render(<PersonRow person={person} onClick={() => {}} />);
    expect(screen.getByRole("button").className).toContain("hover:bg-black/[0.03]");
  });
});
