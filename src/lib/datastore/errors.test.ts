import { describe, it, expect } from "vitest";
import { AuthRequiredError, DatastoreConflictError, DatastoreValidationError } from "./errors";

describe("AuthRequiredError", () => {
  it("extends Error", () => {
    const err = new AuthRequiredError();
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AuthRequiredError);
  });

  it("has the correct name", () => {
    expect(new AuthRequiredError().name).toBe("AuthRequiredError");
  });

  it("uses a default message", () => {
    expect(new AuthRequiredError().message).toBe(
      "GitHub authentication is required for this action.",
    );
  });

  it("accepts a custom message", () => {
    expect(new AuthRequiredError("nope").message).toBe("nope");
  });
});

describe("DatastoreConflictError", () => {
  it("extends Error", () => {
    const err = new DatastoreConflictError();
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DatastoreConflictError);
  });

  it("has the correct name", () => {
    expect(new DatastoreConflictError().name).toBe("DatastoreConflictError");
  });

  it("uses a default message", () => {
    expect(new DatastoreConflictError().message).toBe(
      "The remote datastore changed before this save completed.",
    );
  });

  it("accepts a custom message", () => {
    expect(new DatastoreConflictError("stale").message).toBe("stale");
  });
});

describe("DatastoreValidationError", () => {
  it("extends Error", () => {
    const err = new DatastoreValidationError();
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DatastoreValidationError);
  });

  it("has the correct name", () => {
    expect(new DatastoreValidationError().name).toBe("DatastoreValidationError");
  });

  it("uses a default message", () => {
    expect(new DatastoreValidationError().message).toBe("The datastore document is invalid.");
  });

  it("accepts a custom message", () => {
    expect(new DatastoreValidationError("bad doc").message).toBe("bad doc");
  });
});

describe("error class independence", () => {
  it("does not treat distinct error types as instances of each other", () => {
    expect(new AuthRequiredError()).not.toBeInstanceOf(DatastoreConflictError);
    expect(new DatastoreConflictError()).not.toBeInstanceOf(DatastoreValidationError);
  });
});
