"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, Send, Paperclip, Mic, Image as ImageIcon, ThumbsUp, RefreshCw, History } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { Card } from "@/components/ui/Card";

const suggestedPrompts = [
  "Create a 20min HIIT workout",
  "Explain progressive overload",
  "Analyze my last session",
];

export default function AiCoachPage() {
  const [message, setMessage] = useState("");

  return (
    <>
      <Topbar placeholder="Search advice..." />
      <main className="px-6 lg:px-10 py-8 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <div className="space-y-5">
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary mb-3">
              Athlete Bio
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-muted">Current BMI</span>
                <span className="font-semibold text-ink dark:text-white">24.2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Body Fat %</span>
                <span className="font-semibold text-ink dark:text-white">14.5%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Target Goal</span>
                <span className="font-semibold text-accent">Hypertrophy</span>
              </div>
            </div>
          </Card>

          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-3">
              Recent Sessions
            </p>
            <div className="space-y-1">
              {["Post-HIIT Recovery", "Micronutrient Audit"].map((s) => (
                <button
                  key={s}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-ink-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-ink dark:hover:text-white transition-colors"
                >
                  <History size={14} /> {s}
                </button>
              ))}
              <button className="flex w-full items-center gap-2 rounded-lg bg-primary/10 text-primary px-2 py-2 text-sm font-medium">
                Active Coaching
              </button>
            </div>
          </Card>
        </div>

        <div className="flex flex-col h-[calc(100vh-8rem)]">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex gap-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot size={16} />
              </span>
              <Card className="max-w-2xl">
                <p className="text-sm text-ink dark:text-white leading-relaxed mb-4">
                  Here is a 30-minute upper &amp; core protocol designed to maximize metabolic stress while keeping your shoulders stable.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-black/5 dark:border-white/10 p-4">
                    <p className="text-sm font-semibold text-secondary mb-1">Block A: Density</p>
                    <p className="text-sm text-ink-muted">4 rounds of pike push-ups and hollow holds, 45s work / 15s rest.</p>
                  </div>
                  <div className="rounded-xl border border-black/5 dark:border-white/10 p-4">
                    <p className="text-sm font-semibold text-primary mb-1">Block B: Capacity</p>
                    <p className="text-sm text-ink-muted">EMOM 10 — odd minutes 15 shoulder taps, even minutes 10 burpees.</p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-accent/10 border border-accent/20 p-4 text-sm text-ink dark:text-white">
                  <span className="font-semibold text-accent">Coach&apos;s tip: </span>
                  Focus on vertical hip alignment during pike push-ups for maximum deltoid engagement.
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <button className="flex items-center gap-1.5 rounded-full border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs text-ink-muted hover:text-primary hover:border-primary transition-colors">
                    <ThumbsUp size={13} /> Helpful
                  </button>
                  <button className="flex items-center gap-1.5 rounded-full border border-black/10 dark:border-white/10 px-3 py-1.5 text-xs text-ink-muted hover:text-primary hover:border-primary transition-colors">
                    <RefreshCw size={13} /> Regenerate
                  </button>
                </div>
              </Card>
            </motion.div>
          </div>

          <div className="pt-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestedPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => setMessage(p)}
                  className="rounded-full border border-black/10 dark:border-white/10 px-4 py-2 text-xs font-medium text-ink-muted hover:border-primary hover:text-primary transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="surface-card flex items-end gap-2 p-3">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message your AI Coach..."
                rows={1}
                className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink dark:text-white placeholder:text-ink-muted outline-none"
              />
              <button className="p-2 text-ink-muted hover:text-primary transition-colors" aria-label="Attach file">
                <Paperclip size={17} />
              </button>
              <button className="p-2 text-ink-muted hover:text-primary transition-colors" aria-label="Voice input">
                <Mic size={17} />
              </button>
              <button className="p-2 text-ink-muted hover:text-primary transition-colors" aria-label="Attach image">
                <ImageIcon size={17} />
              </button>
              <button className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white hover:bg-secondary transition-colors" aria-label="Send message">
                <Send size={15} />
              </button>
            </div>
            <p className="text-center text-[11px] text-ink-muted mt-2">
              AI Coach can make mistakes. Verify critical performance advice.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
