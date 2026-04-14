export const DEFAULT_WEBSITE = 'https://www.harborview-demo.com'

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

export const flowStages = [
  {
    id: 'preaudit-live',
    label: 'New Preaudit',
    path: '/',
    detail: 'Capture a public website URL and start the workflow.',
  },
  {
    id: 'preaudit-report',
    label: 'Preaudit Result',
    path: '/preaudit-result',
    detail: 'Translate public-site signals into a business-facing report.',
  },
  {
    id: 'audit-intake',
    label: 'Audit Intake',
    path: '/audit-intake',
    detail: 'Confirm only the missing business context the audit needs.',
  },
  {
    id: 'audit-live',
    label: 'Audit Result',
    path: '/audit-result',
    detail: 'Prepare the richer diagnostic that will later feed the orchestrator.',
  },
] as const

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
