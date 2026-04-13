import type { PreauditOutput } from "../../schemas/preaudit.js";
import type { AuditToolFacts, DetectedSocialProfiles, TrackingMarkers } from "./types.js";

export type AuditIntakeDraft = {
  company_profile: {
    name: string;
    industry: string;
    business_model: string;
    location: string;
  };
  business_goals: string[];
  known_pains: string[];
  available_assets: string[];
  available_systems: string[];
  notes: string;
  _autofilled_from_preaudit: {
    company_summary: string;
    seo_score: number;
    speed_score: number;
    ux_score: number;
    priority_alerts: string[];
    detected_social_profiles: DetectedSocialProfiles;
    tracking_markers: TrackingMarkers;
    website: string;
    client_slug: string;
  };
  _todo: string[];
};

export type CreateAuditIntakeDraftParams = {
  preauditOutput: PreauditOutput;
  toolFacts?: AuditToolFacts;
  clientSlug?: string;
  websiteUrl?: string;
  companyName?: string;
  industry?: string;
};

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

function deriveCompanyName(companySummary: string): string {
  const summary = companySummary.trim();
  if (summary.length === 0) {
    return "";
  }

  const match = summary.match(/^(.+?)(?:\s+operates\b|\s+manages\b|\s+is\b|\s+serves\b|[.,])/i);
  if (match?.[1]) {
    return match[1].trim();
  }

  return summary.split(/\s+/).slice(0, 4).join(" ");
}

function normalizeDetectedSocialProfiles(
  value: DetectedSocialProfiles | undefined,
): DetectedSocialProfiles {
  if (!value) {
    return {};
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

  return normalized;
}

function normalizeTrackingMarkers(value: TrackingMarkers | undefined): TrackingMarkers {
  if (!value) {
    return {};
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

  return normalized;
}

function availableAssetsFromFacts(
  websiteUrl: string,
  socialProfiles: DetectedSocialProfiles,
): string[] {
  const assets: string[] = [];

  if (websiteUrl.trim().length > 0) {
    assets.push(`Website: ${websiteUrl.trim()}`);
  }

  const labels: Array<[keyof DetectedSocialProfiles, string]> = [
    ["instagram", "Instagram"],
    ["facebook", "Facebook"],
    ["linkedin", "LinkedIn"],
    ["tiktok", "TikTok"],
    ["youtube", "YouTube"],
    ["whatsapp", "WhatsApp"],
  ];

  for (const [key, label] of labels) {
    const value = socialProfiles[key];
    if (typeof value === "string" && value.trim().length > 0) {
      assets.push(`${label}: ${value.trim()}`);
    }
  }

  for (const other of socialProfiles.other_socials ?? []) {
    assets.push(`Social: ${other}`);
  }

  return uniqueStrings(assets);
}

export function createAuditIntakeDraft(
  params: CreateAuditIntakeDraftParams,
): AuditIntakeDraft {
  const socialProfiles = normalizeDetectedSocialProfiles(
    params.toolFacts?.detected_social_profiles,
  );
  const trackingMarkers = normalizeTrackingMarkers(params.toolFacts?.tracking_markers);
  const websiteUrl = params.websiteUrl?.trim() ?? "";
  const clientSlug = params.clientSlug?.trim() || "generic-client";

  return {
    company_profile: {
      name: deriveCompanyName(params.preauditOutput.company_summary) || params.companyName?.trim() || "",
      industry: params.industry?.trim() ?? "",
      business_model: "",
      location: "",
    },
    business_goals: [],
    known_pains: [],
    available_assets: availableAssetsFromFacts(websiteUrl, socialProfiles),
    available_systems: [],
    notes: "",
    _autofilled_from_preaudit: {
      company_summary: params.preauditOutput.company_summary,
      seo_score: params.preauditOutput.seo_score,
      speed_score: params.preauditOutput.speed_score,
      ux_score: params.preauditOutput.ux_score,
      priority_alerts: params.preauditOutput.priority_alerts,
      detected_social_profiles: socialProfiles,
      tracking_markers: trackingMarkers,
      website: websiteUrl,
      client_slug: clientSlug,
    },
    _todo: [
      "fill business goals",
      "fill known pains",
      "fill systems in use",
      "confirm business model",
      "confirm location",
    ],
  };
}
