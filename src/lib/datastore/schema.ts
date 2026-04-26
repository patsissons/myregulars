import { z } from "zod";

import { DATASTORE_APP_NAME, DATASTORE_SCHEMA_VERSION } from "@/lib/datastore/constants";
import { DatastoreValidationError } from "@/lib/datastore/errors";
import type { Group, Location, MyRegularsDocument, Person } from "@/lib/datastore/types";

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

export const myRegularsDocumentSchema = z.object({
  app: z.literal(DATASTORE_APP_NAME),
  schemaVersion: z.literal(DATASTORE_SCHEMA_VERSION),
  name: z.string().optional(),
  updatedAt: isoTimestampSchema,
  data: z
    .object({
      locations: z.array(locationSchema),
    })
    .strict(),
});

export function createEmptyDocument(now = new Date()): MyRegularsDocument {
  return {
    app: DATASTORE_APP_NAME,
    schemaVersion: DATASTORE_SCHEMA_VERSION,
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

export function parseDocument(value: unknown): MyRegularsDocument {
  const result = myRegularsDocumentSchema.safeParse(value);

  if (!result.success) {
    throw new DatastoreValidationError(result.error.message);
  }

  return result.data as MyRegularsDocument;
}

export function parseDocumentString(contents: string): MyRegularsDocument {
  try {
    return parseDocument(JSON.parse(contents));
  } catch (error) {
    if (error instanceof DatastoreValidationError) {
      throw error;
    }

    throw new DatastoreValidationError("The datastore document is not valid JSON.");
  }
}

export function serializeDocument(document: MyRegularsDocument): string {
  return JSON.stringify(parseDocument(document), null, 2);
}

// Type assertions for parsed schema results
export type ParsedPerson = z.infer<typeof personSchema>;
export type ParsedGroup = z.infer<typeof groupSchema>;
export type ParsedLocation = z.infer<typeof locationSchema>;

// Ensure zod inferred types match our interfaces
type _PersonCheck = ParsedPerson extends Person ? true : false;
type _GroupCheck = ParsedGroup extends Group ? true : false;
type _LocationCheck = ParsedLocation extends Location ? true : false;
const _: [_PersonCheck, _GroupCheck, _LocationCheck] = [true, true, true];
void _;
