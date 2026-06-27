import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./theme-provider";

const THEME_KEY = "myregulars:theme";

function stubColorScheme(prefersDark: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: prefersDark,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }),
  });
}

function ThemeConsumer() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>toggle</button>
    </div>
  );
}

describe("ThemeProvider / useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    stubColorScheme(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to light when nothing stored and system prefers light", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });

  it("defaults to dark when system prefers dark and nothing stored", () => {
    stubColorScheme(true);
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
  });

  it("reads the stored theme over the system preference", () => {
    localStorage.setItem(THEME_KEY, "dark");
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
  });

  it("toggles to dark, persists, and applies the dark class", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: "toggle" }).click();
    });

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("toggles back to light, persists, and removes the dark class", () => {
    localStorage.setItem(THEME_KEY, "dark");
    document.documentElement.classList.add("dark");

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByRole("button", { name: "toggle" }).click();
    });

    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("throws when useTheme is used outside the provider", () => {
    function Orphan() {
      useTheme();
      return null;
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Orphan />)).toThrow("useTheme must be used inside ThemeProvider");
    spy.mockRestore();
  });
});
