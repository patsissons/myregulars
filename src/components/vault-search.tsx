"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { getAllPeople, useVault } from "@/lib/vault-context";

interface HighlightedTextProps {
  text: string;
  query: string;
}

function HighlightedText({ text, query }: HighlightedTextProps) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <strong style={{ fontWeight: 600, color: "var(--mr-text)" }}>
        {text.slice(idx, idx + query.length)}
      </strong>
      {text.slice(idx + query.length)}
    </>
  );
}

interface VaultSearchProps {
  vaultId: string;
  /** Additional CSS class for the outer container */
  className?: string;
  /** Show the ⌘K keyboard-shortcut hint (desktop). Defaults to true. */
  showShortcut?: boolean;
}

export function VaultSearch({ vaultId, className, showShortcut = true }: VaultSearchProps) {
  const { vault } = useVault();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(timer);
  }, [query]);

  // ⌘K shortcut — desktop only
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        inputRef.current?.blur();
        setOpen(false);
        setQuery("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const allPeople = getAllPeople(vault);

  const results = debouncedQuery
    ? allPeople
        .filter(({ person }) => {
          const q = debouncedQuery.toLowerCase();
          return person.name.toLowerCase().includes(q) || person.detail.toLowerCase().includes(q);
        })
        .slice(0, 10)
    : [];

  const handleSelect = useCallback(
    (locationId: string, personId: string) => {
      setOpen(false);
      setQuery("");
      router.push(`/v/${vaultId}/l/${locationId}/p/${personId}`);
    },
    [router, vaultId],
  );

  return (
    <div ref={containerRef} className={className} style={{ position: "relative" }}>
      <div className="relative">
        <Search
          size={13}
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
          style={{ color: "var(--mr-faint)" }}
        />
        <input
          ref={inputRef}
          type="text"
          role="searchbox"
          aria-label="Search vault"
          aria-autocomplete="list"
          placeholder="Search vault"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className={`w-full rounded-[8px] py-[6px] pl-[30px] text-[13px] outline-none ${
            showShortcut ? "pr-10" : "pr-3"
          }`}
          style={{
            background: "var(--mr-subtle)",
            color: "var(--mr-text)",
          }}
        />
        {showShortcut && (
          <div
            className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded px-[5px] py-[2px] text-[10px]"
            style={{
              background: "var(--mr-edge)",
              color: "var(--mr-faint)",
              lineHeight: 1.3,
            }}
          >
            ⌘K
          </div>
        )}
      </div>

      {/* Results dropdown */}
      {open && debouncedQuery && (
        <div
          role="listbox"
          aria-label="Search results"
          className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-[10px]"
          style={{
            background: "var(--mr-panel)",
            border: "1px solid var(--mr-edge)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          {results.length === 0 ? (
            <div className="px-4 py-[60px] text-center">
              <p className="text-[14px] font-[500]" style={{ color: "var(--mr-text)" }}>
                No matches
              </p>
              <p className="mt-1 text-[12px]" style={{ color: "var(--mr-faint)" }}>
                Try a different search
              </p>
            </div>
          ) : (
            results.map(({ person, location }) => (
              <button
                key={person.id}
                type="button"
                onClick={() => handleSelect(location.id, person.id)}
                className="hover:bg-mr-subtle flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors duration-75"
                style={{ borderTop: "1px solid var(--mr-edge)" }}
              >
                <span className="text-[13px]" style={{ color: "var(--mr-text)" }}>
                  <HighlightedText text={person.name} query={debouncedQuery} />
                </span>
                <span className="text-[11px]" style={{ color: "var(--mr-faint)" }}>
                  {location.name}
                  {person.detail ? ` · ` : ""}
                  {person.detail && <HighlightedText text={person.detail} query={debouncedQuery} />}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
