"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

/**
 * Wraps protected pages (dashboard, workouts, nutrition, ai-coach,
 * analytics, settings). Redirects unauthenticated users to /login and
 * shows a lightweight loading state while the session is being restored
 * from localStorage, so we don't flash protected content or bounce a
 * logged-in user during the initial /auth/me check.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-surface dark:bg-surface-dark">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-ink-muted">Loading your session…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
