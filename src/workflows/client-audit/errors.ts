export type AuditRunErrorCode =
  | "SDK_RUN_FAILED"
  | "SDK_NO_RESULT"
  | "OUTPUT_PARSE"
  | "OUTPUT_SCHEMA"
  | "INPUT_INVALID"
  | "UNEXPECTED";

export class AuditRunError extends Error {
  readonly code: AuditRunErrorCode;
  readonly details: unknown;

  constructor(code: AuditRunErrorCode, details: unknown = undefined) {
    super(code);
    this.name = "AuditRunError";
    this.code = code;
    this.details = details;
  }
}
