"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Clock, Flame, Bookmark } from "lucide-react";
import { Workout } from "@/lib/data";

export function WorkoutCard({ workout, index = 0 }: { workout: Workout; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="surface-card overflow-hidden group cursor-pointer"
    >
      <div className="relative h-40 w-full overflow-hidden">
        <Image
          src={workout.image}
          alt={workout.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute top-3 left-3 rounded-full bg-black/60 backdrop-blur-sm text-white text-[11px] font-semibold px-3 py-1 uppercase tracking-wide">
          {workout.category}
        </span>
        <button
          aria-label="Save workout"
          className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink hover:text-primary transition-colors"
        >
          <Bookmark size={14} />
        </button>
      </div>
      <div className="p-5">
        <h3 className="font-display font-semibold text-ink dark:text-white leading-snug mb-2">
          {workout.title}
        </h3>
        <div className="flex items-center gap-4 text-xs text-ink-muted mb-1">
          <span className="flex items-center gap-1"><Clock size={13} /> {workout.duration}</span>
          <span>{workout.difficulty}</span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="flex items-center gap-1 text-sm font-semibold text-primary">
            <Flame size={14} /> {workout.calories} kcal
          </span>
          <span className="text-xs text-ink-muted">{workout.trainer}</span>
        </div>
      </div>
    </motion.div>
  );
}
