import type { AuditInputStage1, AuditIntake } from "./types.js";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

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

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueStrings(value.map((entry) => normalizeText(entry)));
}

function normalizeOptionalNote(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeDigitalPresence(value: AuditIntake["digital_presence"]): string[] {
  if (typeof value === "string") {
    return value.trim().length > 0 ? [value.trim()] : [];
  }

  if (Array.isArray(value)) {
    return normalizeStringList(value);
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const normalizedEntries: string[] = [];

  for (const [key, entry] of Object.entries(value)) {
    const label = key.replace(/_/g, " ").trim();

    if (entry === true) {
      normalizedEntries.push(label);
      continue;
    }

    if (typeof entry === "string") {
      const normalized = entry.trim();
      if (normalized.length > 0) {
        normalizedEntries.push(`${label}: ${normalized}`);
      }
      continue;
    }

    if (typeof entry === "number") {
      normalizedEntries.push(`${label}: ${entry}`);
    }
  }

  return uniqueStrings(normalizedEntries);
}

export function fromIntake(intake: AuditIntake = {}): AuditInputStage1 {
  const companyProfile = asRecord(intake.company_profile);
  const companyName =
    normalizeText(companyProfile?.name) || normalizeText(intake.company_name);
  const industry =
    normalizeText(companyProfile?.industry) || normalizeText(intake.industry);
  const businessModel =
    normalizeOptionalNote(companyProfile?.business_model) ??
    normalizeOptionalNote(intake.business_model);
  const location =
    normalizeOptionalNote(companyProfile?.location) ?? normalizeOptionalNote(intake.location);
  const businessGoals = normalizeStringList(intake.business_goals);
  const explicitKnownPains = normalizeStringList(intake.known_pains);
  const fallbackKnownProblems = normalizeStringList(intake.known_problems);
  const availableSystems = uniqueStrings([
    ...normalizeStringList(intake.available_systems),
    ...normalizeStringList(intake.systems_available),
  ]);
  const availableAssets = uniqueStrings([
    ...normalizeStringList(intake.available_assets),
    ...normalizeDigitalPresence(intake.digital_presence),
  ]);
  const salesNotes = normalizeOptionalNote(intake.sales_notes);
  const operationsNotes = normalizeOptionalNote(intake.operations_notes);
  const collectionsNotes = normalizeOptionalNote(intake.collections_notes);
  const generalNotes = normalizeOptionalNote(intake.notes);
  const knownPains =
    explicitKnownPains.length > 0
      ? explicitKnownPains
      : fallbackKnownProblems.length > 0
        ? fallbackKnownProblems
        : uniqueStrings([
            ...(salesNotes ? [salesNotes] : []),
            ...(operationsNotes ? [operationsNotes] : []),
            ...(collectionsNotes ? [collectionsNotes] : []),
          ]);
  const missingInformation: string[] = [];

  if (companyName.length === 0) {
    missingInformation.push("No company name provided.");
  }

  if (industry.length === 0) {
    missingInformation.push("No industry provided.");
  }

  if (businessGoals.length === 0) {
    missingInformation.push("No clear business goal provided.");
  }

  if (knownPains.length === 0) {
    missingInformation.push("No known pains provided.");
  }

  if (availableSystems.length === 0) {
    missingInformation.push("No systems listed.");
  }

  if (!salesNotes) {
    missingInformation.push("No sales process information provided.");
  }

  if (!operationsNotes) {
    missingInformation.push("No operational constraints provided.");
  }

  return {
    company_profile: {
      name: companyName,
      industry,
      business_model: businessModel ?? "",
      location: location ?? "",
    },
    business_goals: businessGoals,
    known_pains: knownPains,
    available_assets: availableAssets,
    available_systems: availableSystems,
    notes: generalNotes ?? "",
    missing_information: missingInformation,
  };
}
