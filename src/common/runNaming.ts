import fs from "node:fs/promises";
import path from "node:path";

type RunJsonWithDisplayId = {
  display_run_id?: unknown;
};

const DOMAIN_SUFFIX_HINTS = [
  "propiedades",
  "properties",
  "realty",
  "dental",
  "clinic",
  "group",
  "studio",
  "studios",
  "homes",
];

function normalizeSlugParts(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter((part) => part.length > 0);
}

export function slugifyClientName(value: string): string {
  const parts = normalizeSlugParts(value);
  return parts.length > 0 ? parts.join("-") : "generic-client";
}

export function slugifyHostnameLabel(hostname: string): string {
  const baseLabel = hostname
    .toLowerCase()
    .replace(/^www\./, "")
    .split(".")[0] ?? hostname;

  for (const hint of DOMAIN_SUFFIX_HINTS) {
    if (baseLabel.endsWith(hint) && baseLabel.length > hint.length) {
      const prefix = baseLabel.slice(0, baseLabel.length - hint.length);
      return slugifyClientName(`${prefix} ${hint}`);
    }
  }

  return slugifyClientName(baseLabel);
}

export function deriveClientSlugFromRecord(record: unknown, fallback = "generic-client"): string {
  if (record && typeof record === "object") {
    const companyName =
      "company_name" in record && typeof record.company_name === "string"
        ? record.company_name
        : "";
    if (companyName.trim().length > 0) {
      return slugifyClientName(companyName);
    }

    const website = "website" in record && typeof record.website === "string" ? record.website : "";
    if (website.trim().length > 0) {
      try {
        return slugifyHostnameLabel(new URL(website).hostname);
      } catch {
        // Fall back below
      }
    }
  }

  return fallback;
}

export async function nextDisplayRunId(
  repoRoot: string,
  agent: "preaudit" | "audit",
  clientSlug: string,
): Promise<string> {
  const safeSlug = slugifyClientName(clientSlug);
  const runsDir = path.join(repoRoot, "artifacts", "runs");
  const entries = await fs.readdir(runsDir, { withFileTypes: true }).catch(() => []);
  const prefix = `${agent}-${safeSlug}-`;
  let highestSequence = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const runJsonPath = path.join(runsDir, entry.name, "run.json");
    let parsed: RunJsonWithDisplayId;
    try {
      parsed = JSON.parse(await fs.readFile(runJsonPath, "utf8")) as RunJsonWithDisplayId;
    } catch {
      continue;
    }

    if (typeof parsed.display_run_id !== "string" || !parsed.display_run_id.startsWith(prefix)) {
      continue;
    }

    const sequenceText = parsed.display_run_id.slice(prefix.length);
    const sequence = Number.parseInt(sequenceText, 10);
    if (Number.isInteger(sequence) && sequence > highestSequence) {
      highestSequence = sequence;
    }
  }

  const nextSequence = String(highestSequence + 1).padStart(4, "0");
  return `${agent}-${safeSlug}-${nextSequence}`;
}
