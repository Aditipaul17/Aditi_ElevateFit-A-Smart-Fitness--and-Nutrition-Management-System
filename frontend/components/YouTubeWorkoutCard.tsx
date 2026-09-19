"use client";

import { useState } from "react";
import { Play, Sparkles, ExternalLink, Clock, Tv, X } from "lucide-react";
import { Card } from "@/components/ui/Card";

export type YouTubeWorkoutVideoItem = {
  video_id: string;
  title: string;
  channel_title: string;
  thumbnail_url: string;
  duration: string;
  video_url: string;
  recommendation_reason: string;
};


interface YouTubeWorkoutCardProps {
  video: YouTubeWorkoutVideoItem;
}

export function YouTubeWorkoutCard({ video }: YouTubeWorkoutCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <>
      <Card className="group flex flex-col justify-between overflow-hidden !p-0 transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:-translate-y-1">
        <div>
          {/* Thumbnail Container */}
          <div className="relative aspect-video w-full overflow-hidden bg-black/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />

            {/* Play Button Overlay */}
            <button
              onClick={() => setIsPlaying(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] opacity-90 group-hover:opacity-100 transition-opacity"
              title="Play Video"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/40 transition-transform group-hover:scale-110">
                <Play size={20} className="ml-1 fill-white" />
              </span>
            </button>

            {/* Duration Badge */}
            <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-md bg-black/80 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
              <Clock size={12} className="text-primary" />
              {video.duration}
            </span>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Match Reason Tag */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary border border-primary/20">
              <Sparkles size={12} className="shrink-0" />
              <span className="line-clamp-1">{video.recommendation_reason}</span>
            </div>

            {/* Title */}
            <h3 className="font-display font-semibold text-ink dark:text-white text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {video.title}
            </h3>

            {/* Channel Title */}
            <div className="flex items-center gap-1.5 text-xs text-ink-muted">
              <Tv size={14} className="shrink-0 text-ink-muted/70" />
              <span className="font-medium truncate">{video.channel_title}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 pt-0 flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(true)}
            className="flex-1 btn-primary text-xs !py-2.5 flex items-center justify-center gap-1.5 font-semibold"
          >
            <Play size={14} className="fill-white" /> Watch Video
          </button>
          <a
            href={video.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-black/10 dark:border-white/10 bg-white/5 p-2.5 text-ink-muted hover:text-ink dark:hover:text-white hover:border-primary transition-colors"
            title="Open in YouTube"
          >
            <ExternalLink size={15} />
          </a>
        </div>
      </Card>

      {/* Video Modal Player */}
      {isPlaying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-surface-dark border-b border-white/10">
              <div className="flex items-center gap-2 max-w-[80%]">
                <Sparkles size={16} className="text-primary shrink-0" />
                <span className="text-sm font-semibold text-white truncate">{video.title}</span>
              </div>
              <button
                onClick={() => setIsPlaying(false)}
                className="rounded-full p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Embed Video Iframe */}
            <div className="relative aspect-video w-full">
              <iframe
                src={`https://www.youtube.com/embed/${video.video_id}?autoplay=1`}
                title={video.title}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
