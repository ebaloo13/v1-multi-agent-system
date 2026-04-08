export type SalesRunErrorCode =
  | "SDK_RUN_FAILED"
  | "SDK_NO_RESULT"
  | "OUTPUT_PARSE"
  | "OUTPUT_SCHEMA"
  | "INPUT_INVALID"
  | "UNEXPECTED";

export class SalesRunError extends Error {
  readonly code: SalesRunErrorCode;
  readonly details: unknown;

  constructor(code: SalesRunErrorCode, details: unknown = undefined) {
    super(code);
    this.name = "SalesRunError";
    this.code = code;
    this.details = details;
  }
}
