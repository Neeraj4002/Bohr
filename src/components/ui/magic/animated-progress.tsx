"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface AnimatedProgressProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "gradient" | "glow" | "success";
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
    gradient: "bg-gradient-to-r from-primary via-teal-400 to-success",
    glow: "bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.5)]",
    success: "bg-success",
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
            <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-primary/50 to-teal-400/50" />
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
