"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface SparklesProps {
  children: React.ReactNode;
  className?: string;
  sparklesCount?: number;
  active?: boolean;
}

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
}

export function Sparkles({
  children,
  className,
  sparklesCount = 10,
  active = true,
}: SparklesProps) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    if (!active) {
      setSparkles([]);
      return;
    }

    const generateSparkles = () => {
      return Array.from({ length: sparklesCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 6 + 4,
        delay: Math.random() * 2,
      }));
    };

    setSparkles(generateSparkles());

    const interval = setInterval(() => {
      setSparkles(generateSparkles());
    }, 3000);

    return () => clearInterval(interval);
  }, [sparklesCount, active]);

  return (
    <div className={cn("relative inline-block", className)}>
      {children}
      <AnimatePresence>
        {sparkles.map((sparkle) => (
          <motion.span
            key={sparkle.id}
            className="pointer-events-none absolute inline-block"
            style={{
              left: `${sparkle.x}%`,
              top: `${sparkle.y}%`,
              width: sparkle.size,
              height: sparkle.size,
            }}
            initial={{ scale: 0, rotate: 0, opacity: 0 }}
            animate={{
              scale: [0, 1, 0],
              rotate: [0, 180],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1.5,
              delay: sparkle.delay,
              ease: "easeInOut",
            }}
          >
            <svg
              viewBox="0 0 160 160"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-full w-full"
            >
              <path
                d="M80 0C80 0 84.2846 41.2925 101.496 58.504C118.707 75.7154 160 80 160 80C160 80 118.707 84.2846 101.496 101.496C84.2846 118.707 80 160 80 160C80 160 75.7154 118.707 58.504 101.496C41.2925 84.2846 0 80 0 80C0 80 41.2925 75.7154 58.504 58.504C75.7154 41.2925 80 0 80 0Z"
                fill="#FFC700"
              />
            </svg>
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Confetti explosion for achievements
interface ConfettiProps {
  active: boolean;
  count?: number;
}

export function Confetti({ active, count = 50 }: ConfettiProps) {
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; color: string; delay: number }>
  >([]);

  useEffect(() => {
    if (active) {
      setParticles(
        Array.from({ length: count }, (_, i) => ({
          id: i,
          x: Math.random() * 100,
          color: ["#FFC700", "#FF0099", "#00D4FF", "#7C3AED", "#10B981"][
            Math.floor(Math.random() * 5)
          ],
          delay: Math.random() * 0.5,
        }))
      );

      const timeout = setTimeout(() => {
        setParticles([]);
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [active, count]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute h-3 w-3 rounded-full"
            style={{
              backgroundColor: particle.color,
              left: `${particle.x}%`,
              top: -20,
            }}
            initial={{ y: 0, rotate: 0, opacity: 1 }}
            animate={{
              y: window.innerHeight + 100,
              rotate: 360 * 3,
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: 3,
              delay: particle.delay,
              ease: "easeIn",
            }}
            exit={{ opacity: 0 }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
