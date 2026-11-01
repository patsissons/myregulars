import { DATASTORE_APP_NAME, DATASTORE_SCHEMA_VERSION } from "@/lib/datastore/constants";
import { extractVaultNameFromFileName, generateId } from "@/lib/datastore/helpers";
import { getIdFromUri, getProviderFromUri } from "@/lib/datastore/uri";
import type {
  AnyMyRegularsDocument,
  DatastoreUri,
  DocumentContext,
  MyRegularsDocument,
} from "@/lib/datastore/types";

/**
 * The logical id assigned to a pre-v2 vault. It is derived from the copy it
 * was read from so that every device upgrading the same gist agrees on the id
 * without coordinating, and a copy made from it inherits the same id.
 */
export function legacyVaultId(uri: DatastoreUri): string {
  return `${getProviderFromUri(uri)}-${getIdFromUri(uri)}`;
}

/**
 * Upgrades any supported document to the current schema. v2 documents pass
 * through untouched; v1 documents gain an `id` (stable when the source URI is
 * known, random otherwise) and, when missing, a name derived from the gist
 * file name.
 */
export function upgradeDocument(
  document: AnyMyRegularsDocument,
  context: DocumentContext = {},
): MyRegularsDocument {
  if (document.schemaVersion === DATASTORE_SCHEMA_VERSION) {
    return document;
  }

  const id = context.uri ? legacyVaultId(context.uri) : generateId();
  const name =
    document.name ??
    (context.vaultFileName ? extractVaultNameFromFileName(context.vaultFileName) : null) ??
    undefined;

  return {
    app: DATASTORE_APP_NAME,
    schemaVersion: DATASTORE_SCHEMA_VERSION,
    id,
    ...(name ? { name } : {}),
    updatedAt: document.updatedAt,
    data: document.data,
  };
}
