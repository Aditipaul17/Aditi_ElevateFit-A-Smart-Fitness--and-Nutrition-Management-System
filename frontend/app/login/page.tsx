"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { useAuth } from "@/lib/AuthContext";
import { ApiError, getErrorMessage } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login, signup, isAuthenticated, isLoading: sessionLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      setError(getErrorMessage(err, "Invalid email or password."));
    } finally {
      setSubmitting(false);
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
            className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-4 py-2.5 text-sm text-ink dark:text-white placeholder:text-ink-muted focus:border-primary outline-none transition-colors"
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
            className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-4 py-2.5 text-sm text-ink dark:text-white placeholder:text-ink-muted focus:border-primary outline-none transition-colors"
          />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
          {submitting ? "Logging in…" : "Log In"}
        </button>

        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-black/10 dark:border-white/10" />
          </div>
          <span className="relative bg-white dark:bg-card-dark px-3 text-xs text-ink-muted">
            OR
          </span>
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={handleDemoLogin}
          className="w-full py-2.5 rounded-xl border border-primary/40 bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
        >
          <span>⚡ One-Click Demo Access</span>
        </button>
      </form>
    </AuthShell>
  );
}
