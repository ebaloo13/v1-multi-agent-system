export type PreauditSiteType =
  | "local_service"
  | "real_estate"
  | "clinic"
  | "gym"
  | "sme_ecommerce"
  | "enterprise_brand"
  | "media_platform"
  | "unknown";

export type PreauditFrameworkFit = "good" | "partial" | "poor";
export type PreauditScopeConfidence = "low" | "medium" | "high";

export type PreauditScopeClassification = {
  site_type: PreauditSiteType;
  framework_fit: PreauditFrameworkFit;
  confidence: PreauditScopeConfidence;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function extractContextText(record: Record<string, unknown>): string {
  const extractedContext =
    record.extracted_context && typeof record.extracted_context === "object"
      ? (record.extracted_context as Record<string, unknown>)
      : {};

  const headings =
    extractedContext.headings && typeof extractedContext.headings === "object"
      ? JSON.stringify(extractedContext.headings)
      : "";
  const links = Array.isArray(extractedContext.links)
    ? extractedContext.links.join(" ")
    : "";

  return [
    normalizeText(record.company_name),
    normalizeText(record.industry),
    normalizeText(record.website),
    normalizeText(record.notes),
    normalizeText(extractedContext.title),
    normalizeText(extractedContext.description),
    normalizeText(extractedContext.content),
    headings.toLowerCase(),
    links.toLowerCase(),
  ].join("\n");
}

function countMatches(haystack: string, patterns: string[]): number {
  return patterns.reduce((count, pattern) => count + (haystack.includes(pattern) ? 1 : 0), 0);
}

export function classifyPreauditScope(input: unknown): PreauditScopeClassification {
  if (!input || typeof input !== "object") {
    return {
      site_type: "unknown",
      framework_fit: "partial",
      confidence: "low",
    };
  }

  const record = input as Record<string, unknown>;
  const haystack = extractContextText(record);

  const realEstateSignals = countMatches(haystack, [
    "propiedad",
    "propiedades",
    "arriendo",
    "arriendos",
    "inmobili",
    "real estate",
    "property",
    "rental",
    "rentals",
    "booking",
    "departamento",
    "departments",
  ]);
  const clinicSignals = countMatches(haystack, [
    "clinic",
    "dental",
    "odont",
    "patient",
    "appointment",
    "medical",
    "salud",
  ]);
  const gymSignals = countMatches(haystack, [
    "gym",
    "fitness",
    "training",
    "membership",
    "classes",
    "wellness",
    "workout",
  ]);
  const ecommerceSignals = countMatches(haystack, [
    "shop",
    "store",
    "cart",
    "checkout",
    "buy now",
    "sku",
    "catalog",
    "product",
  ]);
  const enterpriseSignals = countMatches(haystack, [
    "investor",
    "newsroom",
    "developer",
    "developers",
    "privacy",
    "enterprise",
    "global",
    "worldwide",
    "icloud",
    "iphone",
    "ipad",
    "mac",
    "watch",
    "tv",
    "support",
  ]);
  const mediaSignals = countMatches(haystack, [
    "podcast",
    "articles",
    "news",
    "magazine",
    "video",
    "streaming",
    "episodes",
    "media platform",
  ]);
  const localServiceSignals = countMatches(haystack, [
    "contacto",
    "contact",
    "services",
    "servicios",
    "book now",
    "reservar",
    "quote",
    "cotizar",
    "location",
    "hours",
  ]);

  if (enterpriseSignals >= 4) {
    return {
      site_type: "enterprise_brand",
      framework_fit: "poor",
      confidence: enterpriseSignals >= 6 ? "high" : "medium",
    };
  }

  if (mediaSignals >= 3) {
    return {
      site_type: "media_platform",
      framework_fit: "poor",
      confidence: mediaSignals >= 5 ? "high" : "medium",
    };
  }

  if (realEstateSignals >= 3) {
    return {
      site_type: "real_estate",
      framework_fit: "good",
      confidence: realEstateSignals >= 5 ? "high" : "medium",
    };
  }

  if (clinicSignals >= 3) {
    return {
      site_type: "clinic",
      framework_fit: "good",
      confidence: clinicSignals >= 5 ? "high" : "medium",
    };
  }

  if (gymSignals >= 3) {
    return {
      site_type: "gym",
      framework_fit: "good",
      confidence: gymSignals >= 5 ? "high" : "medium",
    };
  }

  if (ecommerceSignals >= 3) {
    return {
      site_type: "sme_ecommerce",
      framework_fit: "partial",
      confidence: ecommerceSignals >= 5 ? "high" : "medium",
    };
  }

  if (localServiceSignals >= 3) {
    return {
      site_type: "local_service",
      framework_fit: "good",
      confidence: localServiceSignals >= 5 ? "high" : "medium",
    };
  }

  return {
    site_type: "unknown",
    framework_fit: "partial",
    confidence: "low",
  };
}
