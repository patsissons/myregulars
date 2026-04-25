import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

vi.mock("next/image", () => ({
  default: ({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    priority: _priority,
    ...props
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
  }: React.ComponentProps<"img"> & { priority?: boolean }) => <img {...props} />,
}));

describe("Home", () => {
  it("renders the heading", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});
