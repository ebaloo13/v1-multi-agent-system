function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`);
  }

  return value;
}

export function requireString(
  value: unknown,
  label: string,
  options?: { allowEmpty?: boolean },
): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }

  const normalized = value.trim();
  if (!options?.allowEmpty && normalized.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }

  return normalized;
}

export function requireStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array of strings`);
  }

  return value.map((entry, index) => requireString(entry, `${label}[${index}]`));
}

export function requireHttpUrl(value: unknown, label: string): string {
  const raw = requireString(value, label);
  const parsed = new URL(raw);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${label} must use http or https`);
  }

  return parsed.toString();
}
