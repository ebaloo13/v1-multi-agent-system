import { z } from "zod";

export const OperationsIssueTypeSchema = z.enum([
  "schedule_gap",
  "no_show",
  "idle_capacity",
  "overbooking",
  "coordination_issue",
]);

export const OperationsIssueSchema = z.object({
  entity: z.string(),
  type: OperationsIssueTypeSchema,
  priority_score: z.number().min(0).max(100),
  reason: z.string(),
  suggested_action: z.string(),
  message_draft: z.string(),
});

export const OperationsOutputSchema = z.object({
  summary: z.string(),
  issues: z.array(OperationsIssueSchema),
});

export type OperationsOutput = z.infer<typeof OperationsOutputSchema>;

export const WorkItemTypeSchema = z.enum([
  "message",
  "lead",
  "task",
  "payment",
  "booking",
  "event",
  "staff_confirmation",
  "file_review",
  "support",
]);

export const WorkItemStatusSchema = z.enum([
  "new",
  "in_progress",
  "waiting",
  "needs_review",
  "ready",
  "done",
]);

export const BusinessModuleKeySchema = z.enum([
  "inbox",
  "tasks",
  "payments",
  "schedule",
  "files",
  "settings",
  "integrations",
]);

export const FunnelStageAutomationPolicySchema = z.object({
  canMoveStage: z.boolean().optional(),
  canCloseAsWon: z.boolean().optional(),
  canCloseAsLost: z.boolean().optional(),
  canCreateInternalNote: z.boolean().optional(),
  canApplyTags: z.boolean().optional(),
  canTriggerWorkflow: z.boolean().optional(),
  requiresHumanApproval: z.boolean().optional(),
});

export const FunnelStageSchema = z.object({
  id: z.string(),
  label: z.string(),
  order: z.number().int().nonnegative(),
  status: WorkItemStatusSchema,
  description: z.string().optional(),
  state: z.enum(["open", "won", "lost", "closed"]).optional(),
  assistantKey: z.string().optional(),
  automationPolicy: FunnelStageAutomationPolicySchema.optional(),
});

export const FunnelSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  key: z.string(),
  label: z.string(),
  moduleKey: BusinessModuleKeySchema,
  priority: z.enum(["critical", "high", "medium", "low"]),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().nonnegative().optional(),
  stages: z.array(FunnelStageSchema),
});

export const EntityRefSchema = z.object({
  id: z.string(),
  type: z.string(),
});

export const ContactChannelSchema = z.object({
  type: z.enum(["email", "phone", "sms", "whatsapp", "instagram", "facebook", "website", "other"]),
  value: z.string(),
  label: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export const ContactSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  displayName: z.string(),
  companyName: z.string().optional(),
  role: z.string().optional(),
  channels: z.array(ContactChannelSchema).default([]),
  tags: z.array(z.string()).default([]),
  source: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ConversationMessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderContactId: z.string().optional(),
  senderLabel: z.string(),
  body: z.string(),
  direction: z.enum(["inbound", "outbound", "internal"]),
  createdAt: z.string(),
  attachments: z.array(EntityRefSchema).default([]),
});

export const ConversationSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  channel: z.enum(["email", "sms", "whatsapp", "web_chat", "social", "phone", "internal", "other"]),
  subject: z.string().optional(),
  status: z.enum(["open", "waiting", "closed"]).default("open"),
  participantContactIds: z.array(z.string()).default([]),
  linkedWorkItemIds: z.array(z.string()).default([]),
  lastMessageAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const PaymentSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  contactId: z.string().optional(),
  workItemId: z.string().optional(),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().default("USD"),
  status: z.enum(["draft", "requested", "partially_paid", "paid", "overdue", "failed", "refunded"]),
  dueAt: z.string().optional(),
  paidAt: z.string().optional(),
  externalUrl: z.string().url().optional(),
  provider: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ScheduleItemSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  contactId: z.string().optional(),
  workItemId: z.string().optional(),
  title: z.string(),
  type: z.enum(["booking", "appointment", "event", "shift", "deadline", "reminder"]),
  status: z.enum(["tentative", "confirmed", "needs_confirmation", "cancelled", "completed"]),
  startsAt: z.string(),
  endsAt: z.string().optional(),
  location: z.string().optional(),
  confirmationContactIds: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const FileOutputSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  workItemId: z.string().optional(),
  title: z.string(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  status: z.enum(["draft", "needs_review", "approved", "sent", "archived"]),
  storagePath: z.string().optional(),
  externalUrl: z.string().url().optional(),
  summary: z.string().optional(),
  createdBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const WorkItemSchema = z.object({
  id: z.string(),
  businessId: z.string(),
  type: WorkItemTypeSchema,
  status: WorkItemStatusSchema.default("new"),
  title: z.string(),
  description: z.string().optional(),
  priority: z.enum(["urgent", "high", "medium", "low", "none"]).default("none"),
  moduleKey: BusinessModuleKeySchema,
  contactId: z.string().optional(),
  conversationId: z.string().optional(),
  paymentId: z.string().optional(),
  scheduleItemId: z.string().optional(),
  fileOutputId: z.string().optional(),
  assigneeId: z.string().optional(),
  source: z.enum(["manual", "conversation", "automation", "integration", "vertical_pack"]).default("manual"),
  relatedEntities: z.array(EntityRefSchema).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
  dueAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
});

export const WorkItemAssistantResultSchema = z.object({
  id: z.string(),
  clientSlug: z.string(),
  workItemId: z.string(),
  assistantKey: z.string(),
  stageId: z.string().optional(),
  summary: z.string(),
  suggestedNextAction: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  createdAt: z.string(),
});

export const BusinessModuleSchema = z.object({
  key: BusinessModuleKeySchema,
  label: z.string(),
  description: z.string(),
  supportedWorkItemTypes: z.array(WorkItemTypeSchema),
  isCore: z.boolean().default(true),
  isEnabled: z.boolean().default(true),
});

export const VerticalPackSchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  description: z.string(),
  verticals: z.array(z.string()).default([]),
  moduleKeys: z.array(BusinessModuleKeySchema).default([]),
  workItemTypes: z.array(WorkItemTypeSchema).default([]),
  requiredIntegrationKeys: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const LegacyRequestStatusSchema = z.enum([
  "new",
  "inProgress",
  "needsReview",
  "ready",
  "humanSupport",
]);

export type WorkItemType = z.infer<typeof WorkItemTypeSchema>;
export type WorkItemStatus = z.infer<typeof WorkItemStatusSchema>;
export type FunnelStage = z.infer<typeof FunnelStageSchema>;
export type Funnel = z.infer<typeof FunnelSchema>;
export type BusinessModuleKey = z.infer<typeof BusinessModuleKeySchema>;
export type Contact = z.infer<typeof ContactSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;
export type WorkItem = z.infer<typeof WorkItemSchema>;
export type WorkItemAssistantResult = z.infer<typeof WorkItemAssistantResultSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type ScheduleItem = z.infer<typeof ScheduleItemSchema>;
export type FileOutput = z.infer<typeof FileOutputSchema>;
export type BusinessModule = z.infer<typeof BusinessModuleSchema>;
export type VerticalPack = z.infer<typeof VerticalPackSchema>;
export type LegacyRequestStatus = z.infer<typeof LegacyRequestStatusSchema>;

export type Request = WorkItem;
export type ClientRequest = WorkItem;

export const legacyRequestStatusToWorkItemStatus: Record<LegacyRequestStatus, WorkItemStatus> = {
  new: "new",
  inProgress: "in_progress",
  needsReview: "needs_review",
  ready: "ready",
  humanSupport: "waiting",
};

export const automationTaskStatusToWorkItemStatus = {
  recommended: "new",
  queued: "new",
  claimed: "in_progress",
  running: "in_progress",
  human_review: "needs_review",
  blocked: "waiting",
  completed: "done",
  backlog: "new",
  todo: "new",
  in_progress: "in_progress",
  in_review: "needs_review",
  done: "done",
} as const satisfies Record<string, WorkItemStatus>;

export function mapLegacyRequestStatus(status: LegacyRequestStatus): WorkItemStatus {
  return legacyRequestStatusToWorkItemStatus[status];
}
