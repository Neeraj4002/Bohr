"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface AnimatedProgressProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "gradient" | "glow";
}

export function AnimatedProgress({
  value,
  max = 100,
  className,
  showLabel = false,
  size = "md",
  variant = "default",
}: AnimatedProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  const variantClasses = {
    default: "bg-primary",
    gradient: "bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500",
    glow: "bg-primary shadow-[0_0_10px_rgba(168,85,247,0.5)]",
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-muted",
          sizeClasses[size]
        )}
      >
        <motion.div
          className={cn(
            "h-full rounded-full",
            variantClasses[variant]
          )}
          initial={false}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: 0.5,
            ease: "easeOut",
          }}
        />
        {variant === "glow" && (
          <motion.div
            className="absolute inset-0 rounded-full"
            initial={false}
            animate={{ width: `${percentage}%`, opacity: 1 }}
            transition={{
              duration: 0.5,
              ease: "easeOut",
            }}
          >
            <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-violet-400/50 to-purple-500/50" />
          </motion.div>
        )}
      </div>
      {showLabel && (
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {percentage.toFixed(1)}%
        </p>
      )}
    </div>
  );
}
