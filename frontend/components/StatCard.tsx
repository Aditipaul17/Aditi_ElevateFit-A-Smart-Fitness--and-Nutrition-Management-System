"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function StatCard({
  icon: Icon,
  value,
  label,
  accent = "primary",
  suffix,
  delay = 0,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  accent?: "primary" | "accent" | "secondary";
  suffix?: string;
  delay?: number;
}) {
  const accentClasses = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/15 text-accent",
    secondary: "bg-secondary/10 text-secondary",
  }[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="flex flex-col gap-4">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full ${accentClasses}`}
        >
          <Icon size={18} />
        </span>
        <div>
          <p className="text-2xl font-display font-bold text-ink dark:text-white">
            {value}
            {suffix && (
              <span className="ml-1 text-sm font-medium text-ink-muted">
                {suffix}
              </span>
            )}
          </p>
          <p className="text-sm text-ink-muted">{label}</p>
        </div>
      </Card>
    </motion.div>
  );
}
