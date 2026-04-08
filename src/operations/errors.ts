export type OperationsRunErrorCode =
  | "SDK_RUN_FAILED"
  | "SDK_NO_RESULT"
  | "OUTPUT_PARSE"
  | "OUTPUT_SCHEMA"
  | "INPUT_INVALID"
  | "UNEXPECTED";

export class OperationsRunError extends Error {
  readonly code: OperationsRunErrorCode;
  readonly details: unknown;

  constructor(code: OperationsRunErrorCode, details: unknown = undefined) {
    super(code);
    this.name = "OperationsRunError";
    this.code = code;
    this.details = details;
  }
}
