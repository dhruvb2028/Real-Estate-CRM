"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * CSS-driven motion primitives.
 *
 * These deliberately avoid framer-motion so it stays out of the shared bundle
 * (~50 kB gzipped) — it is only loaded on the pipeline board, where real
 * layout animation is worth the weight. Everything here is compositor-only
 * (transform/opacity) and honours prefers-reduced-motion via globals.css.
 */

/** Fade + rise entrance for a single block. */
export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("animate-rise-in", className)}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * Staggered entrance for lists/grids. Children rise one after another using
 * nth-child animation delays — no JS orchestration required.
 */
export function Stagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  /** Kept for API compatibility; cadence is defined in CSS. */
  stagger?: number;
}) {
  return <div className={cn("stagger-children", className)}>{children}</div>;
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

/** Count-up number for stat tiles — starts when scrolled into view. */
export function AnimatedNumber({
  value,
  className,
  duration = 0.9,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || value === 0) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / (duration * 1000));
        setDisplay(Math.round(value * (1 - Math.pow(1 - t, 3))));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          run();
          observer.disconnect();
        }
      },
      { rootMargin: "-40px" }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {display.toLocaleString("en-IN")}
    </span>
  );
}

/** Press-scale wrapper for tap targets. */
export function Pressable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("press-scale", className)}>{children}</div>;
}
