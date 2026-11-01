import { contentHash } from "@/lib/datastore/content-hash";
import { formatDatastoreUri, formatHostedUri, getProviderFromUri } from "@/lib/datastore/uri";
import type {
  DatastoreProviderId,
  DatastoreUri,
  MyRegularsDocument,
  VaultReplicas,
} from "@/lib/datastore/types";

/** What one copy of a vault looks like for the purposes of sync. */
export interface ReplicaState {
  provider: DatastoreProviderId;
  /** Content hash of the copy as it is now. */
  hash: string;
  /** Content hash both copies shared when this copy was last written, if known. */
  base?: string;
}

export type SyncStatus =
  | { kind: "inSync"; hash: string }
  /** `to` is behind and can be overwritten with `from` without losing anything. */
  | { kind: "fastForward"; from: DatastoreProviderId; to: DatastoreProviderId; hash: string }
  /** Both copies changed since they last agreed. Someone has to pick a side. */
  | { kind: "diverged" };

export function siblingProvider(provider: DatastoreProviderId): DatastoreProviderId {
  return provider === "gist" ? "hosted" : "gist";
}

export function replicaUri(provider: DatastoreProviderId, id: string): DatastoreUri {
  return provider === "hosted" ? formatHostedUri(id) : formatDatastoreUri(id);
}

export function replicaStateOf(
  provider: DatastoreProviderId,
  document: MyRegularsDocument,
): ReplicaState {
  return { provider, hash: contentHash(document), base: document.sync?.base };
}

/**
 * Decides how two copies relate.
 *
 * A copy whose current hash equals any known common ancestor (either copy's
 * stored `base`, or the hash this device last saw both copies agree on) has
 * not changed since the copies agreed, so the other copy can be fast-forwarded
 * onto it. If neither copy sits on an ancestor, both moved: diverged.
 */
export function computeSyncStatus(a: ReplicaState, b: ReplicaState, agreed?: string): SyncStatus {
  if (a.hash === b.hash) {
    return { kind: "inSync", hash: a.hash };
  }

  const ancestors = new Set([a.base, b.base, agreed].filter((h): h is string => Boolean(h)));

  if (ancestors.has(b.hash)) {
    return { kind: "fastForward", from: a.provider, to: b.provider, hash: a.hash };
  }

  if (ancestors.has(a.hash)) {
    return { kind: "fastForward", from: b.provider, to: a.provider, hash: b.hash };
  }

  return { kind: "diverged" };
}

/** The sibling copy's URI recorded inside a document, if it has one. */
export function siblingUriFromDocument(
  document: MyRegularsDocument,
  selfUri: DatastoreUri,
): DatastoreUri | null {
  const other = siblingProvider(getProviderFromUri(selfUri));
  const ref = document.replicas?.[other];
  return ref ? replicaUri(other, ref.id) : null;
}

export function withReplicaLink(
  document: MyRegularsDocument,
  provider: DatastoreProviderId,
  id: string,
): MyRegularsDocument {
  const replicas: VaultReplicas = { ...document.replicas, [provider]: { id } };
  return { ...document, replicas };
}

export function withoutReplicaLink(
  document: MyRegularsDocument,
  provider: DatastoreProviderId,
): MyRegularsDocument {
  if (!document.replicas?.[provider]) return document;
  const replicas: VaultReplicas = { ...document.replicas };
  delete replicas[provider];
  const next: MyRegularsDocument = { ...document };
  if (Object.keys(replicas).length > 0) {
    next.replicas = replicas;
  } else {
    delete next.replicas;
    delete next.sync;
  }
  return next;
}

export function withSyncBase(
  document: MyRegularsDocument,
  base: string,
  at = new Date(),
): MyRegularsDocument {
  return { ...document, sync: { base, at: at.toISOString() } };
}

/** Copies the user-owned content of `source` onto `target`, keeping target's metadata. */
export function adoptContent(
  target: MyRegularsDocument,
  source: MyRegularsDocument,
): MyRegularsDocument {
  const next: MyRegularsDocument = { ...target, data: source.data };
  if (source.name !== undefined) {
    next.name = source.name;
  } else {
    delete next.name;
  }
  return next;
}
