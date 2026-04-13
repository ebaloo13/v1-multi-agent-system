import { fromIntake } from "./fromIntake.js";
import { fromPreaudit } from "./fromPreaudit.js";
import type { AuditInputStage1, BuildAuditInputArgs } from "./types.js";

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

export function buildAuditInput(args: BuildAuditInputArgs): AuditInputStage1 {
  const intakeFacts = fromIntake(args.intake);
  const preauditFacts = fromPreaudit({
    preauditOutput: args.preauditOutput,
    toolFacts: args.toolFacts,
  });

  // Future ingestion modules can plug in here: fromCsv.ts, fromPdf.ts, fromCrm.ts, fromAds.ts.
  return {
    company_profile: intakeFacts.company_profile,
    business_goals: intakeFacts.business_goals,
    known_pains: intakeFacts.known_pains,
    available_assets: intakeFacts.available_assets,
    available_systems: intakeFacts.available_systems,
    notes: intakeFacts.notes,
    preaudit_summary: preauditFacts.preaudit_summary,
    detected_social_profiles: preauditFacts.detected_social_profiles,
    tracking_markers: preauditFacts.tracking_markers,
    missing_information: uniqueStrings([
      ...intakeFacts.missing_information,
      ...preauditFacts.missing_information,
    ]),
  };
}
