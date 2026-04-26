"use client";

import { useRef, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { formatLastSeen } from "@/lib/datastore/helpers";
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

export function PersonRow({ person, onClick, onLog, isReadOnly, className }: PersonRowProps) {
  const [logged, setLogged] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const hasLoggedRef = useRef(false);

  // Check prefers-reduced-motion
  const prefersReduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canSwipe = !isReadOnly && !prefersReduced && !!onLog;

  function applyTranslate(x: number) {
    if (!rowRef.current) return;
    rowRef.current.style.transform = `translateX(${x}px)`;
    rowRef.current.style.transition = "none";
  }

  function snapBack() {
    if (!rowRef.current) return;
    rowRef.current.style.transition = "transform 300ms ease-out";
    rowRef.current.style.transform = "translateX(0)";
  }

  function handleDragStart(clientX: number) {
    if (!canSwipe) return;
    startXRef.current = clientX;
    currentXRef.current = 0;
    isDraggingRef.current = true;
    hasLoggedRef.current = false;
  }

  function handleDragMove(clientX: number) {
    if (!isDraggingRef.current || !canSwipe) return;
    const delta = Math.max(0, Math.min(120, clientX - startXRef.current));
    currentXRef.current = delta;
    applyTranslate(delta);
  }

  function handleDragEnd() {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    if (currentXRef.current >= 70 && !hasLoggedRef.current) {
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

  return (
    <div className="relative overflow-hidden">
      {/* Swipe track (shown behind row) */}
      {canSwipe && (
        <div
          className="absolute inset-y-0 left-0 flex items-center gap-2 px-4"
          style={{ background: "var(--mr-accent-soft)" }}
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
        style={{ background: "var(--mr-panel)" }}
        onTouchStart={(e) => handleDragStart(e.touches[0]!.clientX)}
        onTouchMove={(e) => handleDragMove(e.touches[0]!.clientX)}
        onTouchEnd={handleDragEnd}
        onMouseDown={(e) => handleDragStart(e.clientX)}
        onMouseMove={(e) => isDraggingRef.current && handleDragMove(e.clientX)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        {logged ? (
          <div
            className="flex items-center gap-2 px-0 py-[10px]"
            style={{ color: "var(--mr-success)" }}
          >
            <Check size={14} style={{ flexShrink: 0 }} />
            <span className="text-[13px] font-[500]">Logged today</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClick}
            className={cn(
              "flex w-full items-center gap-3 px-0 py-[10px] text-left transition-colors duration-100",
              "border-b last:border-b-0 active:opacity-70",
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
