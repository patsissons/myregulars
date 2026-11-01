import { DATASTORE_APP_NAME, DATASTORE_FILE_NAME } from "@/lib/datastore/constants";
import type { Group, Location, Person } from "@/lib/datastore/types";

export function sanitizeVaultName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "vault"
  );
}

export function buildVaultFileName(vaultName: string): string {
  return `${DATASTORE_APP_NAME}.${sanitizeVaultName(vaultName)}.json`;
}

export function extractVaultNameFromFileName(fileName: string): string | null {
  if (fileName === DATASTORE_FILE_NAME) return null;
  const match = fileName.match(/^[^.]+\.(.+)\.json$/);
  if (!match) return null;
  return match[1]
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function computeInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  return words
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

export function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 360;
}

/**
 * The calendar date in the user's local timezone as `YYYY-MM-DD`.
 * (`toISOString()` would give the UTC date, which is tomorrow for evening
 * visits anywhere west of Greenwich.)
 */
export function localDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Normalizes a `YYYY-MM-DD` day into the canonical visit timestamp. */
export function toVisitTimestamp(day: string): string {
  return `${day}T00:00:00.000Z`;
}

export function formatLastSeen(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export function createPerson(name: string, detail: string): Person {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name,
    detail,
    createdAt: now,
    updatedAt: now,
  };
}

export function createGroup(name: string, description?: string): Group {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name,
    description,
    people: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createLocation(name: string, description?: string): Location {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name,
    description,
    groups: [],
    createdAt: now,
    updatedAt: now,
  };
}
