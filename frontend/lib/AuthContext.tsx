"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ApiError,
  AuthUser,
  fetchCurrentUser,
  login as apiLogin,
  signup as apiSignup,
} from "@/lib/api";

const TOKEN_STORAGE_KEY = "elevatefit_token";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  /** True while the initial session (token -> user) check is in flight. */
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, restore any existing session from localStorage so a page
  // refresh doesn't log the user out.
  useEffect(() => {
    const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }

    setToken(stored);
    fetchCurrentUser(stored)
      .then((me) => setUser(me))
      .catch(() => {
        // Token is invalid or expired.
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const applyToken = useCallback(async (accessToken: string) => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    setToken(accessToken);
    const me = await fetchCurrentUser(accessToken);
    setUser(me);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await apiLogin(email, password);
      await applyToken(result.access_token);
    },
    [applyToken]
  );

  const signup = useCallback(
    async (name: string, email: string, password: string, confirmPassword: string) => {
      const result = await apiSignup({
        name,
        email,
        password,
        confirm_password: confirmPassword,
      });
      await applyToken(result.access_token);
    },
    [applyToken]
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const me = await fetchCurrentUser(token);
    setUser(me);
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(token && user),
      login,
      signup,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, login, signup, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export { ApiError };
