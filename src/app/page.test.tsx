import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock auth context
vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ isAuthenticated: false }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("Home", () => {
  it("renders the main headline", () => {
    render(<Home />);
    expect(screen.getAllByText(/Remember the people/)[0]).toBeTruthy();
  });

  it("renders mobile Get started button", () => {
    render(<Home />);
    expect(screen.getByText("Get started")).toBeTruthy();
  });

  it("renders desktop Connect with GitHub button", () => {
    render(<Home />);
    expect(screen.getByText("Connect with GitHub")).toBeTruthy();
  });
});
