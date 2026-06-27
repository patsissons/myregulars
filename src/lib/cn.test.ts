import { describe, it, expect } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("merges multiple class strings", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("ignores falsy conditional values", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });

  it("applies conditional classes from an object", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active");
  });

  it("flattens arrays of class values", () => {
    expect(cn(["a", "b"], ["c"])).toBe("a b c");
  });

  it("resolves conflicting tailwind classes keeping the last one", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("resolves conflicting directional tailwind classes", () => {
    expect(cn("px-2", "px-4", "py-1")).toBe("px-4 py-1");
  });

  it("merges conflicting color utilities", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("returns empty string for no inputs", () => {
    expect(cn()).toBe("");
  });

  it("combines conditional and conflict resolution", () => {
    expect(cn("p-2", { "p-4": true })).toBe("p-4");
  });
});
