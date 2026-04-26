import { describe, expect, it } from "vitest";

import {
  computeInitials,
  createGroup,
  createLocation,
  createPerson,
  formatLastSeen,
  generateId,
  hueFromString,
} from "@/lib/datastore/helpers";

describe("generateId", () => {
  it("returns a UUID string", () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("returns unique ids", () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateId()));
    expect(ids.size).toBe(10);
  });
});

describe("computeInitials", () => {
  it("returns first letter of first two words", () => {
    expect(computeInitials("Alice Baker")).toBe("AB");
  });

  it("handles single word", () => {
    expect(computeInitials("Alice")).toBe("A");
  });

  it("uses only first two words for multi-word names", () => {
    expect(computeInitials("Alice Baker Clarke")).toBe("AB");
  });

  it("uppercases the result", () => {
    expect(computeInitials("alice baker")).toBe("AB");
  });

  it("handles extra whitespace", () => {
    expect(computeInitials("  alice   baker  ")).toBe("AB");
  });
});

describe("hueFromString", () => {
  it("returns a number between 0 and 359", () => {
    const hue = hueFromString("AB");
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
  });

  it("is deterministic for the same input", () => {
    expect(hueFromString("AB")).toBe(hueFromString("AB"));
  });

  it("returns different values for different inputs", () => {
    expect(hueFromString("AB")).not.toBe(hueFromString("CD"));
  });

  it("handles empty string", () => {
    const hue = hueFromString("");
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
  });
});

describe("formatLastSeen", () => {
  function daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  }

  it("returns 'today' for today", () => {
    expect(formatLastSeen(new Date().toISOString())).toBe("today");
  });

  it("returns 'yesterday' for 1 day ago", () => {
    expect(formatLastSeen(daysAgo(1))).toBe("yesterday");
  });

  it("returns days ago for 2-6 days", () => {
    expect(formatLastSeen(daysAgo(3))).toBe("3d ago");
  });

  it("returns weeks ago for 7-29 days", () => {
    expect(formatLastSeen(daysAgo(7))).toBe("1w ago");
    expect(formatLastSeen(daysAgo(14))).toBe("2w ago");
  });

  it("returns months ago for 30+ days", () => {
    expect(formatLastSeen(daysAgo(30))).toBe("1mo ago");
    expect(formatLastSeen(daysAgo(62))).toBe("2mo ago");
  });
});

describe("createPerson", () => {
  it("creates a person with generated id and timestamps", () => {
    const person = createPerson("Alice", "Loves her dog Biscuit");
    expect(person.id).toBeTruthy();
    expect(person.name).toBe("Alice");
    expect(person.detail).toBe("Loves her dog Biscuit");
    expect(person.createdAt).toBeTruthy();
    expect(person.updatedAt).toBeTruthy();
  });
});

describe("createGroup", () => {
  it("creates a group with empty people array", () => {
    const group = createGroup("Morning Crew");
    expect(group.id).toBeTruthy();
    expect(group.name).toBe("Morning Crew");
    expect(group.people).toEqual([]);
    expect(group.createdAt).toBeTruthy();
  });

  it("accepts optional description", () => {
    const group = createGroup("Staff", "The regulars who work here");
    expect(group.description).toBe("The regulars who work here");
  });
});

describe("createLocation", () => {
  it("creates a location with empty groups array", () => {
    const location = createLocation("Daily Grind");
    expect(location.id).toBeTruthy();
    expect(location.name).toBe("Daily Grind");
    expect(location.groups).toEqual([]);
    expect(location.createdAt).toBeTruthy();
  });

  it("accepts optional description", () => {
    const location = createLocation("Daily Grind", "Tues/Thurs mornings");
    expect(location.description).toBe("Tues/Thurs mornings");
  });
});
