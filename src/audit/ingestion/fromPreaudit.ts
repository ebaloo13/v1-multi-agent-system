import type { PreauditOutput } from "../../schemas/preaudit.js";
import type {
  AuditInputStage1,
  AuditToolFacts,
  DetectedSocialProfiles,
  TrackingMarkers,
} from "./types.js";

type FromPreauditArgs = {
  preauditOutput?: PreauditOutput;
  toolFacts?: AuditToolFacts;
};

type PreauditDerivedFacts = Pick<
  AuditInputStage1,
  "preaudit_summary" | "detected_social_profiles" | "tracking_markers" | "missing_information"
>;

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

function normalizeDetectedSocialProfiles(
  value: DetectedSocialProfiles | undefined,
): DetectedSocialProfiles | undefined {
  if (!value) {
    return undefined;
  }

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
    const candidate = value[key]?.trim();
    if (candidate) {
      normalized[key] = candidate;
    }
  }

  const otherSocials = uniqueStrings(value.other_socials ?? []);
  if (otherSocials.length > 0) {
    normalized.other_socials = otherSocials;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeTrackingMarkers(
  value: TrackingMarkers | undefined,
): TrackingMarkers | undefined {
  if (!value) {
    return undefined;
  }

  const normalized: TrackingMarkers = {};
  const booleanKeys = [
    "ga4_detected",
    "gtm_detected",
    "meta_pixel_detected",
    "linkedin_insight_detected",
  ] as const;

  for (const key of booleanKeys) {
    if (typeof value[key] === "boolean") {
      normalized[key] = value[key];
    }
  }

  const otherMarkers = uniqueStrings(value.other_markers ?? []);
  if (otherMarkers.length > 0) {
    normalized.other_markers = otherMarkers;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function buildTopFindings(preauditOutput: PreauditOutput): string[] {
  return uniqueStrings([
    ...preauditOutput.priority_alerts,
    ...preauditOutput.tracking_findings,
    preauditOutput.summary,
  ]).slice(0, 5);
}

export function fromPreaudit(args: FromPreauditArgs): PreauditDerivedFacts {
  const normalizedSocialProfiles = normalizeDetectedSocialProfiles(
    args.toolFacts?.detected_social_profiles,
  );
  const normalizedTrackingMarkers = normalizeTrackingMarkers(args.toolFacts?.tracking_markers);
  const missingInformation: string[] = [];

  if (!args.preauditOutput) {
    missingInformation.push("No preaudit summary available.");
  }

  if (!normalizedSocialProfiles) {
    missingInformation.push("No detected social profile facts available.");
  }

  if (!normalizedTrackingMarkers) {
    missingInformation.push("No tracking marker facts available.");
  }

  return {
    preaudit_summary: args.preauditOutput
      ? {
          company_summary: args.preauditOutput.company_summary,
          seo_score: args.preauditOutput.seo_score,
          speed_score: args.preauditOutput.speed_score,
          ux_score: args.preauditOutput.ux_score,
          top_findings: buildTopFindings(args.preauditOutput),
        }
      : undefined,
    detected_social_profiles: normalizedSocialProfiles,
    tracking_markers: normalizedTrackingMarkers,
    missing_information: missingInformation,
  };
}
