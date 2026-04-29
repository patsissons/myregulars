"use client";

import { useState } from "react";
import { ChevronRight, Upload } from "lucide-react";
import { formatLastSeen } from "@/lib/datastore/helpers";
import type { KnownVault } from "@/lib/vault-types";
import { cn } from "@/lib/cn";

interface VaultCardProps {
  vault: KnownVault;
  onClick: () => void;
  className?: string;
}

export function VaultCard({ vault, onClick, className }: VaultCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-full w-full flex-col gap-2 rounded-[14px] p-[16px] text-left transition-all duration-[120ms]",
        "border-mr-edge hover:bg-mr-subtle border hover:border-black/50! active:scale-[0.99]",
        className,
      )}
      style={{
        background: "var(--mr-panel)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="truncate text-[15px] font-[600]"
          style={{ color: "var(--mr-text)", letterSpacing: "-0.01em" }}
        >
          {vault.name}
        </span>
        <ChevronRight size={16} style={{ color: "var(--mr-faint)", flexShrink: 0 }} />
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[12px]" style={{ color: "var(--mr-dim)" }}>
          {vault.locationCount} place{vault.locationCount !== 1 ? "s" : ""}
        </span>
        <span className="text-[12px]" style={{ color: "var(--mr-faint)" }}>
          ·
        </span>
        <span className="text-[12px]" style={{ color: "var(--mr-dim)" }}>
          {vault.peopleCount} people
        </span>
        <span className="text-[12px]" style={{ color: "var(--mr-faint)" }}>
          ·
        </span>
        <span className="text-[12px]" style={{ color: "var(--mr-dim)" }}>
          opened {formatLastSeen(vault.lastOpened)}
        </span>
      </div>

      <span
        className="font-mono text-[11px]"
        style={{ color: "var(--mr-faint)", fontVariantNumeric: "tabular-nums" }}
      >
        {vault.uri}
      </span>
    </button>
  );
}

interface NewVaultCardProps {
  onClick: () => void;
  className?: string;
}

export function NewVaultCard({ onClick, className }: NewVaultCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-2 rounded-[14px] p-[24px] text-left transition-all duration-[120ms]",
        "hover:bg-mr-subtle hover:border-black/50! active:scale-[0.99]",
        className,
      )}
      style={{
        background: "transparent",
        border: "1.5px dashed var(--mr-edge-strong)",
        minHeight: 100,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "var(--mr-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 20, color: "var(--mr-dim)", lineHeight: 1, fontWeight: 300 }}>
          +
        </span>
      </div>
      <span className="text-[14px] font-[500]" style={{ color: "var(--mr-dim)" }}>
        New vault
      </span>
    </button>
  );
}

interface ImportVaultCardProps {
  onClick: () => void;
  onFileDrop?: (file: File) => void;
  className?: string;
}

export function ImportVaultCard({ onClick, onFileDrop, className }: ImportVaultCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dropEnabled = Boolean(onFileDrop);

  function handleDragOver(e: React.DragEvent<HTMLButtonElement>) {
    if (!dropEnabled) return;
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLButtonElement>) {
    if (!dropEnabled) return;
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent<HTMLButtonElement>) {
    if (!dropEnabled) return;
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileDrop?.(file);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-2 rounded-[14px] p-[24px] text-left transition-all duration-[120ms]",
        "hover:bg-mr-subtle hover:border-black/50! active:scale-[0.99]",
        className,
      )}
      style={{
        background: isDragOver ? "var(--mr-subtle)" : "transparent",
        border: `1.5px dashed ${isDragOver ? "var(--mr-accent)" : "var(--mr-edge-strong)"}`,
        minHeight: 100,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "var(--mr-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Upload size={16} style={{ color: isDragOver ? "var(--mr-accent)" : "var(--mr-dim)" }} />
      </div>
      <span
        className="text-[14px] font-[500]"
        style={{ color: isDragOver ? "var(--mr-accent)" : "var(--mr-dim)" }}
      >
        {isDragOver ? "Drop to import" : "Import from JSON"}
      </span>
    </button>
  );
}
