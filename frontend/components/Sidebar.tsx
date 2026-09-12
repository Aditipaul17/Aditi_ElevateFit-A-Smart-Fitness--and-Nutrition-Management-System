"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Dumbbell,
  UtensilsCrossed,
  BotMessageSquare,
  LineChart,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/nutrition", label: "Nutrition", icon: UtensilsCrossed },
  { href: "/ai-coach", label: "AI Coach", icon: BotMessageSquare },
  { href: "/analytics", label: "Analytics", icon: LineChart },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const displayName = user?.name ?? "Athlete";

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <aside className="hidden lg:flex lg:flex-col lg:justify-between w-64 shrink-0 border-r border-black/5 dark:border-white/5 bg-white dark:bg-card-dark px-5 py-8 min-h-screen sticky top-0">
      <div>
        <Link href="/dashboard" className="flex items-center gap-2 px-2 mb-10">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white font-display font-bold text-sm">
            EF
          </span>
          <div className="leading-tight">
            <p className="font-display font-bold text-lg text-ink dark:text-white">
              ElevateFit
            </p>
            <p className="text-[11px] tracking-wide uppercase text-ink-muted">
              Elite Performance
            </p>
          </div>
        </Link>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary dark:bg-primary/20"
                    : "text-ink-muted hover:bg-black/[0.03] dark:hover:bg-white/5 hover:text-ink dark:hover:text-white"
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-4">
        <Link href="#" className="btn-primary w-full">
          Upgrade to Pro
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 text-sm text-ink-muted hover:text-ink dark:hover:text-white transition-colors"
        >
          <Settings size={18} />
          Settings
        </Link>
        <div className="flex items-center gap-3 border-t border-black/5 dark:border-white/5 pt-4 px-1">
          <div className="h-9 w-9 rounded-full bg-secondary/20 flex items-center justify-center font-display font-semibold text-secondary text-sm shrink-0">
            {getInitials(displayName)}
          </div>
          <div className="leading-tight min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink dark:text-white truncate">
              {displayName}
            </p>
            <p className="text-xs text-secondary font-medium truncate">
              {user?.email ?? "Elite Member"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Log out"
            onClick={handleLogout}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:text-error hover:bg-error/10 transition-colors shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
