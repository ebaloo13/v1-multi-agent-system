export const DEFAULT_WEBSITE = 'https://www.harborview-demo.com'

export const publicNavItems = [
  {
    label: 'How It Works',
    href: '#how-it-works',
  },
  {
    label: 'What It Checks',
    href: '#preaudit-checks',
  },
  {
    label: 'Why It Matters',
    href: '#why-it-matters',
  },
  {
    label: 'Run Diagnostic',
    href: '#lead-capture',
  },
] as const

export const heroProofPoints = [
  'Fast preaudit for service-led businesses and local operators',
  'Website, lead flow, tracking, and operations reviewed in one pass',
  'Clear handoff into a client workspace and deeper audit path',
] as const

export const capabilityModules = [
  {
    title: 'Conversion diagnostics',
    detail: 'Identify weak calls to action, friction in inquiry paths, and unclear purchase momentum.',
  },
  {
    title: 'Search visibility',
    detail: 'Surface relevance gaps that reduce discoverability for local and service-led demand.',
  },
  {
    title: 'Follow-up weakness',
    detail: 'Spot where leads may be lost between form capture, sales response, and operational handoff.',
  },
  {
    title: 'Tracking coverage',
    detail: 'Review whether core measurement signals exist before deeper attribution and reporting work.',
  },
  {
    title: 'CRM and ops gaps',
    detail: 'Flag early signs of fragmented systems, manual workarounds, or missing workflow clarity.',
  },
  {
    title: 'Next-step recommendations',
    detail: 'Translate diagnostic findings into the most useful next move: intake, audit, or implementation.',
  },
] as const

export const platformShowcasePanels = [
  {
    eyebrow: 'Signal capture',
    title: 'Website and market-facing diagnostics',
    detail:
      'The platform starts with the public website: offer clarity, trust signals, routing, and conversion readiness.',
  },
  {
    eyebrow: 'Operational readout',
    title: 'Lead handling and measurement context',
    detail:
      'It turns scattered public signals into a sharper view of response speed, tracking coverage, and likely process bottlenecks.',
  },
  {
    eyebrow: 'Execution path',
    title: 'From preaudit to deeper audit',
    detail:
      'After the free diagnostic, the platform moves into intake, fuller audit framing, and future execution workstreams.',
  },
] as const

export const showcaseStatTiles = [
  {
    value: '5',
    label: 'Core diagnostic lenses',
  },
  {
    value: '1',
    label: 'Free preaudit entry point',
  },
  {
    value: '3',
    label: 'Workflow stages after landing',
  },
] as const

export const audienceFits = [
  'SMEs',
  'Service businesses',
  'Real estate teams',
  'Clinics',
  'Gyms',
  'Local businesses',
] as const

export const howItWorksSteps = [
  {
    step: '01',
    title: 'Enter your website',
    detail: 'Submit a public URL and the best email to associate the diagnostic with your client record.',
  },
  {
    step: '02',
    title: 'Receive the preaudit',
    detail: 'The existing preaudit workflow runs against the real site and generates report, scores, and draft intake context.',
  },
  {
    step: '03',
    title: 'Review opportunities',
    detail: 'See visible friction, measurement gaps, and quick wins translated into business language.',
  },
  {
    step: '04',
    title: 'Continue to full audit',
    detail: 'Move into a structured client workspace to confirm intake and progress toward the deeper audit.',
  },
] as const

export const preauditChecks = [
  {
    title: 'Search visibility',
    detail: 'Whether the site communicates relevance, clarity, and local demand capture potential.',
  },
  {
    title: 'Conversion friction',
    detail: 'Where the funnel loses momentum through weak calls to action, trust gaps, or unclear next steps.',
  },
  {
    title: 'Tracking coverage',
    detail: 'Whether essential measurement markers appear present before deeper attribution work begins.',
  },
  {
    title: 'Digital presence',
    detail: 'The public-facing signals around positioning, proof, and channel consistency.',
  },
  {
    title: 'Quick wins',
    detail: 'Practical near-term fixes that can improve clarity, lead quality, or follow-up readiness.',
  },
] as const

export const whyItMattersPoints = [
  {
    title: 'Missed leads',
    detail: 'A weak first impression or unclear CTA path can waste expensive traffic and referrals.',
  },
  {
    title: 'Weak visibility',
    detail: 'If the market cannot quickly understand the offer, the business loses qualified attention.',
  },
  {
    title: 'Poor conversion',
    detail: 'Lead capture issues compound when trust, routing, and response expectations are vague.',
  },
  {
    title: 'Blind spots in decisions',
    detail: 'When measurement is partial, channel spend and operational fixes are harder to prioritize.',
  },
] as const

export const trustPositioningPoints = [
  'The preaudit gives a fast read on website clarity, lead capture, and measurement coverage.',
  'If the opportunity is real, we collect missing business context and open the deeper audit.',
  'From there, the work can expand into focused improvement workstreams across marketing, sales, and operations.',
] as const

export const workspaceSectionMeta = {
  dashboard: {
    title: 'Dashboard',
    summary:
      'Command center for stage, next action, active workstreams, and execution readiness.',
  },
  diagnosis: {
    title: 'Diagnosis',
    summary:
      'Unified diagnosis system for preaudit findings, Business Context, and audit conclusions.',
  },
  workstreams: {
    title: 'Workstreams',
    summary:
      'Turn findings into operational tracks with owners, next steps, and likely agent support.',
  },
  agents: {
    title: 'Agents',
    summary:
      'Initial agent architecture for this client across sales, operations, growth, research, and future execution.',
  },
} as const

export type IntakeDraft = {
  businessName: string
  industry: string
  primaryMarket: string
  businessModel: string
  primaryGoal: string
  ninetyDaySuccess: string
  currentPains: string
  mostUrgentPain: string
  systems: string
  sourceOfTruth: string
  leadSources: string
  leadHandling: string
  responseTime: string
  constraints: string
  realisticChangeWindow: string
}

type IntakeField = {
  key: keyof IntakeDraft
  label: string
  placeholder: string
  required?: boolean
  multiline?: boolean
}

export type IntakeSection = {
  id: string
  title: string
  description: string
  fields: IntakeField[]
}

export const workspaceTabs = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '',
  },
  {
    id: 'diagnosis',
    label: 'Diagnosis',
    href: '/diagnosis',
  },
  {
    id: 'workstreams',
    label: 'Workstreams',
    href: '/workstreams',
  },
  {
    id: 'agents',
    label: 'Agents',
    href: '/agents',
  },
] as const

export type WorkspaceSectionId = (typeof workspaceTabs)[number]['id']
export type WorkspaceTabId = WorkspaceSectionId
export const diagnosisPanels = ['overview', 'preaudit', 'intake', 'audit'] as const
export type DiagnosisPanelId = (typeof diagnosisPanels)[number]

export function workspaceHref(clientSlug: string, section: WorkspaceSectionId = 'dashboard') {
  const basePath = `/workspace/${encodeURIComponent(clientSlug)}`
  const tab = workspaceTabs.find((item) => item.id === section)

  return `${basePath}${tab?.href ?? ''}`
}

export function workspaceDiagnosisHref(
  clientSlug: string,
  panel: DiagnosisPanelId = 'overview',
) {
  const basePath = workspaceHref(clientSlug, 'diagnosis')

  return panel === 'overview' ? basePath : `${basePath}?panel=${panel}`
}

export function getWorkspaceSectionMeta(section: WorkspaceSectionId) {
  return workspaceSectionMeta[section]
}

export const preauditSnapshot = {
  summary:
    'The site shows enough surface-level demand capture potential to justify a deeper audit, but the public funnel still leaves lead quality, response speed, and measurement coverage unclear.',
  scores: [
    {
      label: 'Visibility',
      score: 68,
      note: 'Clear offer language, but weak trust proof above the fold.',
    },
    {
      label: 'Conversion',
      score: 54,
      note: 'Calls to action exist, but friction remains around inquiry paths.',
    },
    {
      label: 'Tracking',
      score: 47,
      note: 'Basic tracking appears present, but attribution coverage is partial.',
    },
    {
      label: 'Operational Readiness',
      score: 58,
      note: 'Public signals suggest manual follow-up and limited routing context.',
    },
  ],
  businessImpact: [
    'Leads may be arriving without enough intent capture to qualify them quickly.',
    'Sales and operations teams are likely compensating for weak visibility with manual follow-up.',
    'Attribution blind spots make it harder to justify channel spend or prioritize fixes.',
  ],
  quickWins: [
    'Tighten the homepage CTA path so one primary action is obvious.',
    'Expose stronger proof points near the first conversion moment.',
    'Confirm the tracking stack before moving into a full audit recommendation.',
  ],
  visibleIssues: [
    'Primary CTA competes with secondary navigation',
    'Little evidence of response-time expectations',
    'No obvious handoff between marketing inquiry and sales follow-up',
  ],
  socialChannels: ['Instagram', 'LinkedIn'],
  trackingMarkers: ['GA4', 'Meta Pixel'],
}

export const auditSnapshot = {
  recommendedAgents: ['Sales Agent', 'Operations Agent', 'Collections Agent'],
  priorityOrder: [
    'Clarify lead capture and qualification workflow',
    'Audit response-time bottlenecks and owner handoffs',
    'Validate reporting readiness before specialized execution',
  ],
  mainPains: [
    'Lead routing is likely inconsistent across channels',
    'Manual follow-up probably delays first response',
    'Current measurement setup may not connect spend to closed revenue',
  ],
  nextInputsNeeded: [
    'Confirmed business goal for the next 90 days',
    'Current lead sources and who owns first response',
    'Systems currently used for CRM, booking, or spreadsheets',
    'Constraints around budget, team capacity, and realistic change window',
  ],
}

export const intakeSections: IntakeSection[] = [
  {
    id: 'business-profile',
    title: 'Business Profile',
    description:
      'Autofill only what public evidence can reasonably support, then let the client confirm the rest.',
    fields: [
      {
        key: 'businessName',
        label: 'Business name',
        placeholder: 'Confirm the business name',
        required: true,
      },
      {
        key: 'industry',
        label: 'Industry',
        placeholder: 'Confirm the industry',
        required: true,
      },
      {
        key: 'primaryMarket',
        label: 'Primary location / market',
        placeholder: 'Where does the business primarily sell?',
        required: true,
      },
      {
        key: 'businessModel',
        label: 'Main business model',
        placeholder: 'Lead gen, bookings, direct sales, recurring service, etc.',
        required: true,
      },
    ],
  },
  {
    id: 'goals',
    title: 'Goals',
    description:
      'The audit should optimize for the first business outcome, not a generic checklist.',
    fields: [
      {
        key: 'primaryGoal',
        label: 'What should improve first?',
        placeholder: 'More qualified leads, better conversion, faster response, etc.',
        required: true,
        multiline: true,
      },
      {
        key: 'ninetyDaySuccess',
        label: 'What would success look like in the next 90 days?',
        placeholder: 'Describe a realistic target outcome.',
        multiline: true,
      },
    ],
  },
  {
    id: 'pains',
    title: 'Current Pains',
    description:
      'Internal pain signals are intentionally not invented in preaudit, so this section starts mostly blank.',
    fields: [
      {
        key: 'currentPains',
        label: 'What feels broken or inefficient today?',
        placeholder: 'Website conversion, reporting, follow-up, overload, unclear lead quality, etc.',
        required: true,
        multiline: true,
      },
      {
        key: 'mostUrgentPain',
        label: 'Which issue is most urgent right now?',
        placeholder: 'Name the one problem that would create the most upside if solved.',
        multiline: true,
      },
    ],
  },
  {
    id: 'systems',
    title: 'Systems',
    description:
      'Use business language and capture only the systems that actually affect the audit recommendations.',
    fields: [
      {
        key: 'systems',
        label: 'What tools or systems are in use today?',
        placeholder: 'CRM, booking platform, WhatsApp, spreadsheets, Google Ads, GA4, etc.',
        required: true,
        multiline: true,
      },
      {
        key: 'sourceOfTruth',
        label: 'What is the main source of truth today?',
        placeholder: 'Which system does the team trust most?',
        multiline: true,
      },
    ],
  },
  {
    id: 'lead-process',
    title: 'Lead Process',
    description:
      'This section clarifies whether the audit should bias toward sales fixes or operational fixes first.',
    fields: [
      {
        key: 'leadSources',
        label: 'Where do leads or inquiries come from today?',
        placeholder: 'Organic, paid ads, referrals, WhatsApp, forms, phone, marketplaces, etc.',
        required: true,
        multiline: true,
      },
      {
        key: 'leadHandling',
        label: 'How are leads handled today?',
        placeholder: 'Who replies first, how follow-up works, and whether there is a clear process.',
        required: true,
        multiline: true,
      },
      {
        key: 'responseTime',
        label: 'Approximate response time',
        placeholder: 'Minutes, hours, same day, next day, unknown, etc.',
      },
    ],
  },
  {
    id: 'constraints',
    title: 'Constraints',
    description:
      'Recommendations should be realistic for the next 30 to 60 days, not idealized.',
    fields: [
      {
        key: 'constraints',
        label: 'What constraints should the audit consider?',
        placeholder: 'Budget, small team, no CRM, low confidence in data, dependence on one person, etc.',
        required: true,
        multiline: true,
      },
      {
        key: 'realisticChangeWindow',
        label: 'What can realistically change next?',
        placeholder: 'Describe what is possible in the next 30 to 60 days.',
        multiline: true,
      },
    ],
  },
]

function getHost(rawWebsite: string) {
  const normalized = normalizeWebsite(rawWebsite)

  try {
    return new URL(normalized).hostname.replace(/^www\./, '')
  } catch {
    return new URL(DEFAULT_WEBSITE).hostname.replace(/^www\./, '')
  }
}

function toBusinessName(host: string) {
  return host
    .split('.')[0]
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function normalizeWebsite(rawWebsite?: string) {
  const trimmed = rawWebsite?.trim()

  if (!trimmed) {
    return DEFAULT_WEBSITE
  }

  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  try {
    return new URL(candidate).toString()
  } catch {
    return DEFAULT_WEBSITE
  }
}

export function formatClientName(value: string) {
  return value
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function buildIntakeDraft(rawWebsite?: string): IntakeDraft {
  const website = normalizeWebsite(rawWebsite)
  const host = getHost(website)
  const businessName = toBusinessName(host)

  return {
    businessName,
    industry: 'Industry guess from public site signals',
    primaryMarket: '',
    businessModel: '',
    primaryGoal: '',
    ninetyDaySuccess: '',
    currentPains: '',
    mostUrgentPain: '',
    systems: '',
    sourceOfTruth: '',
    leadSources: '',
    leadHandling: '',
    responseTime: '',
    constraints: '',
    realisticChangeWindow: '',
  }
}
