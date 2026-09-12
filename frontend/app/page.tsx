"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BrainCircuit,
  ScanEye,
  Salad,
  LineChart,
  ArrowRight,
} from "lucide-react";
import { MarketingNav } from "@/components/MarketingNav";

const stats = [
  { value: "10M+", label: "Workouts Logged" },
  { value: "500K", label: "Active Members" },
  { value: "24/7", label: "Coaching Access" },
  { value: "99.9%", label: "Goal Achievement" },
];

const features = [
  {
    icon: BrainCircuit,
    title: "Adaptive AI Coaching",
    body: "Your program adjusts session to session, based on recovery, consistency, and how the last workout actually felt.",
    image:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=1200&auto=format&fit=crop",
  },
  {
    icon: ScanEye,
    title: "Real-Time Form Feedback",
    body: "Camera-based pose tracking catches technique issues early, so you build strength without building bad habits.",
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200&auto=format&fit=crop",
  },
  {
    icon: Salad,
    title: "Precision Nutrition",
    body: "Log meals in seconds and get macro breakdowns tuned to today's training load, not just a generic daily target.",
    image:
      "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=1200&auto=format&fit=crop",
  },
  {
    icon: LineChart,
    title: "Performance Analytics",
    body: "Every rep, every meal, every night of sleep — tracked and connected, so progress is something you can see.",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop",
  },
];

export default function LandingPage() {
  return (
    <div className="bg-surface dark:bg-surface-dark">
      <MarketingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary text-xs font-semibold px-4 py-2 mb-6">
              Smart Fitness &amp; Nutrition
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold leading-[1.1] text-ink dark:text-white">
              Train Smarter.<br />
              Eat <span className="text-primary">Better.</span><br />
              Live Healthier.
            </h1>
            <p className="mt-6 text-lg text-ink-muted max-w-md">
              ElevateFit combines adaptive coaching, precision nutrition, and real-time form feedback in one calm, focused platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/signup" className="btn-primary">
                Get Started <ArrowRight size={16} />
              </Link>
              <a href="#features" className="btn-secondary">
                Explore Features
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="relative"
          >
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-soft-lg">
              <Image
                src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop"
                alt="Athlete mid-training session"
                fill
                priority
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 surface-card px-5 py-4 hidden sm:flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10 text-secondary font-display font-bold">
                98%
              </span>
              <div className="text-sm">
                <p className="font-semibold text-ink dark:text-white">Form Accuracy</p>
                <p className="text-ink-muted text-xs">Pose Detection Model</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-black/5 dark:border-white/5 bg-white dark:bg-card-dark">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="text-center"
            >
              <p className="text-3xl lg:text-4xl font-display font-extrabold text-primary">
                {stat.value}
              </p>
              <p className="text-sm text-ink-muted mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 lg:px-10 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl lg:text-4xl font-display font-bold text-ink dark:text-white">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="text-ink-muted mt-4">
            Four capabilities working together, so your training, nutrition, and recovery stay in sync.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="surface-card overflow-hidden group"
            >
              <div className="relative h-48 w-full overflow-hidden">
                <Image
                  src={feature.image}
                  alt={feature.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
              <div className="p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-4 -mt-12 relative z-10 border-4 border-white dark:border-card-dark">
                  <feature.icon size={18} />
                </span>
                <h3 className="font-display font-semibold text-lg text-ink dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-ink-muted leading-relaxed">{feature.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-3xl bg-primary text-white px-8 py-16 text-center relative overflow-hidden"
        >
          <h2 className="text-3xl lg:text-4xl font-display font-bold relative z-10">
            Your next personal best starts today
          </h2>
          <p className="mt-4 text-white/80 max-w-xl mx-auto relative z-10">
            Join athletes who train with a coach that actually adapts to them.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white text-primary font-semibold px-7 py-3 relative z-10 hover:bg-surface transition-colors"
          >
            Get Started Free <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/5 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 grid sm:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-display font-bold text-sm">
                EF
              </span>
              <span className="font-display font-bold text-ink dark:text-white">ElevateFit</span>
            </div>
            <p className="text-sm text-ink-muted">
              A calmer, more intelligent way to train, eat, and recover.
            </p>
          </div>
          {[
            { title: "Platform", links: ["AI Coaching", "Pose Tracking", "Nutrition", "Dashboard"] },
            { title: "Resources", links: ["Science & Tech", "Success Stories", "Blog", "Documentation"] },
            { title: "Support", links: ["Help Center", "Privacy Policy", "Terms of Service", "Accessibility"] },
          ].map((col) => (
            <div key={col.title}>
              <p className="font-semibold text-sm text-ink dark:text-white mb-3">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-ink-muted hover:text-primary transition-colors">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 border-t border-black/5 dark:border-white/5 text-xs text-ink-muted">
          © 2026 ElevateFit. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
