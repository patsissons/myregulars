"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { navigate, type NavigateOptions } from "@/lib/router/history";
import { href, type Route } from "@/lib/router/routes";

interface AppLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  route: Route;
  replace?: boolean;
  transition?: NavigateOptions["transition"];
}

/**
 * A real anchor (right-click, middle-click, long-press previews all work)
 * whose plain left-click navigates in-app without a page load.
 */
export function AppLink({ route, replace, transition, onClick, target, ...rest }: AppLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (target && target !== "_self") return;

    event.preventDefault();
    navigate(route, { replace, transition });
  }

  return <a {...rest} href={href(route)} target={target} onClick={handleClick} />;
}
