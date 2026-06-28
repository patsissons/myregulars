"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { beginGitHubAuth, clearGitHubAuthToken, getGitHubAuthToken } from "@/lib/datastore/auth";
import { beginHostedAuth, clearHostedAuth, getHostedUser } from "@/lib/datastore/pocketbase-auth";
import type { HostedAuthProviderId } from "@/lib/datastore/constants";
import { getAuthenticatedUser } from "@/lib/github-user";

interface ProviderAuthSummary {
  isAuthenticated: boolean;
  username: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  authToken: string | null;
  username: string | null;
  isLoading: boolean;
  hosted: ProviderAuthSummary;
}

interface AuthContextValue extends AuthState {
  login: () => Promise<void>;
  logout: () => void;
  loginHosted: (provider: HostedAuthProviderId) => Promise<void>;
  logoutHosted: () => void;
}

function readHostedSummary(): ProviderAuthSummary {
  if (typeof window === "undefined") {
    return { isAuthenticated: false, username: null };
  }

  const user = getHostedUser();
  return {
    isAuthenticated: user !== null,
    username: user?.name ?? user?.email ?? null,
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialToken = typeof window !== "undefined" ? getGitHubAuthToken() : null;
  const [state, setState] = useState<AuthState>({
    isAuthenticated: !!initialToken,
    authToken: initialToken,
    username: null,
    // start loading only if we have a token (need to fetch username)
    isLoading: !!initialToken,
    hosted: readHostedSummary(),
  });
  const fetchedRef = useRef(false);

  const fetchAndSetUser = useCallback(async () => {
    const user = await getAuthenticatedUser();
    setState((prev) => ({
      ...prev,
      username: user?.login ?? null,
      isLoading: false,
    }));
    return user;
  }, []);

  useEffect(() => {
    const token = getGitHubAuthToken();
    if (token && !fetchedRef.current) {
      fetchedRef.current = true;
      void fetchAndSetUser();
    }
    // No else branch: isLoading is already false when no token (set in initial state)
  }, [fetchAndSetUser]);

  const login = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const token = await beginGitHubAuth();
      fetchedRef.current = true;
      setState((prev) => ({ ...prev, isAuthenticated: true, authToken: token }));
      await fetchAndSetUser();
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [fetchAndSetUser]);

  const logout = useCallback(() => {
    clearGitHubAuthToken();
    fetchedRef.current = false;
    setState((prev) => ({
      ...prev,
      isAuthenticated: false,
      authToken: null,
      username: null,
      isLoading: false,
    }));
  }, []);

  const loginHosted = useCallback(async (provider: HostedAuthProviderId) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      await beginHostedAuth(provider);
      setState((prev) => ({ ...prev, isLoading: false, hosted: readHostedSummary() }));
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const logoutHosted = useCallback(() => {
    clearHostedAuth();
    setState((prev) => ({ ...prev, hosted: { isAuthenticated: false, username: null } }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, loginHosted, logoutHosted }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
