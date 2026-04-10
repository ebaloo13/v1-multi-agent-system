import type { PreauditOutput } from "../schemas/preaudit.js";

type PenaltyRule = {
  penalty: number;
  patterns: string[];
  isMajor?: boolean;
};

type ScoreOptions = {
  rules: PenaltyRule[];
  maxPenalty: number;
  issueCap?: {
    maxScore: number;
    minIssuesExclusive?: number;
    minIssuesInclusive?: number;
  };
  cleanCeiling: number;
  noisyCeiling: number;
  cleanIssueThreshold: number;
  extraPenaltyFromTracking?: {
    penalty: number;
    patterns: string[];
  };
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function normalizeFindings(findings: string[]): string {
  return findings.join("\n").toLowerCase();
}

function matchesAny(haystack: string, patterns: string[]): boolean {
  return patterns.some((pattern) => haystack.includes(pattern));
}

function scoreFromRules(
  categoryFindings: string[],
  trackingFindings: string[],
  options: ScoreOptions,
): number {
  const haystack = normalizeFindings(categoryFindings);
  const trackingHaystack = normalizeFindings(trackingFindings);
  let totalPenalty = 0;
  let matchedIssues = 0;
  let matchedMajorIssues = 0;

  for (const rule of options.rules) {
    if (!matchesAny(haystack, rule.patterns)) {
      continue;
    }

    totalPenalty += rule.penalty;
    matchedIssues += 1;
    if (rule.isMajor) {
      matchedMajorIssues += 1;
    }
  }

  if (
    options.extraPenaltyFromTracking &&
    matchesAny(trackingHaystack, options.extraPenaltyFromTracking.patterns)
  ) {
    totalPenalty += options.extraPenaltyFromTracking.penalty;
    matchedIssues += 1;
  }

  let score = 100 - Math.min(totalPenalty, options.maxPenalty);

  if (options.issueCap) {
    const exceedsExclusive =
      options.issueCap.minIssuesExclusive !== undefined &&
      matchedIssues > options.issueCap.minIssuesExclusive;
    const exceedsInclusive =
      options.issueCap.minIssuesInclusive !== undefined &&
      matchedMajorIssues >= options.issueCap.minIssuesInclusive;
    if (exceedsExclusive || exceedsInclusive) {
      score = Math.min(score, options.issueCap.maxScore);
    }
  }

  score = Math.min(
    score,
    matchedIssues <= options.cleanIssueThreshold ? options.cleanCeiling : options.noisyCeiling,
  );

  return clampScore(score);
}

export function computeSeoScore(data: PreauditOutput): number {
  return scoreFromRules(data.seo_findings, data.tracking_findings, {
    rules: [
      { penalty: 20, patterns: ["meta description is empty", "missing meta description"], isMajor: true },
      { penalty: 15, patterns: ["brand-only", "title is brand-only", "homepage title is branded", "generic title tag"], isMajor: true },
      { penalty: 15, patterns: ["two h1", "multiple h1", "h1 hierarchy appears weak", "weak h1", "h1 tags are generic"], isMajor: true },
      { penalty: 15, patterns: ["no structured data", "lacks structured data", "no schema", "schema markup", "rich snippet eligibility"], isMajor: true },
      { penalty: 15, patterns: ["no evidence of blog", "no blog", "thin site depth", "content depth", "content beyond transactional pages"], isMajor: true },
      { penalty: 10, patterns: ["keyword targeting", "keyword variation", "search-intent aligned", "search intent", "thin keyword focus"], isMajor: true },
      { penalty: 5, patterns: ["internal link structure", "internal linking", "crawlability", "anchor text"], isMajor: false },
      { penalty: 10, patterns: ["local seo signals weak", "localbusiness", "google business profile", "local pack"], isMajor: true },
    ],
    maxPenalty: 65,
    issueCap: {
      maxScore: 70,
      minIssuesExclusive: 4,
    },
    cleanCeiling: 75,
    noisyCeiling: 75,
    cleanIssueThreshold: 1,
    extraPenaltyFromTracking: {
      penalty: 10,
      patterns: ["no google analytics", "no visible google analytics", "no google analytics identifier", "tag manager", "ga4"],
    },
  });
}

export function computeSpeedScore(data: PreauditOutput): number {
  return scoreFromRules(data.speed_findings, data.tracking_findings, {
    rules: [
      { penalty: 20, patterns: ["render-blocking", "render blocking", "critical rendering path"], isMajor: true },
      { penalty: 15, patterns: ["no lazy-loading", "lazy-load", "lazy loading"], isMajor: true },
      { penalty: 15, patterns: ["heavy image", "heavy assets", "video assets", "background imagery", "full resolution"], isMajor: true },
      { penalty: 15, patterns: [".php", "no caching", "caching layer", "cdn integration not evident", "older server architecture", "cdn indicators"], isMajor: true },
      { penalty: 15, patterns: ["mobile-first", "mobile performance", "4g mobile", "phones", "mobile menu duplication", "layout reflow", "smaller screens"], isMajor: true },
    ],
    maxPenalty: 60,
    issueCap: {
      maxScore: 75,
      minIssuesInclusive: 3,
    },
    cleanCeiling: 80,
    noisyCeiling: 80,
    cleanIssueThreshold: 1,
  });
}

export function computeUxScore(data: PreauditOutput): number {
  return scoreFromRules(data.ux_findings, data.tracking_findings, {
    rules: [
      { penalty: 20, patterns: ["weak cta", "vague", "no prominent button-style", "low conversion contrast", "text-link style", "lack prominence"], isMajor: true },
      { penalty: 15, patterns: ["no sticky header", "no persistent booking prompt", "cta not persistent", "not prominently positioned", "appears only once"], isMajor: true },
      { penalty: 15, patterns: ["above-the-fold lacks", "above-the-fold clarity", "lacks immediate visual hierarchy", "text-heavy", "hero section lacks urgency"], isMajor: true },
      { penalty: 15, patterns: ["navigation is repeated", "navigation duplicated", "redundant or unclear site structure", "menu rendering issue", "double navigation", "duplicated in markup"], isMajor: true },
      { penalty: 15, patterns: ["no property filtering", "search bar", "availability calendar", "property filters", "seeing inventory"], isMajor: true },
      { penalty: 15, patterns: ["form access appears indirect", "conversion friction", "forces users to scroll", "from faq", "quotation form link buried", "separate form page"], isMajor: true },
      { penalty: 10, patterns: ["trust signals are text-only", "missed trust-building opportunity", "verified review badges", "star ratings", "no trust signals above fold", "weak social proof"], isMajor: false },
    ],
    maxPenalty: 65,
    issueCap: {
      maxScore: 75,
      minIssuesExclusive: 4,
    },
    cleanCeiling: 80,
    noisyCeiling: 80,
    cleanIssueThreshold: 1,
    extraPenaltyFromTracking: {
      penalty: 10,
      patterns: ["no google analytics", "no visible google analytics", "no google analytics identifier", "tag manager", "ga4"],
    },
  });
}
