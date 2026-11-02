"use client";

import { cloneElement, useEffect, useId, useRef, useState } from "react";
import { ActionSheet, type ActionSheetItem } from "@/components/ui/action-sheet";
import { useIsMobile } from "@/lib/use-media";

export type DropdownItem = ActionSheetItem;

interface DropdownMenuProps {
  /** A focusable element; receives aria-haspopup/aria-expanded and the toggle handler. */
  trigger: React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>>;
  items: DropdownItem[];
  align?: "left" | "right";
  /** Context line for the mobile action sheet. */
  title?: string;
}

/**
 * Overflow menu: an anchored popover with roving focus on desktop, a bottom
 * action sheet on phones. Items are `menuitem`s on both.
 */
export function DropdownMenu({ trigger, items, align = "right", title }: DropdownMenuProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const popoverOpen = open && !isMobile;

  useEffect(() => {
    if (!popoverOpen) return;

    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    // Move focus into the menu so arrow keys work immediately.
    const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])');
    first?.focus();
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [popoverOpen]);

  function handleMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const enabled = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [],
    );
    if (enabled.length === 0) return;
    const current = enabled.indexOf(document.activeElement as HTMLElement);
    let next: number | null = null;
    if (e.key === "ArrowDown") next = (current + 1) % enabled.length;
    else if (e.key === "ArrowUp") next = (current - 1 + enabled.length) % enabled.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = enabled.length - 1;
    else if (e.key === "Tab") {
      setOpen(false);
      return;
    }
    if (next !== null) {
      e.preventDefault();
      enabled[next]?.focus();
    }
  }

  const triggerEl = cloneElement(trigger, {
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": popoverOpen ? menuId : undefined,
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
      trigger.props.onClick?.(e);
      setOpen((v) => !v);
    },
  });

  return (
    <div ref={containerRef} className="relative inline-flex">
      {triggerEl}
      {isMobile ? (
        <ActionSheet open={open} onOpenChange={setOpen} title={title} items={items} />
      ) : (
        popoverOpen && (
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            onKeyDown={handleMenuKeyDown}
            className="absolute top-[calc(100%+4px)] z-[200] min-w-[176px] overflow-hidden rounded-[10px] py-[3px]"
            style={{
              ...(align === "right" ? { right: 0 } : { left: 0 }),
              background: "var(--mr-panel)",
              border: "1px solid var(--mr-edge)",
              boxShadow: "var(--shadow-mr-pop)",
              animation: "mrFadeIn 120ms ease-out both",
            }}
          >
            {items.map(({ label, onClick, destructive, icon: Icon, disabled }) => (
              <button
                key={label}
                role="menuitem"
                type="button"
                tabIndex={-1}
                disabled={disabled}
                onClick={() => {
                  setOpen(false);
                  onClick();
                }}
                className="hover:bg-mr-subtle focus-visible:bg-mr-subtle flex w-full items-center gap-2 px-[14px] py-2 text-left text-[13px] transition-colors outline-none disabled:opacity-40"
                style={{ color: destructive ? "var(--mr-danger)" : "var(--mr-text)" }}
              >
                {Icon && <Icon size={14} aria-hidden="true" />}
                {label}
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
}
