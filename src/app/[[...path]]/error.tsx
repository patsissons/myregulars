"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ background: "var(--mr-bg)", color: "var(--mr-text)" }}
    >
      <p className="text-[16px] font-[600]">Something went wrong.</p>
      <p className="max-w-[420px] text-[13px]" style={{ color: "var(--mr-dim)" }}>
        {error.message || "The app hit an unexpected error."}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={reset}>
          Try again
        </Button>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    </div>
  );
}
