"use client";

import { Children, cloneElement, isValidElement } from "react";
import { cn } from "@/lib/cn";

interface AnimatedListProps {
  /** Delay between successive items. */
  staggerMs?: number;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Staggered enter animation for a list, in CSS: each `AnimatedItem` gets an
 * `animation-delay` from its position. Reduced-motion users get the fade-only
 * keyframes defined in globals.css.
 */
export function AnimatedList({ staggerMs = 40, children, className, style }: AnimatedListProps) {
  let index = 0;
  const items = Children.map(children, (child) => {
    if (!isValidElement<AnimatedItemProps>(child) || child.type !== AnimatedItem) return child;
    return cloneElement(child, { delayMs: index++ * staggerMs });
  });

  return (
    <div className={className} style={style}>
      {items}
    </div>
  );
}

interface AnimatedItemProps {
  children: React.ReactNode;
  className?: string;
  /** Set by the parent list; override to position an item manually. */
  delayMs?: number;
}

export function AnimatedItem({ children, className, delayMs = 0 }: AnimatedItemProps) {
  return (
    <div
      className={cn("mr-fade-up", className)}
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
