import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar } from "./avatar";

describe("Avatar", () => {
  it("renders initials for a two-word name", () => {
    render(<Avatar name="Alice Baker" />);
    expect(screen.getByText("AB")).toBeTruthy();
  });

  it("renders single initial for a one-word name", () => {
    render(<Avatar name="Alice" />);
    expect(screen.getByText("A")).toBeTruthy();
  });

  it("renders with default size 36", () => {
    const { container } = render(<Avatar name="Alice Baker" />);
    const span = container.firstChild as HTMLElement;
    expect(span.style.width).toBe("36px");
    expect(span.style.height).toBe("36px");
  });

  it("renders with custom size", () => {
    const { container } = render(<Avatar name="Alice Baker" size={56} />);
    const span = container.firstChild as HTMLElement;
    expect(span.style.width).toBe("56px");
    expect(span.style.height).toBe("56px");
  });

  it("renders an img element when photoUrl is provided", () => {
    render(<Avatar name="Alice Baker" photoUrl="https://example.com/photo.jpg" />);
    const img = screen.getByRole("img");
    expect(img).toBeTruthy();
    expect((img as HTMLImageElement).src).toContain("example.com/photo.jpg");
  });
});
