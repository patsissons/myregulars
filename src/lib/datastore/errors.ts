export class AuthRequiredError extends Error {
  constructor(message = "GitHub authentication is required for this action.") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export class DatastoreConflictError extends Error {
  constructor(message = "The remote datastore changed before this save completed.") {
    super(message);
    this.name = "DatastoreConflictError";
  }
}

export class DatastoreValidationError extends Error {
  constructor(message = "The datastore document is invalid.") {
    super(message);
    this.name = "DatastoreValidationError";
  }
}
