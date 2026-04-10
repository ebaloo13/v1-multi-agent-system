import type { PreauditOutput } from "../schemas/preaudit.js";

type PenaltyRule = {
  penalty: number;
  patterns: string[];
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function normalizeFindings(findings: string[]): string {
  return findings.join("\n").toLowerCase();
}

function applyPenaltyRules(findings: string[], rules: PenaltyRule[]): number {
  const haystack = normalizeFindings(findings);
  let score = 100;

  for (const rule of rules) {
    if (rule.patterns.some((pattern) => haystack.includes(pattern))) {
      score -= rule.penalty;
    }
  }

  return clampScore(score);
}

export function computeSeoScore(data: PreauditOutput): number {
  return applyPenaltyRules(data.seo_findings, [
    { penalty: 15, patterns: ["meta description is empty", "missing meta description"] },
    { penalty: 10, patterns: ["brand-only", "title is brand-only", "weak title"] },
    { penalty: 10, patterns: ["two h1", "multiple h1", "h1 hierarchy appears weak", "weak h1"] },
    { penalty: 10, patterns: ["no structured data", "lacks structured data", "no schema", "faq schema"] },
    { penalty: 10, patterns: ["no evidence of blog", "no blog", "thin site depth", "content beyond transactional pages"] },
    { penalty: 10, patterns: ["keyword targeting", "keyword variation", "search-intent aligned", "search intent"] },
    { penalty: 5, patterns: ["internal link structure", "internal linking", "crawlability"] },
    { penalty: 10, patterns: ["local seo signals weak", "localbusiness", "google business profile"] },
  ]);
}

export function computeSpeedScore(data: PreauditOutput): number {
  return applyPenaltyRules(data.speed_findings, [
    { penalty: 15, patterns: ["render-blocking", "render blocking"] },
    { penalty: 10, patterns: ["no lazy-loading", "lazy-load", "lazy loading"] },
    { penalty: 10, patterns: ["heavy image", "heavy assets", "video assets", "background imagery"] },
    { penalty: 10, patterns: [".php", "no caching", "static caching", "cdn integration not evident", "older server architecture"] },
    { penalty: 10, patterns: ["mobile-first", "mobile performance", "4g mobile", "phones", "mobile menu duplication"] },
  ]);
}

export function computeUxScore(data: PreauditOutput): number {
  return applyPenaltyRules(data.ux_findings, [
    { penalty: 15, patterns: ["weak or non-prominent cta", "no prominent button-style call-to-action", "low conversion contrast", "text-link style"] },
    { penalty: 10, patterns: ["no sticky header", "no persistent booking prompt", "cta not persistent", "not prominently positioned"] },
    { penalty: 10, patterns: ["above-the-fold lacks", "above-the-fold clarity", "lacks immediate visual hierarchy", "generic"] },
    { penalty: 10, patterns: ["navigation is repeated", "navigation duplicated", "redundant or unclear site structure", "menu rendering issue"] },
    { penalty: 10, patterns: ["trust signals are text-only", "missed trust-building opportunity", "verified review badges", "star ratings"] },
    { penalty: 10, patterns: ["no property filtering", "search bar", "availability calendar", "property filters"] },
    { penalty: 10, patterns: ["form access appears indirect", "conversion friction", "forces users to scroll", "from faq"] },
  ]);
}
