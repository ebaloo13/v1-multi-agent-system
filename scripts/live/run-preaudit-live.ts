import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runPreauditAgent } from "../../src/agents/preaudit-agent.js";
import { slugifyHostnameLabel } from "../../src/common/runNaming.js";
import { PreauditRunError } from "../../src/preaudit/errors.js";
import { getWebContext } from "../../src/preaudit/webContext.js";

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
  const context = await getWebContext(normalizedUrl.toString());
  const companyName = deriveCompanyName(new URL(context.url), context.title);

  const input = {
    company_name: companyName,
    industry: "real estate",
    website: context.url,
    extracted_context: context,
    notes: "live web analysis",
  };

  const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const liveInputPath = path.join(repoRoot, "data", "clients", "preaudit-live.json");
  await fs.mkdir(path.dirname(liveInputPath), { recursive: true });
  await fs.writeFile(liveInputPath, `${JSON.stringify([input], null, 2)}\n`, "utf8");

  process.env.PREAUDIT_INPUT_PATH = liveInputPath;
  process.env.PREAUDIT_CLIENT_SLUG = slugifyHostnameLabel(new URL(context.url).hostname);

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
