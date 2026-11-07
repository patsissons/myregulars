import type { MyRegularsDocument } from "@/lib/datastore/types";

/**
 * Deterministic JSON: object keys sorted, `undefined` members dropped, no
 * whitespace. Two documents with the same content hash the same regardless
 * of key order or which fields happen to be absent vs. undefined.
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, member]) => member !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return `{${entries.map(([key, member]) => `${JSON.stringify(key)}:${canonicalize(member)}`).join(",")}}`;
}

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function djb2(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (Math.imul(hash, 33) + input.charCodeAt(i)) >>> 0;
  }
  return hash >>> 0;
}

/**
 * 64-bit hex digest from two independent 32-bit hashes. Synchronous on
 * purpose: it runs inside reducers and render paths, and it only needs to
 * detect divergence between copies, not resist adversarial collisions.
 */
export function hashString(input: string): string {
  return fnv1a32(input).toString(16).padStart(8, "0") + djb2(input).toString(16).padStart(8, "0");
}

/**
 * Hash of what the user actually owns: the vault name and its data. Metadata
 * such as `updatedAt`, `id`, `replicas` and `sync` is excluded so that two
 * copies with identical content always agree.
 */
export function contentHash(document: Pick<MyRegularsDocument, "name" | "data">): string {
  return hashString(canonicalize({ name: document.name ?? "", data: document.data }));
}
