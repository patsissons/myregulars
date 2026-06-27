import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Inbox } from "lucide-react";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders the heading", () => {
    render(<EmptyState heading="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeTruthy();
  });

  it("renders the description when provided", () => {
    render(<EmptyState heading="Nothing here" description="Add your first item" />);
    expect(screen.getByText("Add your first item")).toBeTruthy();
  });

  it("does not render an action button without an action", () => {
    render(<EmptyState heading="Nothing here" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders an icon when provided", () => {
    const { container } = render(<EmptyState icon={Inbox} heading="Nothing here" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders the action button and calls onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<EmptyState heading="Nothing here" action={{ label: "Add item", onClick }} />);
    const button = screen.getByRole("button", { name: "Add item" });
    await user.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
