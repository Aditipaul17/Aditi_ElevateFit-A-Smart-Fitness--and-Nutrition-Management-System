"use client";

import { Search, Bell } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Topbar({ placeholder = "Search workouts, trainers, or goals..." }: { placeholder?: string }) {
  return (
    <header className="flex items-center gap-4 px-6 lg:px-10 py-5 border-b border-black/5 dark:border-white/5 bg-surface/80 dark:bg-surface-dark/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="relative flex-1 max-w-md">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"
        />
        <input
          type="text"
          placeholder={placeholder}
          className="w-full rounded-full bg-white dark:bg-card-dark border border-black/5 dark:border-white/10 pl-10 pr-4 py-2.5 text-sm text-ink dark:text-white placeholder:text-ink-muted focus:border-primary outline-none transition-colors"
        />
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <button
          aria-label="Notifications"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-black/5 dark:border-white/10 bg-white dark:bg-card-dark text-ink dark:text-white hover:border-primary transition-colors"
        >
          <Bell size={18} />
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
