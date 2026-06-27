import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formatRelativeTime } from "./format-relative-time";

const NOW = new Date("2026-06-27T12:00:00Z");

function ago(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString();
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for the current instant", () => {
    expect(formatRelativeTime(NOW.toISOString())).toBe("just now");
  });

  it("returns 'just now' for a few seconds ago", () => {
    expect(formatRelativeTime(ago(5 * SECOND))).toBe("just now");
  });

  it("returns 'just now' just under a minute", () => {
    expect(formatRelativeTime(ago(59 * SECOND))).toBe("just now");
  });

  it("returns 'just now' for future dates", () => {
    expect(formatRelativeTime(ago(-10 * MINUTE))).toBe("just now");
  });

  it("returns singular minute", () => {
    expect(formatRelativeTime(ago(MINUTE))).toBe("1 minute ago");
  });

  it("returns plural minutes", () => {
    expect(formatRelativeTime(ago(2 * MINUTE))).toBe("2 minutes ago");
    expect(formatRelativeTime(ago(59 * MINUTE))).toBe("59 minutes ago");
  });

  it("returns singular hour", () => {
    expect(formatRelativeTime(ago(HOUR))).toBe("1 hour ago");
  });

  it("returns plural hours", () => {
    expect(formatRelativeTime(ago(3 * HOUR))).toBe("3 hours ago");
    expect(formatRelativeTime(ago(23 * HOUR))).toBe("23 hours ago");
  });

  it("returns singular day", () => {
    expect(formatRelativeTime(ago(DAY))).toBe("1 day ago");
  });

  it("returns plural days", () => {
    expect(formatRelativeTime(ago(5 * DAY))).toBe("5 days ago");
    expect(formatRelativeTime(ago(29 * DAY))).toBe("29 days ago");
  });

  it("returns singular month at 30 days", () => {
    expect(formatRelativeTime(ago(30 * DAY))).toBe("1 month ago");
  });

  it("returns plural months", () => {
    expect(formatRelativeTime(ago(60 * DAY))).toBe("2 months ago");
    expect(formatRelativeTime(ago(11 * 30 * DAY))).toBe("11 months ago");
  });

  it("returns singular year at 12 months", () => {
    expect(formatRelativeTime(ago(12 * 30 * DAY))).toBe("1 year ago");
  });

  it("returns plural years", () => {
    expect(formatRelativeTime(ago(24 * 30 * DAY))).toBe("2 years ago");
  });
});
