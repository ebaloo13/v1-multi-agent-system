import {
  FunnelSchema,
  type Funnel,
  type FunnelStage,
} from "../../schemas/operations.js";
import { slugifyClientName } from "../../shared/runNaming.js";

const DEFAULT_WORK_ITEM_FUNNEL_KEY = "default_work_item_funnel";

const DEFAULT_WORK_ITEM_FUNNEL_STAGES: FunnelStage[] = [
  {
    id: "new",
    label: "New",
    order: 0,
    status: "new",
  },
  {
    id: "in-progress",
    label: "In Progress",
    order: 1,
    status: "in_progress",
  },
  {
    id: "waiting",
    label: "Waiting",
    order: 2,
    status: "waiting",
  },
  {
    id: "needs-review",
    label: "Needs Review",
    order: 3,
    status: "needs_review",
  },
  {
    id: "ready",
    label: "Ready",
    order: 4,
    status: "ready",
  },
  {
    id: "done",
    label: "Done",
    order: 5,
    status: "done",
  },
];

function normalizeClientSlug(clientSlug: string): string {
  return slugifyClientName(clientSlug);
}

export function getDefaultWorkItemFunnel(clientSlug: string): Funnel {
  const safeSlug = normalizeClientSlug(clientSlug);

  return FunnelSchema.parse({
    id: `${safeSlug}-${DEFAULT_WORK_ITEM_FUNNEL_KEY}`,
    businessId: safeSlug,
    key: DEFAULT_WORK_ITEM_FUNNEL_KEY,
    label: "Work Items",
    stages: DEFAULT_WORK_ITEM_FUNNEL_STAGES,
  });
}
