import type { IntakeDraft } from './product-shell'

export type AuditIntakeFile = {
  company_profile?: {
    name?: string
    industry?: string
    business_model?: string
    location?: string
  }
  business_goals?: string[]
  known_pains?: string[]
  available_assets?: string[]
  available_systems?: string[]
  sales_notes?: string
  operations_notes?: string
  notes?: string
  _autofilled_from_preaudit?: {
    website?: string
    tracking_markers?: {
      ga4_detected?: boolean
      gtm_detected?: boolean
      meta_pixel_detected?: boolean
      linkedin_insight_detected?: boolean
      other_markers?: string[]
    }
  }
  _todo?: string[]
  _web_ui?: Partial<IntakeDraft>
}

function parseList(value: string) {
  return value
    .split(/\n|,|;/g)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry, index, list) => list.indexOf(entry) === index)
}

function joinList(values: string[] | undefined) {
  return (values ?? []).join('\n')
}

function compactLines(values: Array<string | undefined>) {
  return values.map((value) => value?.trim() ?? '').filter(Boolean)
}

export function formFromIntake(record: AuditIntakeFile): IntakeDraft {
  const ui = record._web_ui ?? {}

  return {
    businessName: ui.businessName ?? record.company_profile?.name ?? '',
    industry: ui.industry ?? record.company_profile?.industry ?? '',
    primaryMarket: ui.primaryMarket ?? record.company_profile?.location ?? '',
    businessModel: ui.businessModel ?? record.company_profile?.business_model ?? '',
    primaryGoal: ui.primaryGoal ?? record.business_goals?.[0] ?? '',
    ninetyDaySuccess:
      ui.ninetyDaySuccess ?? record.business_goals?.slice(1).join('\n') ?? '',
    currentPains: ui.currentPains ?? joinList(record.known_pains),
    mostUrgentPain: ui.mostUrgentPain ?? record.known_pains?.[0] ?? '',
    systems: ui.systems ?? joinList(record.available_systems),
    sourceOfTruth: ui.sourceOfTruth ?? '',
    leadSources: ui.leadSources ?? '',
    leadHandling: ui.leadHandling ?? record.sales_notes ?? '',
    responseTime: ui.responseTime ?? '',
    constraints: ui.constraints ?? record.operations_notes ?? '',
    realisticChangeWindow: ui.realisticChangeWindow ?? '',
  }
}

export function intakeFromForm(
  form: IntakeDraft,
  draft: AuditIntakeFile | undefined,
  existing: AuditIntakeFile | undefined,
): AuditIntakeFile {
  const base = existing ?? draft ?? {}

  return {
    ...draft,
    ...existing,
    company_profile: {
      ...(draft?.company_profile ?? {}),
      ...(existing?.company_profile ?? {}),
      name: form.businessName.trim(),
      industry: form.industry.trim(),
      business_model: form.businessModel.trim(),
      location: form.primaryMarket.trim(),
    },
    business_goals: parseList(
      compactLines([form.primaryGoal, form.ninetyDaySuccess]).join('\n'),
    ),
    known_pains: parseList(
      compactLines([form.mostUrgentPain, form.currentPains]).join('\n'),
    ),
    available_assets: existing?.available_assets ?? draft?.available_assets ?? [],
    available_systems: parseList(form.systems),
    sales_notes: compactLines([
      form.leadSources ? `Lead sources: ${form.leadSources}` : undefined,
      form.leadHandling ? `Lead handling: ${form.leadHandling}` : undefined,
      form.responseTime ? `Response time: ${form.responseTime}` : undefined,
    ]).join('\n'),
    operations_notes: compactLines([
      form.constraints ? `Constraints: ${form.constraints}` : undefined,
      form.realisticChangeWindow
        ? `Change window: ${form.realisticChangeWindow}`
        : undefined,
    ]).join('\n'),
    notes: existing?.notes ?? draft?.notes ?? '',
    _autofilled_from_preaudit:
      existing?._autofilled_from_preaudit ?? draft?._autofilled_from_preaudit,
    _todo: existing?._todo ?? draft?._todo ?? [],
    _web_ui: {
      ...form,
    },
  }
}

function readFormField(formData: FormData, key: keyof IntakeDraft) {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

export function parseIntakeForm(formData: FormData): IntakeDraft {
  return {
    businessName: readFormField(formData, 'businessName'),
    industry: readFormField(formData, 'industry'),
    primaryMarket: readFormField(formData, 'primaryMarket'),
    businessModel: readFormField(formData, 'businessModel'),
    primaryGoal: readFormField(formData, 'primaryGoal'),
    ninetyDaySuccess: readFormField(formData, 'ninetyDaySuccess'),
    currentPains: readFormField(formData, 'currentPains'),
    mostUrgentPain: readFormField(formData, 'mostUrgentPain'),
    systems: readFormField(formData, 'systems'),
    sourceOfTruth: readFormField(formData, 'sourceOfTruth'),
    leadSources: readFormField(formData, 'leadSources'),
    leadHandling: readFormField(formData, 'leadHandling'),
    responseTime: readFormField(formData, 'responseTime'),
    constraints: readFormField(formData, 'constraints'),
    realisticChangeWindow: readFormField(formData, 'realisticChangeWindow'),
  }
}
