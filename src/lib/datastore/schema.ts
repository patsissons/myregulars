import { z } from "zod";

import { DATASTORE_APP_NAME, DATASTORE_SCHEMA_VERSION } from "@/lib/datastore/constants";
import { DatastoreValidationError } from "@/lib/datastore/errors";
import type { MyRegularsDocument } from "@/lib/datastore/types";

const locationSchema = z.object({}).catchall(z.unknown());

const isoTimestampSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Expected a valid ISO-8601 timestamp.",
});

export const myRegularsDocumentSchema = z.object({
  app: z.literal(DATASTORE_APP_NAME),
  schemaVersion: z.literal(DATASTORE_SCHEMA_VERSION),
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

  return result.data;
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
