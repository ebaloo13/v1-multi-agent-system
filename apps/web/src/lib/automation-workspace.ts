import {
  DEFAULT_WEBSITE,
  formatClientName,
  workspaceHref,
  type WorkspaceSectionId,
} from './product-shell'

export type AutomationTone = 'success' | 'progress' | 'pending' | 'neutral'

export type AutomationAgentStatus = 'active' | 'idle' | 'blocked' | 'reviewing'

export type AutomationTaskStatus =
  | 'recommended'
  | 'queued'
  | 'claimed'
  | 'running'
  | 'human_review'
  | 'blocked'
  | 'completed'
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'in_review'
  | 'done'

export type AutomationArtifactType = 'audit' | 'brief' | 'sop' | 'draft' | 'evidence'

export type AutomationReviewType = 'approval' | 'clarification' | 'blocker' | 'risk_check'

export type MinimalAutomationEntity = {
  entity: string
  purpose: string
  keyFields: string[]
}

export type AutomationRouteProposal = {
  view: string
  route: string
  section: WorkspaceSectionId
  purpose: string
}

export type AutomationAgent = {
  id: string
  name: string
  role: string
  status: AutomationAgentStatus
  tone: AutomationTone
  owner: string
  activeTask: string
  capacity: string
  workstream: string
  skills: string[]
  needs: string[]
  lastSignal: string
}

export type AutomationTask = {
  id: string
  displayId: string
  title: string
  description: string
  status: AutomationTaskStatus
  tone: AutomationTone
  priority: 'urgent' | 'high' | 'medium' | 'low' | 'none'
  assignee: string
  assigneeInitials?: string
  agent?: string
  artifactCount?: number
  workstream: string
  nextStep: string
  blocker?: string
}

export type AutomationRunStep = {
  id: string
  time: string
  actor: string
  title: string
  detail: string
  tone: AutomationTone
}

export type AutomationRun = {
  id: string
  title: string
  status: 'running' | 'waiting_review' | 'completed'
  agent: string
  startedAt: string
  summary: string
  steps: AutomationRunStep[]
}

export type AutomationArtifact = {
  id: string
  title: string
  type: AutomationArtifactType
  status: 'draft' | 'review_ready' | 'approved'
  tone: AutomationTone
  owner: string
  summary: string
  contents: string[]
}

export type AutomationReviewItem = {
  id: string
  title: string
  type: AutomationReviewType
  tone: AutomationTone
  requestedBy: string
  due: string
  decisionNeeded: string
  context: string
}

export type AutomationWorkspace = {
  clientSlug: string
  clientName: string
  website: string
  currentStage: string
  currentStageDetail: string
  recommendedNextLabel: string
  recommendedNextDetail: string
  agents: AutomationAgent[]
  tasks: AutomationTask[]
  runs: AutomationRun[]
  artifacts: AutomationArtifact[]
  reviewQueue: AutomationReviewItem[]
}

export const minimalAutomationEntities: MinimalAutomationEntity[] = [
  {
    entity: 'Client',
    purpose: 'Top-level account and workspace identity.',
    keyFields: ['id', 'slug', 'name', 'website', 'primary_contact'],
  },
  {
    entity: 'Project',
    purpose: 'Commercial engagement containing audit, implementation, and review work.',
    keyFields: ['id', 'client_id', 'name', 'stage', 'health'],
  },
  {
    entity: 'BusinessAudit',
    purpose: 'Structured diagnosis that generates recommendations and automation candidates.',
    keyFields: ['id', 'project_id', 'status', 'findings', 'recommended_agents'],
  },
  {
    entity: 'Agent',
    purpose: 'Reusable business automation worker profile with skills, limits, and ownership.',
    keyFields: ['id', 'name', 'role', 'skills', 'status', 'human_owner'],
  },
  {
    entity: 'Task',
    purpose: 'Lifecycle-managed unit of business work assigned to a human or agent.',
    keyFields: ['id', 'project_id', 'status', 'priority', 'assignee_id', 'blocker_id'],
  },
  {
    entity: 'Run',
    purpose: 'Execution attempt for an agent task, including timeline and generated outputs.',
    keyFields: ['id', 'task_id', 'agent_id', 'status', 'started_at', 'completed_at'],
  },
  {
    entity: 'Artifact',
    purpose: 'Generated or uploaded work product for review and client delivery.',
    keyFields: ['id', 'run_id', 'type', 'status', 'summary', 'review_state'],
  },
  {
    entity: 'ReviewItem',
    purpose: 'Human approval, clarification, risk, or blocker decision required before progress.',
    keyFields: ['id', 'artifact_id', 'task_id', 'type', 'decision_needed', 'owner'],
  },
]

export const automationRouteProposal: AutomationRouteProposal[] = [
  {
    view: 'Client workspace dashboard',
    route: '/workspace/:clientSlug',
    section: 'dashboard',
    purpose: 'Executive overview of stage, work health, active agents, blockers, and outputs.',
  },
  {
    view: 'Agent board',
    route: '/workspace/:clientSlug/agent-board',
    section: 'agentBoard',
    purpose: 'Human-plus-agent operating board organized around responsibility and capacity.',
  },
  {
    view: 'Task lifecycle board',
    route: '/workspace/:clientSlug/task-lifecycle',
    section: 'taskLifecycle',
    purpose: 'Business task flow from recommendation to queued, running, review, blocked, and complete.',
  },
  {
    view: 'Run timeline',
    route: '/workspace/:clientSlug/run-timeline',
    section: 'runTimeline',
    purpose: 'Chronological view of what agents did, what they produced, and where they need input.',
  },
  {
    view: 'Artifact viewer',
    route: '/workspace/:clientSlug/artifacts',
    section: 'artifacts',
    purpose: 'Review drafts, SOPs, briefs, audit excerpts, and evidence generated by runs.',
  },
  {
    view: 'Human review queue',
    route: '/workspace/:clientSlug/review',
    section: 'reviewQueue',
    purpose: 'Approval and clarification queue for decisions that should not be automated silently.',
  },
  {
    view: 'Agent profile cards',
    route: '/workspace/:clientSlug/agent-profiles',
    section: 'agentProfiles',
    purpose: 'Capability cards showing each agent role, skills, constraints, and active assignment.',
  },
]

export function buildAutomationWorkspace(clientSlug: string): AutomationWorkspace {
  const safeSlug = clientSlug.trim() || 'harborview-demo'
  const clientName = formatClientName(safeSlug)

  return {
    clientSlug: safeSlug,
    clientName,
    website: DEFAULT_WEBSITE,
    currentStage: 'Automation design',
    currentStageDetail:
      'Audit findings are being converted into agent-supported workstreams and reviewable outputs.',
    recommendedNextLabel: 'Review open decisions',
    recommendedNextDetail:
      'Approve the sales follow-up SOP and resolve the CRM access blocker before more work is automated.',
    agents: [
      {
        id: 'agent-sales-ops',
        name: 'Sales Follow-up Agent',
        role: 'Turns lead handling gaps into response scripts, routing rules, and follow-up tasks.',
        status: 'active',
        tone: 'success',
        owner: 'Growth lead',
        activeTask: 'Draft missed-lead recovery workflow',
        capacity: '2 of 3 runs active',
        workstream: 'Sales follow-up',
        skills: ['Lead triage', 'CRM notes', 'Follow-up scripts'],
        needs: ['Approved tone of voice', 'CRM field list'],
        lastSignal: 'Produced SOP draft and requested approval on two escalation rules.',
      },
      {
        id: 'agent-ops',
        name: 'Operations Mapping Agent',
        role: 'Documents manual handoffs and proposes automation-safe operating procedures.',
        status: 'blocked',
        tone: 'pending',
        owner: 'Operations owner',
        activeTask: 'Map booking-to-delivery handoff',
        capacity: 'Waiting on access',
        workstream: 'CRM / back-office review',
        skills: ['Process mapping', 'SOP drafting', 'Exception handling'],
        needs: ['Booking export', 'Owner interview notes'],
        lastSignal: 'Blocked until the booking export is uploaded or manually summarized.',
      },
      {
        id: 'agent-insights',
        name: 'Audit Insights Agent',
        role: 'Converts audit evidence into recommendations, risks, and client-safe summaries.',
        status: 'reviewing',
        tone: 'progress',
        owner: 'Consultant',
        activeTask: 'Prepare automation readiness brief',
        capacity: '1 review pending',
        workstream: 'Business audit',
        skills: ['Finding synthesis', 'Impact framing', 'Recommendation ranking'],
        needs: ['Human risk check'],
        lastSignal: 'Flagged one recommendation as high impact but requiring human review.',
      },
      {
        id: 'agent-growth',
        name: 'Growth Experiment Agent',
        role: 'Creates test plans for acquisition, conversion, and nurture improvements.',
        status: 'idle',
        tone: 'neutral',
        owner: 'Marketing lead',
        activeTask: 'No active task',
        capacity: 'Ready for assignment',
        workstream: 'Website improvement',
        skills: ['Landing page QA', 'CTA testing', 'Experiment briefs'],
        needs: ['Prioritized offer'],
        lastSignal: 'Ready once the homepage CTA recommendation is approved.',
      },
    ],
    tasks: [
      {
        id: 'task-001',
        displayId: 'AUT-1',
        title: 'Prioritize audit findings into first automation project',
        description: 'Convert preaudit evidence into an execution-ready first project.',
        status: 'done',
        tone: 'success',
        priority: 'high',
        assignee: 'Audit Insights Agent',
        assigneeInitials: 'AI',
        agent: 'Audit Insights Agent',
        artifactCount: 1,
        workstream: 'Business audit',
        nextStep: 'Use ranking to scope implementation tracks.',
      },
      {
        id: 'task-002',
        displayId: 'AUT-2',
        title: 'Draft missed-lead recovery workflow',
        description: 'Create response timing, routing rules, and follow-up copy.',
        status: 'in_progress',
        tone: 'progress',
        priority: 'high',
        assignee: 'Sales Follow-up Agent',
        assigneeInitials: 'SF',
        agent: 'Sales Follow-up Agent',
        artifactCount: 2,
        workstream: 'Sales follow-up',
        nextStep: 'Generate reviewable SOP and escalation copy.',
      },
      {
        id: 'task-003',
        displayId: 'AUT-3',
        title: 'Approve escalation rules for hot leads',
        description: 'Human review for when the agent should notify owners.',
        status: 'in_review',
        tone: 'pending',
        priority: 'urgent',
        assignee: 'Growth lead',
        assigneeInitials: 'GL',
        agent: 'Sales Follow-up Agent',
        workstream: 'Sales follow-up',
        nextStep: 'Decide when the agent should notify a human.',
      },
      {
        id: 'task-004',
        displayId: 'AUT-4',
        title: 'Map booking-to-delivery handoff',
        description: 'Document operations bottlenecks without inventing missing steps.',
        status: 'todo',
        tone: 'pending',
        priority: 'medium',
        assignee: 'Operations Mapping Agent',
        assigneeInitials: 'OM',
        agent: 'Operations Mapping Agent',
        workstream: 'CRM / back-office review',
        nextStep: 'Upload booking export or provide a manual process summary.',
        blocker: 'Booking export is not available yet.',
      },
      {
        id: 'task-005',
        displayId: 'AUT-5',
        title: 'Create homepage CTA test brief',
        description: 'Frame a conversion experiment from the automation recommendation.',
        status: 'backlog',
        tone: 'neutral',
        priority: 'medium',
        assignee: 'Growth Experiment Agent',
        assigneeInitials: 'GE',
        agent: 'Growth Experiment Agent',
        artifactCount: 1,
        workstream: 'Website improvement',
        nextStep: 'Start after sales workflow review is complete.',
      },
      {
        id: 'task-006',
        displayId: 'AUT-6',
        title: 'Claim CRM field audit',
        description: 'Check fields needed for sales intake and collections workflow.',
        status: 'todo',
        tone: 'progress',
        priority: 'low',
        assignee: 'Operations Mapping Agent',
        assigneeInitials: 'OM',
        agent: 'Operations Mapping Agent',
        workstream: 'CRM / back-office review',
        nextStep: 'Confirm available fields before drafting automation rules.',
      },
      {
        id: 'task-007',
        displayId: 'AUT-7',
        title: 'Recommend follow-up reporting signals',
        description: 'Define weekly signals for client artifacts and impact tracking.',
        status: 'backlog',
        tone: 'neutral',
        priority: 'medium',
        assignee: 'Unassigned',
        assigneeInitials: 'U',
        workstream: 'Impact tracking',
        nextStep: 'Approve if weekly reporting is in scope.',
      },
      {
        id: 'task-008',
        displayId: 'AUT-8',
        title: 'Prepare collections workflow intake',
        description: 'List inputs needed before drafting payment follow-up automation.',
        status: 'in_review',
        tone: 'progress',
        priority: 'high',
        assignee: 'Consultant',
        assigneeInitials: 'CO',
        workstream: 'Collections workflow',
        nextStep: 'Confirm client policy boundaries before assigning an agent.',
      },
      {
        id: 'task-009',
        displayId: 'AUT-9',
        title: 'Publish client artifact packet',
        description: 'Package approved evidence and SOP drafts for the client workspace.',
        status: 'done',
        tone: 'success',
        priority: 'low',
        assignee: 'Consultant',
        assigneeInitials: 'CO',
        artifactCount: 3,
        workstream: 'Client artifacts',
        nextStep: 'Share after the review queue is cleared.',
      },
    ],
    runs: [
      {
        id: 'run-sales-014',
        title: 'Missed-lead recovery workflow run',
        status: 'waiting_review',
        agent: 'Sales Follow-up Agent',
        startedAt: 'Today, 9:14 AM',
        summary:
          'Built a first-pass SOP, identified two escalation paths, and generated client-safe approval questions.',
        steps: [
          {
            id: 'run-sales-014-1',
            time: '9:14 AM',
            actor: 'Sales Follow-up Agent',
            title: 'Claimed task',
            detail: 'Loaded audit findings, lead source notes, and response-time concerns.',
            tone: 'progress',
          },
          {
            id: 'run-sales-014-2',
            time: '9:22 AM',
            actor: 'Sales Follow-up Agent',
            title: 'Drafted workflow',
            detail: 'Created a three-stage follow-up sequence for new, warm, and dormant leads.',
            tone: 'success',
          },
          {
            id: 'run-sales-014-3',
            time: '9:31 AM',
            actor: 'Sales Follow-up Agent',
            title: 'Raised review item',
            detail: 'Escalation timing should be approved before the workflow is activated.',
            tone: 'pending',
          },
        ],
      },
      {
        id: 'run-ops-009',
        title: 'Booking handoff mapping run',
        status: 'running',
        agent: 'Operations Mapping Agent',
        startedAt: 'Yesterday, 4:48 PM',
        summary:
          'Mapped known handoff assumptions and stopped before inventing missing booking system details.',
        steps: [
          {
            id: 'run-ops-009-1',
            time: '4:48 PM',
            actor: 'Operations Mapping Agent',
            title: 'Started process map',
            detail: 'Outlined likely sales-to-operations stages from intake notes.',
            tone: 'progress',
          },
          {
            id: 'run-ops-009-2',
            time: '5:03 PM',
            actor: 'Operations Mapping Agent',
            title: 'Reported blocker',
            detail: 'Needs booking export or human summary to avoid false process assumptions.',
            tone: 'pending',
          },
        ],
      },
    ],
    artifacts: [
      {
        id: 'artifact-sop-sales',
        title: 'Missed-lead recovery SOP',
        type: 'sop',
        status: 'review_ready',
        tone: 'progress',
        owner: 'Sales Follow-up Agent',
        summary:
          'A review-ready operating procedure for routing, timing, and follow-up language after a new inquiry.',
        contents: [
          'Define hot, warm, and dormant lead categories from available lead context.',
          'Route hot leads to a human owner within 15 minutes during business hours.',
          'Use a three-touch follow-up sequence before marking a lead dormant.',
        ],
      },
      {
        id: 'artifact-readiness-brief',
        title: 'Automation readiness brief',
        type: 'brief',
        status: 'draft',
        tone: 'neutral',
        owner: 'Audit Insights Agent',
        summary:
          'Consultant-facing brief summarizing what can be safely automated now versus after more input.',
        contents: [
          'Sales follow-up is the strongest first automation candidate.',
          'CRM and booking work should wait for source-of-truth confirmation.',
          'Website experiments are useful but secondary to response-time fixes.',
        ],
      },
      {
        id: 'artifact-audit-evidence',
        title: 'Audit evidence packet',
        type: 'evidence',
        status: 'approved',
        tone: 'success',
        owner: 'Consultant',
        summary:
          'Client-safe summary of findings used to justify the current automation priorities.',
        contents: [
          'CTA path needs clearer ownership after submission.',
          'Lead response expectations are not visible enough.',
          'Tracking exists but does not yet prove closed-revenue attribution.',
        ],
      },
    ],
    reviewQueue: [
      {
        id: 'review-001',
        title: 'Approve hot-lead escalation rule',
        type: 'approval',
        tone: 'pending',
        requestedBy: 'Sales Follow-up Agent',
        due: 'Today',
        decisionNeeded:
          'Should a lead with urgent language notify the owner immediately, or wait until business hours?',
        context: 'This affects how aggressively the agent routes new inquiries.',
      },
      {
        id: 'review-002',
        title: 'Clarify booking export availability',
        type: 'blocker',
        tone: 'pending',
        requestedBy: 'Operations Mapping Agent',
        due: 'Tomorrow',
        decisionNeeded:
          'Can the client provide an export, or should the team document the process through interview notes?',
        context: 'The operations workflow should not be inferred without a source of truth.',
      },
      {
        id: 'review-003',
        title: 'Risk check on dormant-lead messaging',
        type: 'risk_check',
        tone: 'progress',
        requestedBy: 'Audit Insights Agent',
        due: 'This week',
        decisionNeeded:
          'Confirm whether the proposed copy is appropriate for the client relationship and sales cycle.',
        context: 'The agent drafted copy, but human tone review is required before activation.',
      },
    ],
  }
}

export function automationHref(clientSlug: string, section: WorkspaceSectionId) {
  return workspaceHref(clientSlug, section)
}
