"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Dumbbell,
  UtensilsCrossed,
  BotMessageSquare,
  LineChart,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/nutrition", label: "Nutrition", icon: UtensilsCrossed },
  { href: "/ai-coach", label: "AI Coach", icon: BotMessageSquare },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-card-dark/95 backdrop-blur-md border-t border-black/10 dark:border-white/10 px-2 py-2">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-medium transition-colors min-w-[54px]",
                active
                  ? "text-primary bg-primary/10 dark:bg-primary/20 font-semibold"
                  : "text-ink-muted hover:text-ink dark:hover:text-white"
              )}
            >
              <Icon size={18} />
              <span className="truncate max-w-[58px]">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
