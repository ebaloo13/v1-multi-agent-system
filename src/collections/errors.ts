export type CollectionsRunErrorCode =
  | "SDK_RUN_FAILED"
  | "SDK_NO_RESULT"
  | "OUTPUT_PARSE"
  | "OUTPUT_SCHEMA"
  | "INPUT_INVALID"
  | "UNEXPECTED";

export class CollectionsRunError extends Error {
  readonly code: CollectionsRunErrorCode;
  readonly details: unknown;

  constructor(code: CollectionsRunErrorCode, details: unknown = undefined) {
    super(code);
    this.name = "CollectionsRunError";
    this.code = code;
    this.details = details;
  }
}
