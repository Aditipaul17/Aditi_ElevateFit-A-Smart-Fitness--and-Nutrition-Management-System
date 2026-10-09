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
  GoogleAuthPayload,
  login as apiLogin,
  loginWithGoogle as apiLoginWithGoogle,
  signup as apiSignup,
} from "@/lib/api";
import {
  isFirebaseConfigured,
  signInWithFirebaseEmail,
  signUpWithFirebaseEmail,
} from "@/lib/firebase";

const TOKEN_STORAGE_KEY = "elevatefit_token";


type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  /** True while the initial session (token -> user) check is in flight. */
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (payload: GoogleAuthPayload) => Promise<void>;
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

    // Timeout safety to ensure session check never hangs indefinitely
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, 1800);

    fetchCurrentUser(stored)
      .then((me) => setUser(me))
      .catch(() => {
        // Token is invalid, expired, or timed out.
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        clearTimeout(timer);
        setIsLoading(false);
      });
  }, []);

  const applyToken = useCallback(async (accessToken: string) => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    setToken(accessToken);
    const me = await fetchCurrentUser(accessToken);
    setUser(me);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      if (isFirebaseConfigured()) {
        try {
          const cred = await signInWithFirebaseEmail(email, password);
          if (cred.user?.email) {
            const idToken = await cred.user.getIdToken();
            const result = await apiLoginWithGoogle({
              email: cred.user.email,
              name: cred.user.displayName || cred.user.email.split("@")[0],
              id_token: idToken,
              photo_url: cred.user.photoURL || null,
            });
            await applyToken(result.access_token);
            return;
          }
        } catch (fbErr: unknown) {
          const code =
            fbErr && typeof fbErr === "object" && "code" in fbErr
              ? String((fbErr as { code: unknown }).code)
              : "";

          // Fallback to backend authentication for accounts in DB (like demo user)
          if (
            code === "auth/user-not-found" ||
            code === "auth/invalid-credential" ||
            code === "auth/wrong-password"
          ) {
            try {
              const result = await apiLogin(email, password);
              await applyToken(result.access_token);
              return;
            } catch {
              throw fbErr;
            }
          }
          throw fbErr;
        }
      }

      const result = await apiLogin(email, password);
      await applyToken(result.access_token);
    },
    [applyToken]
  );

  const loginWithGoogle = useCallback(
    async (payload: GoogleAuthPayload) => {
      const result = await apiLoginWithGoogle(payload);
      await applyToken(result.access_token);
    },
    [applyToken]
  );

  const signup = useCallback(
    async (name: string, email: string, password: string, confirmPassword: string) => {
      if (isFirebaseConfigured()) {
        try {
          await signUpWithFirebaseEmail(name, email, password);
        } catch (fbErr: unknown) {
          const code =
            fbErr && typeof fbErr === "object" && "code" in fbErr
              ? String((fbErr as { code: unknown }).code)
              : "";
          if (code !== "auth/email-already-in-use") {
            throw fbErr;
          }
        }
      }

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
      loginWithGoogle,
      signup,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, login, loginWithGoogle, signup, logout, refreshUser]
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
