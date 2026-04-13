import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runPreauditAgent } from "../../src/agents/preaudit-agent.js";
import { slugifyHostnameLabel } from "../../src/common/runNaming.js";
import { PreauditRunError } from "../../src/preaudit/errors.js";
import { runPreauditFactsCollection } from "../../src/tools/harness.js";

function parseUrlArg(argv: string[]): string {
  const arg = argv.find((value) => value.startsWith("--url="));
  if (arg) {
    return arg.slice("--url=".length);
  }

  const index = argv.indexOf("--url");
  if (index >= 0 && index + 1 < argv.length) {
    return argv[index + 1] ?? "";
  }

  throw new Error("Missing required --url argument");
}

function deriveCompanyName(url: URL, title: string): string {
  if (title.trim().length > 0) {
    return title
      .split(/[|\-–—]/)[0]
      .trim();
  }

  const hostname = url.hostname.replace(/^www\./, "");
  const domainLabel = hostname.split(".")[0] ?? hostname;
  return domainLabel
    .split(/[-_]/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function main() {
  const urlArg = parseUrlArg(process.argv.slice(2));
  const normalizedUrl = new URL(urlArg);
  const facts = await runPreauditFactsCollection(normalizedUrl.toString());
  const companyName = deriveCompanyName(
    new URL(facts.extracted_context.url),
    facts.extracted_context.title,
  );
  console.log(`tools_used: ${facts.tools_used.join(", ")}`);

  const input = {
    company_name: companyName,
    industry: "real estate",
    website: facts.extracted_context.url,
    digital_presence: facts.digital_presence,
    extracted_context: facts.extracted_context,
    notes: "live web analysis via tool harness",
  };

  const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const liveInputPath = path.join(repoRoot, "data", "clients", "preaudit-live.json");
  await fs.mkdir(path.dirname(liveInputPath), { recursive: true });
  await fs.writeFile(liveInputPath, `${JSON.stringify([input], null, 2)}\n`, "utf8");

  process.env.PREAUDIT_INPUT_PATH = liveInputPath;
  process.env.PREAUDIT_CLIENT_SLUG = slugifyHostnameLabel(
    new URL(facts.extracted_context.url).hostname,
  );
  process.env.PREAUDIT_TOOLS_USED = facts.tools_used.join(",");
  process.env.PREAUDIT_FACTS_COLLECTION_SOURCE = facts.facts_collection_source;

  try {
    const result = await runPreauditAgent(0);
    console.log("artifactDir:", result.artifactDir);
  } catch (err) {
    if (err instanceof PreauditRunError) {
      console.error("PreauditRunError:", err.code, err.details ?? "");
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

await main();
