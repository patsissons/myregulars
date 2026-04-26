"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { beginGitHubAuth, clearGitHubAuthToken, getGitHubAuthToken } from "@/lib/datastore/auth";
import { getAuthenticatedUser } from "@/lib/github-user";

interface AuthState {
  isAuthenticated: boolean;
  authToken: string | null;
  username: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: () => Promise<void>;
  logout: () => void;
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
    setState({
      isAuthenticated: false,
      authToken: null,
      username: null,
      isLoading: false,
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
