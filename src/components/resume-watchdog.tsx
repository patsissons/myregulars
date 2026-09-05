"use client";

import { startTransition, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hardReload } from "@/lib/hard-reload";

const LONG_IDLE_MS = 5 * 60_000;
const RESUME_DEBOUNCE_MS = 1_000;
const STUCK_NAV_TIMEOUT_MS = 3_000;

/**
 * iOS Safari freezes background tabs and kills their network sockets. When a
 * tab resumes after a long idle, the router's segment cache is stale and the
 * next navigation (e.g. an edge-swipe back) fetches over a dead connection and
 * can hang — the URL changes but the old page stays on screen.
 *
 * Two recovery layers:
 * 1. On resume after a long idle, refresh the router to discard the stale
 *    cache over a fresh connection before the user navigates.
 * 2. If a back/forward traversal still hasn't committed shortly after the URL
 *    changed, hard-reload — automating the manual reload users otherwise need.
 */
export function ResumeWatchdog() {
  const router = useRouter();
  const pathname = usePathname();
  const lastHiddenAtRef = useRef<number | null>(null);
  const lastResumeHandledAtRef = useRef(0);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    function markHidden() {
      lastHiddenAtRef.current = Date.now();
    }

    function handleResume() {
      const hiddenAt = lastHiddenAtRef.current;
      if (hiddenAt === null) return;
      const now = Date.now();
      // Both pageshow and visibilitychange fire on resume; handle only one.
      if (now - lastResumeHandledAtRef.current < RESUME_DEBOUNCE_MS) return;
      if (now - hiddenAt < LONG_IDLE_MS) return;
      lastResumeHandledAtRef.current = now;
      lastHiddenAtRef.current = null;
      startTransition(() => {
        router.refresh();
      });
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        markHidden();
      } else {
        handleResume();
      }
    }

    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        handleResume();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", markHidden);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", markHidden);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [router]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    function onPopState() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (window.location.pathname !== pathnameRef.current) {
          hardReload();
        }
      }, STUCK_NAV_TIMEOUT_MS);
    }

    window.addEventListener("popstate", onPopState);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return null;
}
