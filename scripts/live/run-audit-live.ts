import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runAuditAgent } from "../../src/agents/audit-agent.js";
import { buildAuditInput } from "../../src/audit/ingestion/buildAuditInput.js";
import type {
  AuditIntake,
  AuditToolFacts,
  DetectedSocialProfiles,
  TrackingMarkers,
} from "../../src/audit/ingestion/types.js";
import { AuditRunError } from "../../src/audit/errors.js";
import type { PreauditOutput } from "../../src/schemas/preaudit.js";
import { slugifyClientName } from "../../src/common/runNaming.js";

type PreauditRunJson = {
  run_id?: unknown;
  display_run_id?: unknown;
  client_slug?: unknown;
  validated_output?: unknown;
  preaudit_data_path?: unknown;
  preaudit_record_index?: unknown;
};

function parsePathArg(argv: string[], flag: string): string | undefined {
  const inlineArg = argv.find((value) => value.startsWith(`${flag}=`));
  if (inlineArg) {
    return inlineArg.slice(flag.length + 1);
  }

  const index = argv.indexOf(flag);
  if (index >= 0 && index + 1 < argv.length) {
    return argv[index + 1];
  }

  return undefined;
}

function resolveInputPath(repoRoot: string, value: string): string {
  return path.isAbsolute(value) ? value : path.join(repoRoot, value);
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }

  return value as Record<string, unknown>;
}

function normalizeDetectedSocialProfiles(value: unknown): DetectedSocialProfiles | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const source = value as Record<string, unknown>;
  const normalized: DetectedSocialProfiles = {};
  const singleValueKeys = [
    "instagram",
    "facebook",
    "linkedin",
    "tiktok",
    "youtube",
    "whatsapp",
  ] as const;

  for (const key of singleValueKeys) {
    const candidate = source[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      normalized[key] = candidate.trim();
    }
  }

  if (Array.isArray(source.other_socials)) {
    const others = source.other_socials
      .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
      .map((entry) => entry.trim());
    if (others.length > 0) {
      normalized.other_socials = others;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeTrackingMarkers(value: unknown): TrackingMarkers | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const source = value as Record<string, unknown>;
  const normalized: TrackingMarkers = {};
  const booleanKeys = [
    "ga4_detected",
    "gtm_detected",
    "meta_pixel_detected",
    "linkedin_insight_detected",
  ] as const;

  for (const key of booleanKeys) {
    if (typeof source[key] === "boolean") {
      normalized[key] = source[key] as boolean;
    }
  }

  if (Array.isArray(source.other_markers)) {
    const others = source.other_markers
      .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
      .map((entry) => entry.trim());
    if (others.length > 0) {
      normalized.other_markers = others;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

async function readJsonFile(filePath: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as unknown;
}

async function loadIntake(repoRoot: string, intakePathArg: string): Promise<{
  intake: AuditIntake;
  intakePath: string;
}> {
  const intakePath = resolveInputPath(repoRoot, intakePathArg);
  const parsed = await readJsonFile(intakePath);
  return {
    intake: asRecord(parsed, "audit intake") as AuditIntake,
    intakePath,
  };
}

async function loadToolFactsFromPreauditRun(
  runJson: PreauditRunJson,
): Promise<AuditToolFacts | undefined> {
  if (typeof runJson.preaudit_data_path !== "string") {
    return undefined;
  }

  const parsed = await readJsonFile(runJson.preaudit_data_path);
  if (!Array.isArray(parsed)) {
    return undefined;
  }

  const recordIndex =
    typeof runJson.preaudit_record_index === "number" ? runJson.preaudit_record_index : 0;
  const selected = parsed[recordIndex];
  if (!selected || typeof selected !== "object" || Array.isArray(selected)) {
    return undefined;
  }

  const extractedContext = (selected as Record<string, unknown>).extracted_context;
  if (!extractedContext || typeof extractedContext !== "object" || Array.isArray(extractedContext)) {
    return undefined;
  }

  const contextRecord = extractedContext as Record<string, unknown>;
  const detectedSocialProfiles = normalizeDetectedSocialProfiles(contextRecord.social_profiles);
  const trackingMarkers = normalizeTrackingMarkers(contextRecord.tracking_markers);

  if (!detectedSocialProfiles && !trackingMarkers) {
    return undefined;
  }

  return {
    detected_social_profiles: detectedSocialProfiles,
    tracking_markers: trackingMarkers,
  };
}

async function loadPreauditInputs(
  repoRoot: string,
  argv: string[],
): Promise<{
  preauditOutput?: PreauditOutput;
  toolFacts?: AuditToolFacts;
  sourcePreaudit?: {
    runId?: string;
    displayRunId?: string;
    clientSlug?: string;
    path?: string;
  };
}> {
  const preauditRunJsonArg = parsePathArg(argv, "--preaudit-run-json");
  const preauditSummaryArg = parsePathArg(argv, "--preaudit-summary");

  if (preauditRunJsonArg) {
    const runJsonPath = resolveInputPath(repoRoot, preauditRunJsonArg);
    const parsed = (await readJsonFile(runJsonPath)) as PreauditRunJson;
    const preauditOutput = asRecord(parsed.validated_output, "preaudit validated_output") as PreauditOutput;
    const toolFacts = await loadToolFactsFromPreauditRun(parsed);
    return {
      preauditOutput,
      toolFacts,
      sourcePreaudit: {
        runId: typeof parsed.run_id === "string" ? parsed.run_id : undefined,
        displayRunId:
          typeof parsed.display_run_id === "string" ? parsed.display_run_id : undefined,
        clientSlug: typeof parsed.client_slug === "string" ? parsed.client_slug : undefined,
        path: path.dirname(runJsonPath),
      },
    };
  }

  if (preauditSummaryArg) {
    const summaryPath = resolveInputPath(repoRoot, preauditSummaryArg);
    const parsed = await readJsonFile(summaryPath);
    const summaryRecord = asRecord(parsed, "preaudit summary");
    const candidate =
      summaryRecord.validated_output &&
      typeof summaryRecord.validated_output === "object" &&
      !Array.isArray(summaryRecord.validated_output)
        ? summaryRecord.validated_output
        : summaryRecord;

    return {
      preauditOutput: asRecord(candidate, "preaudit summary payload") as PreauditOutput,
    };
  }

  return {};
}

async function main() {
  const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const argv = process.argv.slice(2);
  const intakeArg = parsePathArg(argv, "--intake");

  if (!intakeArg) {
    throw new Error("Missing required --intake argument");
  }

  const { intake, intakePath } = await loadIntake(repoRoot, intakeArg);
  const { preauditOutput, toolFacts, sourcePreaudit } = await loadPreauditInputs(repoRoot, argv);
  const auditInput = buildAuditInput({
    intake,
    preauditOutput,
    toolFacts,
  });
  const liveInputPath = path.join(repoRoot, "data", "clients", "audit-live.json");

  await fs.mkdir(path.dirname(liveInputPath), { recursive: true });
  await fs.writeFile(liveInputPath, `${JSON.stringify([auditInput], null, 2)}\n`, "utf8");

  process.env.AUDIT_INPUT_PATH = liveInputPath;
  process.env.AUDIT_INTAKE_PATH = intakePath;
  if (sourcePreaudit?.runId) {
    process.env.SOURCE_PREAUDIT_RUN_ID = sourcePreaudit.runId;
  }
  if (sourcePreaudit?.displayRunId) {
    process.env.SOURCE_PREAUDIT_DISPLAY_RUN_ID = sourcePreaudit.displayRunId;
  }
  if (sourcePreaudit?.path) {
    process.env.SOURCE_PREAUDIT_PATH = sourcePreaudit.path;
  }
  process.env.AUDIT_CLIENT_SLUG =
    sourcePreaudit?.clientSlug ||
    (auditInput.company_profile.name.trim().length > 0
      ? slugifyClientName(auditInput.company_profile.name)
      : "generic-client");

  console.log("audit_input_source: structured");
  console.log(`input_written: ${liveInputPath}`);
  if (preauditOutput) {
    console.log("preaudit_context: included");
  }

  try {
    const result = await runAuditAgent(0);
    console.log("artifactDir:", result.artifactDir);
  } catch (err) {
    if (err instanceof AuditRunError) {
      console.error("AuditRunError:", err.code, err.details ?? "");
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

await main();
