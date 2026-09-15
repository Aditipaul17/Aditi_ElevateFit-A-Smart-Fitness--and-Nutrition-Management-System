"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Award, Zap, Trophy, X } from "lucide-react";

export type GamificationToastItem = {
  id: string;
  type: "xp" | "level" | "badge";
  title: string;
  description?: string;
};

export function GamificationToastBanner({
  toast,
  onClose,
}: {
  toast: GamificationToastItem | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="fixed top-5 right-5 z-50 flex items-center gap-3 rounded-2xl bg-card-dark text-white p-4 shadow-2xl border border-primary/40 min-w-[300px] max-w-md"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-white font-bold shadow-md">
            {toast.type === "xp" && <Zap size={22} className="text-yellow-300" />}
            {toast.type === "level" && <Trophy size={22} className="text-yellow-300" />}
            {toast.type === "badge" && <Award size={22} className="text-yellow-300" />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white leading-tight">
              {toast.title}
            </h4>
            {toast.description && (
              <p className="text-xs text-white/80 mt-0.5 truncate">
                {toast.description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
