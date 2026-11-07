import { flushSync } from "react-dom";

export type NavDirection = "forward" | "back" | "none";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Runs `commit` inside a CSS view transition when one is wanted and
 * available; otherwise runs it plainly. The direction is exposed on <html>
 * as `data-nav-dir` for the stylesheet to pick the slide direction.
 *
 * `commit` is flushed synchronously only inside a transition (where the
 * browser needs the DOM to be final when the callback returns); elsewhere a
 * normal update is fine and avoids flushSync inside React effects.
 */
export function withViewTransition(direction: NavDirection, commit: () => void): void {
  const canAnimate =
    direction !== "none" &&
    typeof document !== "undefined" &&
    typeof document.startViewTransition === "function" &&
    !document.hidden &&
    !prefersReducedMotion();

  if (!canAnimate) {
    commit();
    return;
  }

  document.documentElement.dataset.navDir = direction;
  const transition = document.startViewTransition(() => {
    flushSync(commit);
  });
  void transition.finished.finally(() => {
    delete document.documentElement.dataset.navDir;
  });
}
