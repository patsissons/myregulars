"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Info } from "lucide-react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastOptions {
  variant?: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, options?: ToastOptions) => void;
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
  message: string;
  variant: ToastVariant;
  visible: boolean;
}

const DURATION_MS: Record<ToastVariant, number> = {
  success: 2000,
  info: 2500,
  error: 4000,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    message: "",
    variant: "success",
    visible: false,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    const variant = options?.variant ?? "success";
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, variant, visible: true });
    timerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, DURATION_MS[variant]);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast message={toast.message} variant={toast.variant} visible={toast.visible} />
    </ToastContext.Provider>
  );
}

interface ToastProps {
  message: string;
  variant: ToastVariant;
  visible: boolean;
}

const ICONS: Record<ToastVariant, typeof Check> = {
  success: Check,
  error: AlertCircle,
  info: Info,
};

function Toast({ message, variant, visible }: ToastProps) {
  if (!visible) return null;

  const Icon = ICONS[variant];

  return (
    <div
      role="status"
      aria-live={variant === "error" ? "assertive" : "polite"}
      data-variant={variant}
      style={{
        position: "fixed",
        bottom: "calc(env(safe-area-inset-bottom) + 24px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        borderRadius: 999,
        background: variant === "error" ? "var(--mr-danger)" : "var(--mr-text)",
        color: variant === "error" ? "#ffffff" : "var(--mr-bg)",
        fontSize: 13,
        fontWeight: 500,
        boxShadow: "var(--shadow-mr-pop)",
        animation: "mrSlideUp 250ms cubic-bezier(.2,.7,.3,1) both",
        whiteSpace: "nowrap",
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <Icon size={14} style={{ flexShrink: 0 }} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{message}</span>
    </div>
  );
}
