"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#testimonials", label: "Stories" },
];

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-20 bg-surface/80 dark:bg-surface-dark/80 backdrop-blur-md border-b border-black/5 dark:border-white/5">
      <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-10 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-display font-bold text-sm">
            EF
          </span>
          <span className="font-display font-bold text-lg text-ink dark:text-white">
            ElevateFit
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-ink-muted hover:text-primary transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/dashboard" className="btn-primary !px-5 !py-2.5 text-sm">
            Get Started
          </Link>
        </div>
      </nav>
    </header>
  );
}
