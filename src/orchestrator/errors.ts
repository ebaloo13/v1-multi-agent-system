export type OrchestratorRunErrorCode =
  | "SDK_RUN_FAILED"
  | "SDK_NO_RESULT"
  | "OUTPUT_PARSE"
  | "OUTPUT_SCHEMA"
  | "INPUT_INVALID"
  | "SUBAGENT_FAILED"
  | "UNEXPECTED";

export class OrchestratorRunError extends Error {
  readonly code: OrchestratorRunErrorCode;
  readonly details: unknown;

  constructor(code: OrchestratorRunErrorCode, details: unknown = undefined) {
    super(code);
    this.name = "OrchestratorRunError";
    this.code = code;
    this.details = details;
  }
}
