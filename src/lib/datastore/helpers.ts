import type { Group, Location, Person } from "@/lib/datastore/types";

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
