"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { useAuth } from "@/lib/AuthContext";
import { ApiError } from "@/lib/api";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const router = useRouter();
  const { signup, isAuthenticated, isLoading: sessionLoading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [sessionLoading, isAuthenticated, router]);

  function validate(): string | null {
    if (!name.trim() || name.trim().length < 2) {
      return "Please enter your full name.";
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      return "Please enter a valid email address.";
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters long.";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await signup(name.trim(), email.trim(), password, confirmPassword);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start training smarter with ElevateFit."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Log in
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
          <label htmlFor="name" className="block text-sm font-medium text-ink dark:text-white mb-1.5">
            Name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Rivera"
            className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-4 py-2.5 text-sm text-ink dark:text-white placeholder:text-ink-muted focus:border-primary outline-none transition-colors"
          />
        </div>

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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-4 py-2.5 text-sm text-ink dark:text-white placeholder:text-ink-muted focus:border-primary outline-none transition-colors"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink dark:text-white mb-1.5">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-4 py-2.5 text-sm text-ink dark:text-white placeholder:text-ink-muted focus:border-primary outline-none transition-colors"
          />
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
          {submitting ? "Creating account…" : "Create Account"}
        </button>
      </form>
    </AuthShell>
  );
}
