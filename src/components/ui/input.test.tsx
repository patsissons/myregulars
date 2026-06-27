import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input, Textarea } from "./input";

describe("Input", () => {
  it("forwards value and placeholder", () => {
    render(<Input value="hello" placeholder="Name" onChange={() => {}} />);
    const input = screen.getByPlaceholderText("Name") as HTMLInputElement;
    expect(input.value).toBe("hello");
  });

  // Regression: inputs below 16px trigger iOS zoom on focus. Inputs must render
  // at 16px on mobile and only shrink to 13px on lg+ desktop.
  it("renders at 16px on mobile and 13px on desktop", () => {
    render(<Input placeholder="Name" />);
    const input = screen.getByPlaceholderText("Name");
    expect(input.className).toContain("text-[16px]");
    expect(input.className).toContain("lg:text-[13px]");
  });

  it("merges a custom className", () => {
    render(<Input placeholder="Name" className="pl-9" />);
    expect(screen.getByPlaceholderText("Name").className).toContain("pl-9");
  });
});

describe("Textarea", () => {
  it("forwards value and placeholder", () => {
    render(<Textarea value="notes" placeholder="Detail" onChange={() => {}} />);
    const ta = screen.getByPlaceholderText("Detail") as HTMLTextAreaElement;
    expect(ta.value).toBe("notes");
  });

  it("renders at 16px on mobile and 13px on desktop", () => {
    render(<Textarea placeholder="Detail" />);
    const ta = screen.getByPlaceholderText("Detail");
    expect(ta.className).toContain("text-[16px]");
    expect(ta.className).toContain("lg:text-[13px]");
  });
});
