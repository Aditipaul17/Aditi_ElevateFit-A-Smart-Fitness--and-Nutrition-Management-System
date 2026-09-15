"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { fetchGamification, GamificationData } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Card } from "@/components/ui/Card";
import { Award, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function GamificationPage() {
  const { token } = useAuth();
  const [data, setData] = useState<GamificationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    fetchGamification(token)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-surface dark:bg-surface-dark min-h-screen">
        <Topbar placeholder="Search gamification..." />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
           <div className="max-w-5xl mx-auto space-y-6">
              <div className="h-40 w-full animate-pulse rounded-3xl bg-black/5 dark:bg-white/5" />
              <div className="h-64 w-full animate-pulse rounded-3xl bg-black/5 dark:bg-white/5" />
           </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-surface dark:bg-surface-dark min-h-screen">
        <Topbar placeholder="Search gamification..." />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 flex items-center justify-center">
           <Card className="p-6 text-center border-error/20 bg-error/5">
             <p className="text-error font-semibold">{error}</p>
             <button 
               onClick={() => window.location.reload()} 
               className="mt-4 btn-primary bg-error hover:bg-error/90"
             >
               Try Again
             </button>
           </Card>
        </main>
      </div>
    );
  }

  if (!data) return null;

  const isNewUser = data.total_xp === 0 && data.current_streak === 0 && data.badges_earned_count === 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface dark:bg-surface-dark min-h-screen">
      <Topbar placeholder="Search gamification..." />
      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-up">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-display font-bold text-ink dark:text-white flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-bold text-lg shadow-sm">
                <Sparkles size={20} />
              </span>
              Gamification
            </h1>
            <p className="text-ink-muted mt-2">
              Earn XP, build streaks, and unlock badges as you train.
            </p>
          </div>

          {isNewUser && (
            <Card className="p-6 bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
              <div className="flex flex-col items-center text-center space-y-4 py-4">
                <div className="h-16 w-16 rounded-full bg-accent/20 text-accent flex items-center justify-center text-3xl">
                  👋
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-ink dark:text-white">Welcome to Gamification!</h3>
                  <p className="text-ink-muted max-w-md mx-auto mt-2 leading-relaxed">
                    You currently have 0 XP and are at Level 1 with 0 streaks. Complete your first workout to start earning XP and unlocking badges!
                  </p>
                </div>
                <Link href="/workouts" className="btn-primary mt-4 font-semibold px-6 py-3">
                  Start Your First Workout
                </Link>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
             {/* XP & Level (takes 7 cols) */}
             <Card className="md:col-span-7 p-8 border-primary/20 bg-gradient-to-br from-white via-primary/[0.03] to-secondary/[0.06] dark:from-card-dark dark:via-card-dark dark:to-primary/10 flex flex-col justify-center">
                <div className="flex justify-between items-start mb-10">
                   <div>
                     <p className="text-sm font-semibold uppercase tracking-wider text-primary">Total XP</p>
                     <p className="text-5xl font-display font-bold text-ink dark:text-white mt-2 flex items-center gap-3">
                       {data.total_xp} <span className="text-3xl">⭐</span>
                     </p>
                   </div>
                   <div className="text-right">
                     <span className="inline-flex items-center justify-center px-5 py-2.5 rounded-2xl bg-primary text-white font-bold shadow-md shadow-primary/20">
                       Level {data.level}
                     </span>
                   </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm font-semibold mb-3">
                    <span className="text-ink-muted">Progress to Level {data.level + 1}</span>
                    <span className="text-primary font-bold">{data.xp_needed_for_next} XP left</span>
                  </div>
                  <div className="h-4 w-full rounded-full bg-black/5 dark:bg-white/5 overflow-hidden p-0.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${data.progress_pct}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-primary to-secondary shadow-sm"
                    />
                  </div>
                </div>
             </Card>

             {/* Streaks (takes 5 cols) */}
             <div className="md:col-span-5 grid grid-cols-1 gap-6">
                <Card className="p-6 flex items-center gap-5 border-orange-500/10 bg-gradient-to-br from-white to-orange-500/5 dark:from-card-dark dark:to-orange-500/10">
                   <div className="h-16 w-16 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center text-3xl shadow-sm">
                     🔥
                   </div>
                   <div>
                     <p className="text-sm font-semibold uppercase tracking-wider text-ink-muted mb-1">Current Streak</p>
                     <p className="text-4xl font-display font-bold text-ink dark:text-white leading-none">
                       {data.current_streak} <span className="text-lg font-medium text-ink-muted ml-1">Days</span>
                     </p>
                   </div>
                </Card>

                <Card className="p-6 flex items-center gap-5 border-accent/10 bg-gradient-to-br from-white to-accent/5 dark:from-card-dark dark:to-accent/10">
                   <div className="h-16 w-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center text-3xl shadow-sm">
                     🏆
                   </div>
                   <div>
                     <p className="text-sm font-semibold uppercase tracking-wider text-ink-muted mb-1">Longest Streak</p>
                     <p className="text-4xl font-display font-bold text-ink dark:text-white leading-none">
                       {data.longest_streak} <span className="text-lg font-medium text-ink-muted ml-1">Days</span>
                     </p>
                   </div>
                </Card>
             </div>
          </div>

          {/* Badges */}
          <div className="pt-6">
             <div className="flex items-center justify-between mb-6">
               <h2 className="text-2xl font-display font-bold text-ink dark:text-white flex items-center gap-3">
                 <Award className="text-accent" size={28} />
                 Badges Unlocked
               </h2>
               <span className="bg-accent/10 text-accent px-4 py-1.5 rounded-full text-sm font-bold border border-accent/20">
                 {data.badges_earned_count} / {data.total_badges_count}
               </span>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
               {data.badges.map((badge, i) => (
                 <motion.div
                   key={badge.id}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: i * 0.1, duration: 0.5 }}
                 >
                   <Card 
                     className={cn(
                       "h-full p-6 text-center flex flex-col items-center transition-all duration-300",
                       badge.unlocked 
                         ? "bg-white dark:bg-card-dark border-primary/20 shadow-soft hover:shadow-soft-lg hover:-translate-y-1" 
                         : "opacity-60 grayscale bg-black/5 dark:bg-white/5 border-transparent"
                     )}
                   >
                     <div className={cn(
                       "h-20 w-20 rounded-2xl flex items-center justify-center text-4xl mb-5 shadow-sm",
                       badge.unlocked 
                         ? "bg-gradient-to-br from-primary/10 to-secondary/10 text-primary border border-primary/10" 
                         : "bg-black/10 dark:bg-white/10"
                     )}>
                       {badge.icon}
                     </div>
                     <h3 className="font-bold text-ink dark:text-white text-lg mb-2">{badge.name}</h3>
                     <p className="text-sm text-ink-muted leading-relaxed mb-4 flex-1">{badge.description}</p>
                     
                     {badge.unlocked ? (
                       <div className="mt-auto w-full pt-3 border-t border-black/5 dark:border-white/5">
                         <span className="text-xs uppercase font-bold text-primary tracking-wider">
                           Unlocked
                         </span>
                       </div>
                     ) : (
                       <div className="mt-auto w-full pt-3 border-t border-black/5 dark:border-white/5">
                         <span className="text-xs uppercase font-bold text-ink-muted tracking-wider">
                           Locked
                         </span>
                       </div>
                     )}
                   </Card>
                 </motion.div>
               ))}
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}
