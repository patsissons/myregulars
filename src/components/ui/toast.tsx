"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Info } from "lucide-react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  variant?: ToastVariant;
  /** An inline button (Undo, Retry). Toasts with an action stay up longer. */
  action?: ToastAction;
  durationMs?: number;
}

interface ToastContextValue {
  showToast: (message: string, options?: ToastOptions) => void;
  dismissToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

/**
 * Like `useToast`, but returns null outside a provider. For hooks/providers
 * that are also rendered in environments without a ToastProvider (tests).
 */
export function useOptionalToast(): ToastContextValue | null {
  return useContext(ToastContext);
}

interface ToastState {
  id: number;
  message: string;
  variant: ToastVariant;
  action: ToastAction | null;
  /** Extra bottom offset so the toast clears a floating action button. */
  lift: number;
  visible: boolean;
}

const DURATION_MS: Record<ToastVariant, number> = {
  success: 2000,
  info: 2500,
  error: 4000,
};
const ACTION_DURATION_MS = 5000;
const BASE_OFFSET_PX = 24;

/**
 * Pixels to lift the toast so it clears a floating action button. Screens
 * mark their FAB with `data-fab`; without one the toast sits at the base.
 */
function fabClearance(): number {
  if (typeof document === "undefined") return 0;
  const fab = document.querySelector<HTMLElement>("[data-fab]");
  if (!fab) return 0;
  const rect = fab.getBoundingClientRect();
  if (rect.height === 0) return 0;
  return Math.max(0, window.innerHeight - rect.top - BASE_OFFSET_PX + 12);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    id: 0,
    message: "",
    variant: "success",
    action: null,
    lift: 0,
    visible: false,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    const variant = options?.variant ?? "success";
    const action = options?.action ?? null;
    if (timerRef.current) clearTimeout(timerRef.current);
    const lift = fabClearance();
    setToast((prev) => ({ id: prev.id + 1, message, variant, action, lift, visible: true }));
    const duration = options?.durationMs ?? (action ? ACTION_DURATION_MS : DURATION_MS[variant]);
    timerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, duration);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <Toast
        key={toast.id}
        message={toast.message}
        variant={toast.variant}
        action={toast.action}
        lift={toast.lift}
        visible={toast.visible}
        onAction={() => {
          toast.action?.onClick();
          dismissToast();
        }}
      />
    </ToastContext.Provider>
  );
}

interface ToastProps {
  message: string;
  variant: ToastVariant;
  action: ToastAction | null;
  lift: number;
  visible: boolean;
  onAction: () => void;
}

const ICONS: Record<ToastVariant, typeof Check> = {
  success: Check,
  error: AlertCircle,
  info: Info,
};

function Toast({ message, variant, action, lift, visible, onAction }: ToastProps) {
  if (!visible) return null;

  const Icon = ICONS[variant];
  const isError = variant === "error";

  return (
    <div
      role="status"
      aria-live={isError ? "assertive" : "polite"}
      data-variant={variant}
      className="fixed left-1/2 z-[9999] flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2 rounded-full py-2.5 pr-2.5 pl-4 text-[13px] font-medium whitespace-nowrap"
      style={{
        bottom: `calc(env(safe-area-inset-bottom) + ${BASE_OFFSET_PX + lift}px)`,
        background: isError ? "var(--mr-danger)" : "var(--mr-text)",
        color: isError ? "#ffffff" : "var(--mr-bg)",
        boxShadow: "var(--shadow-mr-pop)",
        animation: "mrSlideUp 250ms cubic-bezier(.2,.7,.3,1) both",
        paddingRight: action ? undefined : 16,
      }}
    >
      <Icon size={14} aria-hidden="true" className="shrink-0" />
      <span className="overflow-hidden text-ellipsis">{message}</span>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="ml-1 shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold transition-colors"
          style={{
            background: isError ? "rgba(255,255,255,0.18)" : "var(--mr-accent)",
            color: isError ? "#ffffff" : "var(--mr-accent-text)",
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
