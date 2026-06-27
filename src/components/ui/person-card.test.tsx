import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { PersonCard } from "./person-card";

const person = {
  id: "p1",
  name: "Alice Baker",
  detail: "Always orders a flat white",
};

describe("PersonCard", () => {
  it("renders the person name and detail", () => {
    render(<PersonCard person={person} />);
    expect(screen.getByText("Alice Baker")).toBeTruthy();
    expect(screen.getByText("Always orders a flat white")).toBeTruthy();
  });

  it("renders avatar initials when no photo provided", () => {
    render(<PersonCard person={person} />);
    expect(screen.getByText("AB")).toBeTruthy();
  });

  it("renders a photo when photoUrl is provided", () => {
    render(<PersonCard person={{ ...person, photoUrl: "https://example.com/p.jpg" }} />);
    const img = screen.getByRole("img");
    expect((img as HTMLImageElement).src).toContain("example.com/p.jpg");
  });

  it("does not render lastSeen when omitted", () => {
    render(<PersonCard person={person} />);
    expect(screen.queryByText("today")).toBeNull();
    expect(screen.queryByText("yesterday")).toBeNull();
  });

  it("renders lastSeen text when provided", () => {
    render(<PersonCard person={{ ...person, lastSeen: new Date().toISOString() }} />);
    expect(screen.getByText("Alice Baker")).toBeTruthy();
    // a "today" last-seen label is rendered alongside the name
    expect(screen.getByText("today")).toBeTruthy();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<PersonCard person={person} onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("applies active border styling when active", () => {
    const { container } = render(<PersonCard person={person} active />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.borderColor).toContain("var(--mr-accent)");
    expect(el.style.boxShadow).toContain("var(--mr-accent-soft)");
  });
});
