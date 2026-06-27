import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";

vi.mock("@/lib/datastore/auth", () => ({
  getGitHubAuthToken: vi.fn(),
  beginGitHubAuth: vi.fn(),
  clearGitHubAuthToken: vi.fn(),
}));

vi.mock("@/lib/github-user", () => ({
  getAuthenticatedUser: vi.fn(),
}));

import { AuthProvider, useAuth } from "./auth-context";
import { beginGitHubAuth, clearGitHubAuthToken, getGitHubAuthToken } from "@/lib/datastore/auth";
import { getAuthenticatedUser } from "@/lib/github-user";

function AuthConsumer() {
  const { isAuthenticated, authToken, username, isLoading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="token">{authToken ?? "none"}</span>
      <span data-testid="username">{username ?? "none"}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <button onClick={() => void login()}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>,
  );
}

describe("AuthProvider / useAuth", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("starts unauthenticated when there is no token", async () => {
    vi.mocked(getGitHubAuthToken).mockReturnValue(null);

    renderProvider();

    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
    expect(screen.getByTestId("token")).toHaveTextContent("none");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(getAuthenticatedUser).not.toHaveBeenCalled();
  });

  it("starts authenticated and fetches the username when a token exists", async () => {
    vi.mocked(getGitHubAuthToken).mockReturnValue("existing-token");
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      login: "patsissons",
      id: 1,
      avatar_url: "https://example.com/a.png",
    });

    renderProvider();

    expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
    expect(screen.getByTestId("token")).toHaveTextContent("existing-token");
    // loading until the username resolves
    expect(screen.getByTestId("loading")).toHaveTextContent("true");

    await waitFor(() => {
      expect(screen.getByTestId("username")).toHaveTextContent("patsissons");
    });
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("login obtains a token and fetches the user", async () => {
    vi.mocked(getGitHubAuthToken).mockReturnValue(null);
    vi.mocked(beginGitHubAuth).mockResolvedValue("fresh-token");
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      login: "newuser",
      id: 2,
      avatar_url: "https://example.com/b.png",
    });

    renderProvider();

    await act(async () => {
      screen.getByRole("button", { name: "login" }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
    });
    expect(screen.getByTestId("token")).toHaveTextContent("fresh-token");
    expect(screen.getByTestId("username")).toHaveTextContent("newuser");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("logout clears the token and resets to unauthenticated state", async () => {
    vi.mocked(getGitHubAuthToken).mockReturnValue("existing-token");
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      login: "patsissons",
      id: 1,
      avatar_url: "https://example.com/a.png",
    });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("username")).toHaveTextContent("patsissons");
    });

    act(() => {
      screen.getByRole("button", { name: "logout" }).click();
    });

    expect(clearGitHubAuthToken).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
    expect(screen.getByTestId("token")).toHaveTextContent("none");
    expect(screen.getByTestId("username")).toHaveTextContent("none");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("throws when useAuth is used outside the provider", () => {
    function Orphan() {
      useAuth();
      return null;
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Orphan />)).toThrow("useAuth must be used inside AuthProvider");
    spy.mockRestore();
  });
});
