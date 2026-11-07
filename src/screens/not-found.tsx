"use client";

import { LogoMark } from "@/components/logo-mark";
import { Button } from "@/components/ui/button";
import { navigate } from "@/lib/router/history";
import { routes } from "@/lib/router/routes";

export function NotFoundScreen({ pathname }: { pathname: string }) {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ background: "var(--mr-bg)", color: "var(--mr-text)" }}
    >
      <LogoMark size={40} />
      <h1 className="text-[20px] font-[600]" style={{ letterSpacing: "-0.02em" }}>
        Page not found
      </h1>
      <p className="max-w-[360px] text-[13px] break-all" style={{ color: "var(--mr-dim)" }}>
        Nothing lives at <span className="font-mono">{pathname}</span>.
      </p>
      <Button variant="primary" onClick={() => navigate(routes.landing(), { replace: true })}>
        Go home
      </Button>
    </div>
  );
}
