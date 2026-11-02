import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { LandingScreen } from "./landing";
import { routes } from "@/lib/router/routes";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  auth: { isAuthenticated: false, hosted: { isAuthenticated: false, username: null } },
  preferred: null as string | null,
}));

vi.mock("@/lib/router/history", () => ({ navigate: mocks.navigate }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/lib/db", () => ({ getPreferredDatastoreUri: () => mocks.preferred }));

function setWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
}

beforeEach(() => {
  mocks.navigate.mockClear();
  mocks.auth.isAuthenticated = false;
  mocks.auth.hosted = { isAuthenticated: false, username: null };
  mocks.preferred = null;
  setWidth(1280);
});

describe("LandingScreen", () => {
  it("renders the headline and a single Get started CTA for the active layout", () => {
    render(<LandingScreen route={routes.landing()} />);
    expect(screen.getByText(/Remember the people/)).toBeInTheDocument();
    expect(screen.getAllByText("Get started")).toHaveLength(1);
  });

  it("offers Open by link on mobile too", () => {
    setWidth(390);
    render(<LandingScreen route={routes.landing()} />);
    expect(screen.getByText("Have a vault link? Open it")).toBeInTheDocument();
  });

  it("replaces itself with the vault named by a share link", () => {
    const uri = "gist:abc123def456abc123def456";
    render(<LandingScreen route={routes.landing(uri)} />);
    expect(mocks.navigate).toHaveBeenCalledWith(routes.vault(uri), {
      replace: true,
      transition: "none",
    });
  });

  it("sends signed-in users to their vaults with a replace", () => {
    mocks.auth.isAuthenticated = true;
    render(<LandingScreen route={routes.landing()} />);
    expect(mocks.navigate).toHaveBeenCalledWith(routes.vaults(), {
      replace: true,
      transition: "none",
    });
  });

  it("reopens the last vault when its provider is signed in", () => {
    mocks.auth.isAuthenticated = true;
    mocks.preferred = "gist:abc123def456abc123def456";
    render(<LandingScreen route={routes.landing()} />);
    expect(mocks.navigate).toHaveBeenCalledWith(routes.vault("gist:abc123def456abc123def456"), {
      replace: true,
      transition: "none",
    });
  });

  it("falls back to the list when the last vault's provider is signed out", () => {
    mocks.auth.isAuthenticated = true;
    mocks.preferred = "hosted:rec1234567890ab";
    render(<LandingScreen route={routes.landing()} />);
    expect(mocks.navigate).toHaveBeenCalledWith(routes.vaults(), {
      replace: true,
      transition: "none",
    });
  });

  it("stays put for signed-out users", () => {
    render(<LandingScreen route={routes.landing()} />);
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
