"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { useAuth } from "@/lib/AuthContext";
import { ApiError, getErrorMessage } from "@/lib/api";
import {
  formatFirebaseAuthError,
  isPopupClosedError,
  signInWithGooglePopup,
} from "@/lib/firebase";


function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle, signup, isAuthenticated, isLoading: sessionLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const isBusy = submitting || googleSubmitting;

  // Already logged in (or session just restored) -> skip the login form.
  useEffect(() => {
    if (!sessionLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [sessionLoading, isAuthenticated, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      setError(formatFirebaseAuthError(err, getErrorMessage(err, "Invalid email or password.")));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    setGoogleSubmitting(true);
    try {
      const cred = await signInWithGooglePopup();
      const gUser = cred.user;
      if (!gUser.email) {
        throw new Error("No email is associated with this Google account.");
      }

      const idToken = await gUser.getIdToken();
      await loginWithGoogle({
        email: gUser.email,
        name: gUser.displayName || gUser.email.split("@")[0],
        photo_url: gUser.photoURL || null,
        id_token: idToken,
      });

      router.push("/dashboard");
    } catch (err: unknown) {
      if (isPopupClosedError(err)) {
        return;
      }
      setError(formatFirebaseAuthError(err, getErrorMessage(err, "Could not sign in with Google.")));
    } finally {
      setGoogleSubmitting(false);
    }
  }


  async function handleDemoLogin() {
    setError(null);
    setSubmitting(true);
    try {
      try {
        await login("athlete@elevatefit.io", "Password123!");
      } catch {
        await signup("Alex Rivers", "athlete@elevatefit.io", "Password123!", "Password123!");
      }
      router.push("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err, "Could not sign in with demo account."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to keep training with your AI coach."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary font-semibold hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-error/10 text-error text-sm px-4 py-3">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink dark:text-white mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={isBusy}
            className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-4 py-2.5 text-sm text-ink dark:text-white placeholder:text-ink-muted focus:border-primary outline-none transition-colors disabled:opacity-60"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-ink dark:text-white mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isBusy}
            className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-4 py-2.5 text-sm text-ink dark:text-white placeholder:text-ink-muted focus:border-primary outline-none transition-colors disabled:opacity-60"
          />
        </div>

        {/* Existing Log In Button */}
        <button type="submit" disabled={isBusy} className="btn-primary w-full disabled:opacity-60">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
          {submitting ? "Logging in…" : "Log In"}
        </button>

        {/* Continue with Google Button: Below green Log In, Above OR divider */}
        <button
          type="button"
          disabled={isBusy}
          onClick={handleGoogleLogin}
          className="w-full py-2.5 px-4 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-card-dark hover:bg-black/[0.03] dark:hover:bg-white/[0.05] text-ink dark:text-white font-medium text-sm transition-colors flex items-center justify-center gap-3 disabled:opacity-60 shadow-sm"
        >
          {googleSubmitting ? (
            <Loader2 size={16} className="animate-spin text-ink dark:text-white" />
          ) : (
            <GoogleIcon className="shrink-0" />
          )}
          <span>{googleSubmitting ? "Connecting to Google…" : "Continue with Google"}</span>
        </button>

        {/* Existing OR divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-black/10 dark:border-white/10" />
          </div>
          <span className="relative bg-white dark:bg-card-dark px-3 text-xs text-ink-muted">
            OR
          </span>
        </div>

        {/* Existing One-Click Demo Access Button */}
        <button
          type="button"
          disabled={isBusy}
          onClick={handleDemoLogin}
          className="w-full py-2.5 rounded-xl border border-primary/40 bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <span>⚡ One-Click Demo Access</span>
        </button>
      </form>
    </AuthShell>
  );
}
