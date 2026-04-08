import { CollectionsRunError } from "../src/collections/errors.js";
import { runCollectionsAgent } from "../src/agents/collections-agent.js";

try {
  const result = await runCollectionsAgent();
  console.log("artifactDir:", result.artifactDir);
} catch (err) {
  if (err instanceof CollectionsRunError) {
    console.error("CollectionsRunError:", err.code, err.details ?? "");
  } else {
    console.error(err);
  }
  process.exit(1);
}