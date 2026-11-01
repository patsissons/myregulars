import { z } from "zod";

import {
  DATASTORE_APP_NAME,
  DATASTORE_LEGACY_SCHEMA_VERSION,
  DATASTORE_SCHEMA_VERSION,
} from "@/lib/datastore/constants";
import { DatastoreValidationError } from "@/lib/datastore/errors";
import { generateId } from "@/lib/datastore/helpers";
import { upgradeDocument } from "@/lib/datastore/migrate";
import type {
  DocumentContext,
  Group,
  Location,
  MyRegularsDocument,
  Person,
} from "@/lib/datastore/types";

const isoTimestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Expected a valid ISO-8601 timestamp.",
});

export const petSchema = z.object({
  name: z.string(),
  species: z.string(),
});

export const visitEntrySchema = z.object({
  date: isoTimestampSchema,
  note: z.string().optional(),
});

export const relationshipSchema = z.object({
  personId: z.string(),
  kind: z.string(),
});

export const personSchema = z.object({
  id: z.string(),
  name: z.string(),
  detail: z.string(),
  photoUrl: z.string().optional(),
  lastSeen: z.string().optional(),
  visitLog: z.array(visitEntrySchema).optional(),
  pets: z.array(petSchema).optional(),
  relationships: z.array(relationshipSchema).optional(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export const groupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  people: z.array(personSchema),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export const locationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  groups: z.array(groupSchema),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

const vaultDataSchema = z
  .object({
    locations: z.array(locationSchema),
  })
  .strict();

const replicaRefSchema = z.object({ id: z.string().min(1) });

export const documentV1Schema = z.object({
  app: z.literal(DATASTORE_APP_NAME),
  schemaVersion: z.literal(DATASTORE_LEGACY_SCHEMA_VERSION),
  name: z.string().optional(),
  updatedAt: isoTimestampSchema,
  data: vaultDataSchema,
});

export const documentV2Schema = z.object({
  app: z.literal(DATASTORE_APP_NAME),
  schemaVersion: z.literal(DATASTORE_SCHEMA_VERSION),
  id: z.string().min(1),
  name: z.string().optional(),
  updatedAt: isoTimestampSchema,
  replicas: z
    .object({
      gist: replicaRefSchema.optional(),
      hosted: replicaRefSchema.optional(),
    })
    .optional(),
  sync: z
    .object({
      base: z.string().min(1),
      at: isoTimestampSchema,
    })
    .optional(),
  data: vaultDataSchema,
});

/** Accepts every schema version the app can read. */
export const anyDocumentSchema = z.discriminatedUnion("schemaVersion", [
  documentV1Schema,
  documentV2Schema,
]);

/** @deprecated Use `documentV2Schema` (current) or `anyDocumentSchema` (reads). */
export const myRegularsDocumentSchema = documentV2Schema;

export function createEmptyDocument(
  now = new Date(),
  init: { id?: string; name?: string } = {},
): MyRegularsDocument {
  return {
    app: DATASTORE_APP_NAME,
    schemaVersion: DATASTORE_SCHEMA_VERSION,
    id: init.id ?? generateId(),
    ...(init.name ? { name: init.name } : {}),
    updatedAt: now.toISOString(),
    data: {
      locations: [],
    },
  };
}

export function withUpdatedTimestamp(
  document: Omit<MyRegularsDocument, "updatedAt"> & Partial<Pick<MyRegularsDocument, "updatedAt">>,
  now = new Date(),
): MyRegularsDocument {
  return {
    ...document,
    updatedAt: now.toISOString(),
  };
}

/**
 * Validates a document of any supported schema version and returns it in the
 * current shape. Pass the read context so legacy documents get a stable id.
 */
export function parseDocument(value: unknown, context?: DocumentContext): MyRegularsDocument {
  const result = anyDocumentSchema.safeParse(value);

  if (!result.success) {
    throw new DatastoreValidationError(result.error.message);
  }

  return upgradeDocument(result.data, context);
}

export function parseDocumentString(
  contents: string,
  context?: DocumentContext,
): MyRegularsDocument {
  try {
    return parseDocument(JSON.parse(contents), context);
  } catch (error) {
    if (error instanceof DatastoreValidationError) {
      throw error;
    }

    throw new DatastoreValidationError("The datastore document is not valid JSON.");
  }
}

/** Serializes for storage. Always emits the current schema version. */
export function serializeDocument(document: MyRegularsDocument): string {
  return JSON.stringify(parseDocument(document), null, 2);
}

// Type assertions for parsed schema results
export type ParsedPerson = z.infer<typeof personSchema>;
export type ParsedGroup = z.infer<typeof groupSchema>;
export type ParsedLocation = z.infer<typeof locationSchema>;
export type ParsedDocumentV2 = z.infer<typeof documentV2Schema>;

// Ensure zod inferred types match our interfaces
type _PersonCheck = ParsedPerson extends Person ? true : false;
type _GroupCheck = ParsedGroup extends Group ? true : false;
type _LocationCheck = ParsedLocation extends Location ? true : false;
type _DocumentCheck = ParsedDocumentV2 extends MyRegularsDocument ? true : false;
const _: [_PersonCheck, _GroupCheck, _LocationCheck, _DocumentCheck] = [true, true, true, true];
void _;
