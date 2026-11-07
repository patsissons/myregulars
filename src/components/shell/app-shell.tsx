"use client";

import { useEffect } from "react";
import { RouteView } from "@/components/shell/route-view";
import { initRouter } from "@/lib/router/history";
import { useRouterState } from "@/lib/router/use-route";

/**
 * Client root. Starts the in-app router on mount and renders whichever screen
 * the URL names. Until the router has read `location` (server render and the
 * first client frame) it shows a blank panel, which is also what keeps the
 * server HTML identical for every URL.
 */
export function AppShell() {
  useEffect(() => initRouter(), []);
  const routerState = useRouterState();

  if (!routerState) {
    return <div className="min-h-dvh" style={{ background: "var(--mr-bg)" }} aria-busy="true" />;
  }

  return <RouteView route={routerState.route} entryKey={routerState.key} />;
}
