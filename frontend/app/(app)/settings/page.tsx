"use client";

import { Topbar } from "@/components/Topbar";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/ThemeToggle";

const rows = [
  { label: "Notifications", desc: "Workout reminders, meal reminders, and achievements" },
  { label: "Privacy", desc: "Control what's visible to your friends and the community" },
  { label: "Language", desc: "English (United States)" },
  { label: "Connected Devices", desc: "Manage synced wearables and apps" },
  { label: "Export Data", desc: "Download a copy of your training and nutrition history" },
];

export default function SettingsPage() {
  return (
    <>
      <Topbar placeholder="Search settings..." />
      <main className="px-6 lg:px-10 py-8 space-y-6 max-w-3xl">
        <h1 className="text-3xl font-display font-bold text-ink dark:text-white">Settings</h1>

        <Card className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-ink dark:text-white">Dark Mode</p>
            <p className="text-sm text-ink-muted">Switch between light and dark themes</p>
          </div>
          <ThemeToggle />
        </Card>

        <Card className="divide-y divide-black/5 dark:divide-white/5 !p-0">
          {rows.map((row) => (
            <button
              key={row.label}
              className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-black/[0.02] dark:hover:bg-white/5 transition-colors"
            >
              <div>
                <p className="font-medium text-ink dark:text-white">{row.label}</p>
                <p className="text-sm text-ink-muted">{row.desc}</p>
              </div>
            </button>
          ))}
        </Card>

        <button className="text-error text-sm font-semibold hover:underline">
          Log Out
        </button>
      </main>
    </>
  );
}
