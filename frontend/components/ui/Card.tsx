import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "surface-card p-6 transition-shadow duration-300 hover:shadow-soft-lg",
        className
      )}
      {...props}
    />
  );
}
