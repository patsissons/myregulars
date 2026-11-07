"use client";

import { useRef, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { formatLastSeen } from "@/lib/datastore/helpers";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/cn";

interface PersonRowProps {
  person: {
    id: string;
    name: string;
    detail: string;
    lastSeen?: string;
    photoUrl?: string;
  };
  onClick?: () => void;
  onLog?: () => void;
  isReadOnly?: boolean;
  className?: string;
}

/** Pointer travel (px) before we decide whether a gesture is a swipe or a scroll. */
const AXIS_LOCK_PX = 8;
/** Horizontal travel (px) needed to log a visit. */
const LOG_THRESHOLD_PX = 70;
const MAX_TRAVEL_PX = 180;

type Axis = "undecided" | "x" | "y";

export function PersonRow({ person, onClick, onLog, isReadOnly, className }: PersonRowProps) {
  const [logged, setLogged] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const startRef = useRef({ x: 0, y: 0 });
  const currentXRef = useRef(0);
  const axisRef = useRef<Axis>("undecided");
  const isDraggingRef = useRef(false);
  const hasLoggedRef = useRef(false);
  // A horizontal drag also fires a click on release; swallow that one click.
  const suppressClickRef = useRef(false);

  const prefersReduced = useReducedMotion();

  // Swipe stays available under reduced motion; only the spring is dropped.
  const canSwipe = !isReadOnly && !!onLog;

  function applyTranslate(x: number) {
    if (!rowRef.current) return;
    rowRef.current.style.transform = `translateX(${x}px)`;
    rowRef.current.style.transition = "none";
  }

  function snapBack() {
    if (!rowRef.current) return;
    rowRef.current.style.transition = prefersReduced ? "none" : "transform 300ms ease-out";
    rowRef.current.style.transform = "translateX(0)";
  }

  function handleDragStart(clientX: number, clientY: number) {
    if (!canSwipe) return;
    startRef.current = { x: clientX, y: clientY };
    currentXRef.current = 0;
    axisRef.current = "undecided";
    isDraggingRef.current = true;
    hasLoggedRef.current = false;
  }

  function handleDragMove(clientX: number, clientY: number) {
    if (!isDraggingRef.current || !canSwipe) return;

    const dx = clientX - startRef.current.x;
    const dy = clientY - startRef.current.y;

    if (axisRef.current === "undecided") {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LOCK_PX) return;
      axisRef.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (axisRef.current === "y") {
        // Vertical intent: this is a scroll, not a swipe.
        isDraggingRef.current = false;
        return;
      }
    }

    const delta = Math.max(0, Math.min(MAX_TRAVEL_PX, dx));
    currentXRef.current = delta;
    applyTranslate(delta);
  }

  function handleDragEnd() {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    if (axisRef.current === "x" && currentXRef.current > 0) {
      suppressClickRef.current = true;
    }

    if (currentXRef.current >= LOG_THRESHOLD_PX && !hasLoggedRef.current) {
      hasLoggedRef.current = true;
      onLog?.();
      setLogged(true);
      setTimeout(() => {
        setLogged(false);
        snapBack();
      }, 600);
    } else {
      snapBack();
    }
  }

  function handleClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onClick?.();
  }

  return (
    <div className="relative overflow-hidden">
      {/* Swipe track (shown behind row) */}
      {canSwipe && (
        <div
          className="absolute inset-y-0 left-0 flex items-center gap-2 px-4"
          style={{ background: "var(--mr-accent-soft)" }}
          aria-hidden="true"
        >
          <Check size={16} style={{ color: "var(--mr-accent)" }} />
          <span className="text-[12px] font-[500]" style={{ color: "var(--mr-accent)" }}>
            Swipe to log a visit
          </span>
        </div>
      )}

      {/* Main row */}
      <div
        ref={rowRef}
        className="relative"
        // pan-y lets the browser own vertical scrolling while we watch for
        // horizontal swipes; without it diagonal scrolls drag the row.
        style={{ background: "var(--mr-panel)", touchAction: canSwipe ? "pan-y" : undefined }}
        onTouchStart={(e) => handleDragStart(e.touches[0]!.clientX, e.touches[0]!.clientY)}
        onTouchMove={(e) => handleDragMove(e.touches[0]!.clientX, e.touches[0]!.clientY)}
        onTouchEnd={handleDragEnd}
        onTouchCancel={handleDragEnd}
        onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
        onMouseMove={(e) => isDraggingRef.current && handleDragMove(e.clientX, e.clientY)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        {logged ? (
          <div
            className="flex items-center gap-2 px-0 py-[10px]"
            style={{ color: "var(--mr-success)" }}
            role="status"
          >
            <Check size={14} style={{ flexShrink: 0 }} />
            <span className="text-[13px] font-[500]">Logged today</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleClick}
            className={cn(
              "flex w-full items-center gap-3 px-0 py-[10px] text-left transition-colors duration-100",
              "border-b last:border-b-0 hover:bg-black/[0.03] active:opacity-70 dark:hover:bg-white/[0.04]",
              className,
            )}
            style={{ borderColor: "var(--mr-edge)" }}
          >
            <Avatar name={person.name} size={36} photoUrl={person.photoUrl} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className="truncate text-[14px] font-[500]"
                  style={{ color: "var(--mr-text)", letterSpacing: "-0.01em" }}
                >
                  {person.name}
                </span>
                {person.lastSeen && (
                  <span className="flex-shrink-0 text-[11px]" style={{ color: "var(--mr-faint)" }}>
                    {formatLastSeen(person.lastSeen)}
                  </span>
                )}
              </div>
              <p className="truncate text-[13px]" style={{ color: "var(--mr-dim)" }}>
                {person.detail}
              </p>
            </div>
            <ChevronRight size={16} style={{ color: "var(--mr-faint)", flexShrink: 0 }} />
          </button>
        )}
      </div>
    </div>
  );
}
