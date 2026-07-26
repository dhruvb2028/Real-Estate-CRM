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

/**
 * Count-up number for stat tiles.
 *
 * Correctness first: the real figure is rendered immediately (and server-side),
 * so a client never sees a wrong number even if JavaScript is slow, blocked, or
 * the animation is skipped. The count-up is applied on top as decoration only.
 */
export function AnimatedNumber({
  value,
  className,
  duration = 0.9,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  // Start at the true value — never at 0.
  const [display, setDisplay] = useState(value);
  const animated = useRef(false);

  useEffect(() => {
    // Keep the displayed figure in sync when data refreshes.
    setDisplay(value);

    // Animate once per mount, and never for zero (nothing to count).
    if (animated.current || value === 0) return;
    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    animated.current = true;

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      setDisplay(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value); // guarantee we land exactly on the real figure
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span className={cn("tabular-nums", className)}>
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
