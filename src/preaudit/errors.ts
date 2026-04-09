export type PreauditRunErrorCode =
  | "SDK_RUN_FAILED"
  | "SDK_NO_RESULT"
  | "OUTPUT_PARSE"
  | "OUTPUT_SCHEMA"
  | "INPUT_INVALID"
  | "UNEXPECTED";

export class PreauditRunError extends Error {
  readonly code: PreauditRunErrorCode;
  readonly details: unknown;

  constructor(code: PreauditRunErrorCode, details: unknown = undefined) {
    super(code);
    this.name = "PreauditRunError";
    this.code = code;
    this.details = details;
  }
}
