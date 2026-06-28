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

  it("renders provider-neutral Get started CTAs (mobile + desktop)", () => {
    render(<Home />);
    // Both the mobile and desktop layouts render the same neutral CTA.
    expect(screen.getAllByText("Get started")).toHaveLength(2);
  });
});
