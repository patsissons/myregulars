import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { PersonRow } from "./person-row";

let reducedMotion = false;

beforeAll(() => {
  // PersonRow reads prefers-reduced-motion; provide a stub for the test env.
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({
      get matches() {
        return reducedMotion;
      },
      addEventListener() {},
      removeEventListener() {},
    }),
  });
});

afterEach(() => {
  reducedMotion = false;
  vi.useRealTimers();
});

const person = {
  id: "p1",
  name: "Alice Baker",
  detail: "Flat white, no sugar",
  lastSeen: "2026-06-20T12:00:00.000Z",
};

function row() {
  // The draggable wrapper is the button's parent.
  return screen.getByRole("button").parentElement!;
}

function drag(target: HTMLElement, from: [number, number], to: [number, number]) {
  fireEvent.mouseDown(target, { clientX: from[0], clientY: from[1] });
  fireEvent.mouseMove(target, { clientX: to[0], clientY: to[1] });
  fireEvent.mouseUp(target);
}

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

  it("lets the browser own vertical scrolling when swipe is enabled", () => {
    render(<PersonRow person={person} onLog={() => {}} />);
    expect(row().style.touchAction).toBe("pan-y");
  });

  it("logs a visit after a horizontal swipe past the threshold", () => {
    vi.useFakeTimers();
    const onLog = vi.fn();
    render(<PersonRow person={person} onLog={onLog} />);

    drag(row(), [0, 0], [120, 2]);

    expect(onLog).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent("Logged today");
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("does not log on a short swipe", () => {
    const onLog = vi.fn();
    render(<PersonRow person={person} onLog={onLog} />);
    drag(row(), [0, 0], [40, 0]);
    expect(onLog).not.toHaveBeenCalled();
  });

  // Regression: diagonal scrolls used to drag the row sideways and could log.
  it("treats a mostly-vertical drag as a scroll, not a swipe", () => {
    const onLog = vi.fn();
    render(<PersonRow person={person} onLog={onLog} />);

    drag(row(), [0, 0], [90, 140]);

    expect(onLog).not.toHaveBeenCalled();
    expect(row().style.transform).toBe("");
  });

  // Regression: releasing a drag fired the row's click and opened the person.
  it("swallows the click that follows a horizontal drag, but not later clicks", () => {
    const onClick = vi.fn();
    const onLog = vi.fn();
    render(<PersonRow person={person} onClick={onClick} onLog={onLog} />);

    drag(row(), [0, 0], [40, 0]);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("keeps swipe-to-log available under reduced motion", () => {
    reducedMotion = true;
    const onLog = vi.fn();
    render(<PersonRow person={person} onLog={onLog} />);
    drag(row(), [0, 0], [120, 0]);
    expect(onLog).toHaveBeenCalledOnce();
  });

  it("does not swipe when read-only", () => {
    const onLog = vi.fn();
    render(<PersonRow person={person} onLog={onLog} isReadOnly />);
    drag(row(), [0, 0], [120, 0]);
    expect(onLog).not.toHaveBeenCalled();
    expect(screen.queryByText("Swipe to log a visit")).toBeNull();
  });
});
