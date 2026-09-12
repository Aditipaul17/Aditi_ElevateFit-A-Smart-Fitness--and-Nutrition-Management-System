"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark flex flex-col">
      <header className="flex items-center justify-between px-6 lg:px-10 py-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-display font-bold text-sm">
            EF
          </span>
          <span className="font-display font-bold text-lg text-ink dark:text-white">
            ElevateFit
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="surface-card p-8">
            <h1 className="text-2xl font-display font-bold text-ink dark:text-white">
              {title}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>

            <div className="mt-6">{children}</div>
          </div>
          <p className="mt-6 text-center text-sm text-ink-muted">{footer}</p>
        </div>
      </main>
    </div>
  );
}
